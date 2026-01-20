

export type OutputFormat = 'png' | 'svg';

export interface GeneratePosterRequest {
  city: string;
  country: string;
  theme: string;
  distance: number;
  format: OutputFormat;
}

export interface FontPaths {
  bold: string;
  regular: string;
  light: string;
}