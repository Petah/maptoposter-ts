export interface Theme {
  name: string;
  description?: string;
  bg: string;
  text: string;
  gradient_color: string;
  water: string;
  parks: string;
  road_motorway: string;
  road_primary: string;
  road_secondary: string;
  road_tertiary: string;
  road_residential: string;
  road_default: string;
}

export interface Coordinates {
  lat: number;
  lon: number;
}

export interface GeocodingResult {
  address: string;
  coordinates: Coordinates;
}

export interface OSMNode {
  id: number;
  lat: number;
  lon: number;
}

export interface OSMWay {
  id: number;
  nodes: number[];
  tags: Record<string, string>;
}

export interface OSMRelation {
  id: number;
  members: Array<{
    type: 'node' | 'way' | 'relation';
    ref: number;
    role: string;
  }>;
  tags: Record<string, string>;
}

export interface OSMData {
  nodes: Map<number, OSMNode>;
  ways: OSMWay[];
  relations: OSMRelation[];
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
  bounds: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  };
}

export interface PosterOptions {
  city: string;
  country: string;
  theme: string;
  distance: number;
  output?: string;
}

export interface FontPaths {
  bold: string;
  regular: string;
  light: string;
}

export type OutputFormat = 'png' | 'svg';
