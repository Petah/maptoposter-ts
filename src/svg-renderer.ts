import { MapBounds, MapData } from '@/api/osm';
import { Theme } from '@/theme';
import { Coordinates } from '@/api/geocoding';
import { Config } from './config';
import { hexToRgb } from './util/color';

export function projectPoint(
    lon: number,
    lat: number,
    bounds: MapBounds,
    width: number,
    height: number
): { x: number; y: number } {
    const x = ((lon - bounds.minLon) / (bounds.maxLon - bounds.minLon)) * width;
    const y = height - ((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * height;
    return { x, y };
}

function escapeXml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function polygonToPath(config: Config, points: Array<{ x: number; y: number }>, bounds: MapBounds): string {
    if (points.length < 3) return '';

    const projected = points.map((p) => projectPoint(p.x, p.y, bounds, config.width, config.height));
    const first = projected[0];
    let d = `M ${first.x.toFixed(2)} ${first.y.toFixed(2)}`;

    for (let i = 1; i < projected.length; i++) {
        d += ` L ${projected[i].x.toFixed(2)} ${projected[i].y.toFixed(2)}`;
    }

    d += ' Z';
    return d;
}

function roadToPath(config: Config, points: Array<{ x: number; y: number }>, bounds: MapBounds): string {
    if (points.length < 2) return '';

    const projected = points.map((p) => projectPoint(p.x, p.y, bounds, config.width, config.height));
    const first = projected[0];
    let d = `M ${first.x.toFixed(2)} ${first.y.toFixed(2)}`;

    for (let i = 1; i < projected.length; i++) {
        d += ` L ${projected[i].x.toFixed(2)} ${projected[i].y.toFixed(2)}`;
    }

    return d;
}

export function renderPosterSvg(
    config: Config,
    mapData: MapData,
    theme: Theme,
    city: string,
    country: string,
    coordinates: Coordinates
): string {
    const fadeHeight = config.height * 0.25;
    const rgb = hexToRgb(theme.gradient_color);

    const spacedCity = city.toUpperCase().split('').join('  ');
    const lat = coordinates.lat;
    const lon = coordinates.lon;
    const coordsText = `${Math.abs(lat).toFixed(4)} ${lat >= 0 ? 'N' : 'S'} / ${Math.abs(lon).toFixed(4)} ${lon >= 0 ? 'E' : 'W'}`;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${config.width} ${config.height}" width="${config.width}" height="${config.height}">
        <defs>
            <linearGradient id="fadeTop" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="rgb(${rgb.r},${rgb.g},${rgb.b})" stop-opacity="1"/>
                <stop offset="100%" stop-color="rgb(${rgb.r},${rgb.g},${rgb.b})" stop-opacity="0"/>
                </linearGradient>
                <linearGradient id="fadeBottom" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="rgb(${rgb.r},${rgb.g},${rgb.b})" stop-opacity="0"/>
                <stop offset="100%" stop-color="rgb(${rgb.r},${rgb.g},${rgb.b})" stop-opacity="1"/>
            </linearGradient>
        </defs>
    `;

    // Background
    svg += `  <rect fill="${theme.bg}" width="${config.width}" height="${config.height}"/>\n`;

    // Water polygons
    for (const polygon of mapData.water) {
        const d = polygonToPath(config, polygon.points, mapData.bounds);
        if (d) {
            svg += `  <path fill="${theme.water}" d="${d}"/>\n`;
        }
    }

    // Park polygons
    for (const polygon of mapData.parks) {
        const d = polygonToPath(config, polygon.points, mapData.bounds);
        if (d) {
            svg += `  <path fill="${theme.parks}" d="${d}"/>\n`;
        }
    }

    // Roads
    for (const road of mapData.roads) {
        const d = roadToPath(config, road.points, mapData.bounds);
        if (d) {
            svg += `  <path fill="none" stroke="${road.color}" stroke-width="${road.width * 3}" stroke-linecap="round" stroke-linejoin="round" d="${d}"/>\n`;
        }
    }

    // Top gradient fade
    svg += `  <rect fill="url(#fadeTop)" x="0" y="0" width="${config.width}" height="${fadeHeight}"/>\n`;

    // Bottom gradient fade
    svg += `  <rect fill="url(#fadeBottom)" x="0" y="${config.height - fadeHeight}" width="${config.width}" height="${fadeHeight}"/>\n`;

    // Text elements
    const fontFamily = 'system-ui, -apple-system, sans-serif';

    // City name
    svg += `  <text x="${config.width / 2}" y="${config.height * 0.86}" fill="${theme.text}" font-family="${fontFamily}" font-size="180" font-weight="bold" text-anchor="middle" dominant-baseline="middle">${escapeXml(spacedCity)}</text>\n`;

    // Country
    svg += `  <text x="${config.width / 2}" y="${config.height * 0.90}" fill="${theme.text}" font-family="${fontFamily}" font-size="66" font-weight="300" text-anchor="middle" dominant-baseline="middle">${escapeXml(country.toUpperCase())}</text>\n`;

    // Coordinates
    svg += `  <text x="${config.width / 2}" y="${config.height * 0.93}" fill="${theme.text}" fill-opacity="0.7" font-family="${fontFamily}" font-size="42" text-anchor="middle" dominant-baseline="middle">${escapeXml(coordsText)}</text>\n`;

    // Decorative line
    svg += `  <line x1="${config.width * 0.4}" y1="${config.height * 0.875}" x2="${config.width * 0.6}" y2="${config.height * 0.875}" stroke="${theme.text}" stroke-width="3"/>\n`;

    // Attribution
    svg += `  <text x="${config.width * 0.98}" y="${config.height * 0.98}" fill="${theme.text}" fill-opacity="0.5" font-family="${fontFamily}" font-size="24" font-weight="300" text-anchor="end" dominant-baseline="middle">OpenStreetMap contributors</text>\n`;

    svg += '</svg>\n';

    return svg;
}
