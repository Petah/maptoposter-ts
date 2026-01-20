import { cache } from '@/util/cache';
import { Config } from '@/config';
import { metersToDegreesLat, metersToDegreesLon } from '@/util/distance';
import { apiPost } from '@/util/api';
import { logDebug } from '@/util/logger';
import { Coordinates } from './geocoding';
import { Theme } from '@/theme';

export async function fetchMapData(
    config: Config,
    center: Coordinates,
    distanceMeters: number,
    theme: Theme,
): Promise<MapData> {
    const rawData = await fetchRawOsmData(config, center, distanceMeters);
    return rawDataToMapData(rawData, theme);
}

export interface RawRoad {
  geometry: Array<{ lat: number; lon: number }>;
  highway: string;
}

export interface RawPolygon {
  geometry: Array<{ lat: number; lon: number }>;
}

export interface RawOsmData {
  roads: RawRoad[];
  water: RawPolygon[];
  parks: RawPolygon[];
  bounds: MapBounds;
}

export interface MapBounds {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

export interface RoadSegment {
  points: Array<{ x: number; y: number }>;
  highway: string;
  color: string;
  width: number;
}

export interface Polygon {
  points: Array<{ x: number; y: number }>;
  type: 'water' | 'park';
}

export interface MapData {
  roads: RoadSegment[];
  water: Polygon[];
  parks: Polygon[];
  bounds: MapBounds;
}

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

export function getBbox(center: Coordinates, distanceMeters: number): [number, number, number, number] {
    const latDelta = metersToDegreesLat(distanceMeters);
    const lonDelta = metersToDegreesLon(distanceMeters, center.lat);

    return [
        center.lat - latDelta,
        center.lon - lonDelta,
        center.lat + latDelta,
        center.lon + lonDelta,
    ];
}

export function getRoadColor(highway: string, theme: Theme): string {
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

export function getRoadWidth(highway: string): number {
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

export function applyThemeToRoads(rawRoads: RawRoad[], theme: Theme): RoadSegment[] {
    return rawRoads.map((road) => ({
        points: road.geometry.map((p) => ({ x: p.lon, y: p.lat })),
        highway: road.highway,
        color: getRoadColor(road.highway, theme),
        width: getRoadWidth(road.highway),
    }));
}

export function convertRawPolygons(rawPolygons: RawPolygon[], type: 'water' | 'park'): Polygon[] {
    return rawPolygons.map((poly) => ({
        points: poly.geometry.map((p) => ({ x: p.lon, y: p.lat })),
        type,
    }));
}

export function rawDataToMapData(raw: RawOsmData, theme: Theme): MapData {
    return {
        roads: applyThemeToRoads(raw.roads, theme),
        water: convertRawPolygons(raw.water, 'water'),
        parks: convertRawPolygons(raw.parks, 'park'),
        bounds: raw.bounds,
    };
}

export async function fetchRawOsmData(
    config: Config,
    center: Coordinates,
    distanceMeters: number,
): Promise<RawOsmData> {
    const bbox = getBbox(center, distanceMeters);
    const bboxStr = bbox.join(',');

    const roads: RawRoad[] = [];
    const water: RawPolygon[] = [];
    const parks: RawPolygon[] = [];

    logDebug('Downloading street network...');
    const roadsQuery = `
        [out:json][timeout:90];
        (
            way["highway"](${bboxStr});
        );
        out geom;
    `;

    const roadsData = await cache(config, ['roads', center.lat.toFixed(4), center.lon.toFixed(4), distanceMeters], () => apiPost<OverpassResponse>(config, config.overpassUrl, `data=${encodeURIComponent(roadsQuery)}`));

    for (const element of roadsData.elements) {
        if (element.type === 'way' && element.geometry && element.tags?.highway) {
            roads.push({
                geometry: element.geometry,
                highway: element.tags.highway,
            });
        }
    }

    logDebug('Downloading water features...');
    const waterQuery = `
        [out:json][timeout:90];
        (
            way["natural"="water"](${bboxStr});
            way["waterway"="riverbank"](${bboxStr});
            relation["natural"="water"](${bboxStr});
        );
        out geom;
    `;

    const waterData = await cache(config, ['water', center.lat.toFixed(4), center.lon.toFixed(4), distanceMeters], () => apiPost<OverpassResponse>(config, config.overpassUrl, `data=${encodeURIComponent(waterQuery)}`));

    for (const element of waterData.elements) {
        if (element.geometry) {
            water.push({ geometry: element.geometry });
        } else if (element.members) {
            for (const member of element.members) {
                if (member.geometry) {
                    water.push({ geometry: member.geometry });
                }
            }
        }
    }

    logDebug('Downloading parks...');
    const parksQuery = `
        [out:json][timeout:90];
        (
            way["leisure"="park"](${bboxStr});
            way["landuse"="grass"](${bboxStr});
            relation["leisure"="park"](${bboxStr});
        );
        out geom;
    `;

    const parksData = await cache(config, ['parks', center.lat.toFixed(4), center.lon.toFixed(4), distanceMeters], () => apiPost<OverpassResponse>(config, config.overpassUrl, `data=${encodeURIComponent(parksQuery)}`));

    for (const element of parksData.elements) {
        if (element.geometry) {
            parks.push({ geometry: element.geometry });
        } else if (element.members) {
            for (const member of element.members) {
                if (member.geometry) {
                    parks.push({ geometry: member.geometry });
                }
            }
        }
    }

    const bounds: MapBounds = {
        minLat: bbox[0],
        maxLat: bbox[2],
        minLon: bbox[1],
        maxLon: bbox[3],
    };

    return { roads, water, parks, bounds };
}
