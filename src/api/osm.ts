import { Coordinates, MapData, RoadSegment, Polygon, Theme } from '@/types';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  nodes?: number[];
  tags?: Record<string, string>;
  members?: Array<{
    type: 'node' | 'way' | 'relation';
    ref: number;
    role: string;
    geometry?: Array<{ lat: number; lon: number }>;
  }>;
  geometry?: Array<{ lat: number; lon: number }>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

function metersToDegreesLat(meters: number): number {
  return meters / 111320;
}

function metersToDegreesLon(meters: number, lat: number): number {
  return meters / (111320 * Math.cos((lat * Math.PI) / 180));
}

function getBbox(center: Coordinates, distanceMeters: number): [number, number, number, number] {
  const latDelta = metersToDegreesLat(distanceMeters);
  const lonDelta = metersToDegreesLon(distanceMeters, center.lat);

  return [
    center.lat - latDelta,
    center.lon - lonDelta,
    center.lat + latDelta,
    center.lon + lonDelta,
  ];
}

async function queryOverpass(query: string): Promise<OverpassResponse> {
  const response = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!response.ok) {
    throw new Error(`Overpass API request failed: ${response.statusText}`);
  }

  return (await response.json()) as OverpassResponse;
}

function getRoadColor(highway: string, theme: Theme): string {
  if (['motorway', 'motorway_link'].includes(highway)) {
    return theme.road_motorway;
  }
  if (['trunk', 'trunk_link', 'primary', 'primary_link'].includes(highway)) {
    return theme.road_primary;
  }
  if (['secondary', 'secondary_link'].includes(highway)) {
    return theme.road_secondary;
  }
  if (['tertiary', 'tertiary_link'].includes(highway)) {
    return theme.road_tertiary;
  }
  if (['residential', 'living_street', 'unclassified'].includes(highway)) {
    return theme.road_residential;
  }
  return theme.road_default;
}

function getRoadWidth(highway: string): number {
  if (['motorway', 'motorway_link'].includes(highway)) {
    return 1.2;
  }
  if (['trunk', 'trunk_link', 'primary', 'primary_link'].includes(highway)) {
    return 1.0;
  }
  if (['secondary', 'secondary_link'].includes(highway)) {
    return 0.8;
  }
  if (['tertiary', 'tertiary_link'].includes(highway)) {
    return 0.6;
  }
  return 0.4;
}

export async function fetchMapData(
  center: Coordinates,
  distanceMeters: number,
  theme: Theme,
  onProgress?: (step: string) => void
): Promise<MapData> {
  const bbox = getBbox(center, distanceMeters);
  const bboxStr = bbox.join(',');

  const roads: RoadSegment[] = [];
  const water: Polygon[] = [];
  const parks: Polygon[] = [];

  onProgress?.('Downloading street network');
  const roadsQuery = `
    [out:json][timeout:90];
    (
      way["highway"](${bboxStr});
    );
    out geom;
  `;

  const roadsData = await queryOverpass(roadsQuery);

  for (const element of roadsData.elements) {
    if (element.type === 'way' && element.geometry && element.tags?.highway) {
      const highway = element.tags.highway;
      const points = element.geometry.map((p) => ({ x: p.lon, y: p.lat }));

      roads.push({
        points,
        highway,
        color: getRoadColor(highway, theme),
        width: getRoadWidth(highway),
      });
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 500));

  onProgress?.('Downloading water features');
  const waterQuery = `
    [out:json][timeout:90];
    (
      way["natural"="water"](${bboxStr});
      way["waterway"="riverbank"](${bboxStr});
      relation["natural"="water"](${bboxStr});
    );
    out geom;
  `;

  try {
    const waterData = await queryOverpass(waterQuery);

    for (const element of waterData.elements) {
      if (element.geometry) {
        const points = element.geometry.map((p) => ({ x: p.lon, y: p.lat }));
        water.push({ points, type: 'water' });
      } else if (element.members) {
        for (const member of element.members) {
          if (member.geometry) {
            const points = member.geometry.map((p) => ({ x: p.lon, y: p.lat }));
            water.push({ points, type: 'water' });
          }
        }
      }
    }
  } catch {
    // Water features are optional
  }

  await new Promise((resolve) => setTimeout(resolve, 300));

  onProgress?.('Downloading parks/green spaces');
  const parksQuery = `
    [out:json][timeout:90];
    (
      way["leisure"="park"](${bboxStr});
      way["landuse"="grass"](${bboxStr});
      relation["leisure"="park"](${bboxStr});
    );
    out geom;
  `;

  try {
    const parksData = await queryOverpass(parksQuery);

    for (const element of parksData.elements) {
      if (element.geometry) {
        const points = element.geometry.map((p) => ({ x: p.lon, y: p.lat }));
        parks.push({ points, type: 'park' });
      } else if (element.members) {
        for (const member of element.members) {
          if (member.geometry) {
            const points = member.geometry.map((p) => ({ x: p.lon, y: p.lat }));
            parks.push({ points, type: 'park' });
          }
        }
      }
    }
  } catch {
    // Parks are optional
  }

  return {
    roads,
    water,
    parks,
    bounds: {
      minLat: bbox[0],
      maxLat: bbox[2],
      minLon: bbox[1],
      maxLon: bbox[3],
    },
  };
}
