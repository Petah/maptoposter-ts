import { createCanvas, registerFont, CanvasRenderingContext2D } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';
import { MapData, Theme, Coordinates, FontPaths } from './types';

const WIDTH = 3600; // 12 inches at 300 DPI
const HEIGHT = 4800; // 16 inches at 300 DPI

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

function projectPoint(
  lon: number,
  lat: number,
  bounds: MapData['bounds'],
  width: number,
  height: number
): { x: number; y: number } {
  const x = ((lon - bounds.minLon) / (bounds.maxLon - bounds.minLon)) * width;
  // Flip Y axis since canvas Y increases downward
  const y = height - ((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * height;
  return { x, y };
}

function createGradientFade(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  color: string,
  location: 'top' | 'bottom'
): void {
  const rgb = hexToRgb(color);
  const fadeHeight = height * 0.25;

  let gradient: ReturnType<CanvasRenderingContext2D['createLinearGradient']>;
  let yStart: number;
  let yEnd: number;

  if (location === 'bottom') {
    yStart = height - fadeHeight;
    yEnd = height;
    gradient = ctx.createLinearGradient(0, yStart, 0, yEnd);
    gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
    gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`);
  } else {
    yStart = 0;
    yEnd = fadeHeight;
    gradient = ctx.createLinearGradient(0, yStart, 0, yEnd);
    gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`);
    gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
  }

  ctx.fillStyle = gradient;
  ctx.fillRect(0, yStart, width, fadeHeight);
}

function loadFonts(fontsDir: string): FontPaths | null {
  const fonts: FontPaths = {
    bold: path.join(fontsDir, 'Roboto-Bold.ttf'),
    regular: path.join(fontsDir, 'Roboto-Regular.ttf'),
    light: path.join(fontsDir, 'Roboto-Light.ttf'),
  };

  for (const [weight, fontPath] of Object.entries(fonts)) {
    if (!fs.existsSync(fontPath)) {
      console.log(`Warning: Font not found: ${fontPath}`);
      return null;
    }
  }

  // Register fonts with canvas
  registerFont(fonts.bold, { family: 'Roboto', weight: 'bold' });
  registerFont(fonts.regular, { family: 'Roboto', weight: 'normal' });
  registerFont(fonts.light, { family: 'Roboto', weight: '300' });

  return fonts;
}

export function renderPoster(
  mapData: MapData,
  theme: Theme,
  city: string,
  country: string,
  coordinates: Coordinates,
  outputPath: string,
  fontsDir: string
): void {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  // Load fonts
  const fonts = loadFonts(fontsDir);
  const fontFamily = fonts ? 'Roboto' : 'sans-serif';

  // Fill background
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Draw water
  ctx.fillStyle = theme.water;
  for (const polygon of mapData.water) {
    if (polygon.points.length < 3) continue;

    ctx.beginPath();
    const first = projectPoint(polygon.points[0].x, polygon.points[0].y, mapData.bounds, WIDTH, HEIGHT);
    ctx.moveTo(first.x, first.y);

    for (let i = 1; i < polygon.points.length; i++) {
      const pt = projectPoint(polygon.points[i].x, polygon.points[i].y, mapData.bounds, WIDTH, HEIGHT);
      ctx.lineTo(pt.x, pt.y);
    }

    ctx.closePath();
    ctx.fill();
  }

  // Draw parks
  ctx.fillStyle = theme.parks;
  for (const polygon of mapData.parks) {
    if (polygon.points.length < 3) continue;

    ctx.beginPath();
    const first = projectPoint(polygon.points[0].x, polygon.points[0].y, mapData.bounds, WIDTH, HEIGHT);
    ctx.moveTo(first.x, first.y);

    for (let i = 1; i < polygon.points.length; i++) {
      const pt = projectPoint(polygon.points[i].x, polygon.points[i].y, mapData.bounds, WIDTH, HEIGHT);
      ctx.lineTo(pt.x, pt.y);
    }

    ctx.closePath();
    ctx.fill();
  }

  // Draw roads
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const road of mapData.roads) {
    if (road.points.length < 2) continue;

    ctx.strokeStyle = road.color;
    ctx.lineWidth = road.width * 3; // Scale up for high DPI

    ctx.beginPath();
    const first = projectPoint(road.points[0].x, road.points[0].y, mapData.bounds, WIDTH, HEIGHT);
    ctx.moveTo(first.x, first.y);

    for (let i = 1; i < road.points.length; i++) {
      const pt = projectPoint(road.points[i].x, road.points[i].y, mapData.bounds, WIDTH, HEIGHT);
      ctx.lineTo(pt.x, pt.y);
    }

    ctx.stroke();
  }

  // Draw gradients
  createGradientFade(ctx, WIDTH, HEIGHT, theme.gradient_color, 'top');
  createGradientFade(ctx, WIDTH, HEIGHT, theme.gradient_color, 'bottom');

  // Draw typography
  const spacedCity = city.toUpperCase().split('').join('  ');

  // Main city name
  ctx.fillStyle = theme.text;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (fonts) {
    ctx.font = 'bold 180px Roboto';
  } else {
    ctx.font = 'bold 180px sans-serif';
  }
  ctx.fillText(spacedCity, WIDTH / 2, HEIGHT * 0.86);

  // Country
  if (fonts) {
    ctx.font = '300 66px Roboto';
  } else {
    ctx.font = '66px sans-serif';
  }
  ctx.fillText(country.toUpperCase(), WIDTH / 2, HEIGHT * 0.90);

  // Coordinates
  const lat = coordinates.lat;
  const lon = coordinates.lon;
  let coordsText = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'} / ${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? 'E' : 'W'}`;

  if (fonts) {
    ctx.font = 'normal 42px Roboto';
  } else {
    ctx.font = '42px sans-serif';
  }
  ctx.globalAlpha = 0.7;
  ctx.fillText(coordsText, WIDTH / 2, HEIGHT * 0.93);
  ctx.globalAlpha = 1;

  // Divider line
  ctx.strokeStyle = theme.text;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(WIDTH * 0.4, HEIGHT * 0.875);
  ctx.lineTo(WIDTH * 0.6, HEIGHT * 0.875);
  ctx.stroke();

  // Attribution
  if (fonts) {
    ctx.font = '300 24px Roboto';
  } else {
    ctx.font = '24px sans-serif';
  }
  ctx.textAlign = 'right';
  ctx.globalAlpha = 0.5;
  ctx.fillText('© OpenStreetMap contributors', WIDTH * 0.98, HEIGHT * 0.98);
  ctx.globalAlpha = 1;

  // Save to file
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
}
