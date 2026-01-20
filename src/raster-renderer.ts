import { createCanvas, registerFont, CanvasRenderingContext2D } from 'canvas';
import { MapData } from './api/osm';
import { Theme } from './theme';
import { Coordinates } from './api/geocoding';
import { hexToRgb } from './util/color';
import { Config } from './config';
import { projectPoint } from './svg-renderer';
import { join } from 'path';

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

interface FontPaths {
  bold: string;
  regular: string;
  light: string;
}

function loadFonts(config: Config): FontPaths | null {
    const fonts: FontPaths = {
        bold: join(config.fontsDir, 'Roboto-Bold.ttf'),
        regular: join(config.fontsDir, 'Roboto-Regular.ttf'),
        light: join(config.fontsDir, 'Roboto-Light.ttf'),
    };

    registerFont(fonts.bold, { family: 'Roboto', weight: 'bold' });
    registerFont(fonts.regular, { family: 'Roboto', weight: 'normal' });
    registerFont(fonts.light, { family: 'Roboto', weight: '300' });

    return fonts;
}

export function renderPosterRaster(
    config: Config,
    mapData: MapData,
    theme: Theme,
    city: string,
    country: string,
    coordinates: Coordinates,
): Buffer {
    const canvas = createCanvas(config.width, config.height);
    const ctx = canvas.getContext('2d');

    const fonts = loadFonts(config);

    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, config.width, config.height);

    ctx.fillStyle = theme.water;
    for (const polygon of mapData.water) {
        if (polygon.points.length < 3) continue;

        ctx.beginPath();
        const first = projectPoint(polygon.points[0].x, polygon.points[0].y, mapData.bounds, config.width, config.height);
        ctx.moveTo(first.x, first.y);

        for (let i = 1; i < polygon.points.length; i++) {
            const pt = projectPoint(polygon.points[i].x, polygon.points[i].y, mapData.bounds, config.width, config.height);
            ctx.lineTo(pt.x, pt.y);
        }

        ctx.closePath();
        ctx.fill();
    }

    ctx.fillStyle = theme.parks;
    for (const polygon of mapData.parks) {
        if (polygon.points.length < 3) continue;

        ctx.beginPath();
        const first = projectPoint(polygon.points[0].x, polygon.points[0].y, mapData.bounds, config.width, config.height);
        ctx.moveTo(first.x, first.y);

        for (let i = 1; i < polygon.points.length; i++) {
            const pt = projectPoint(polygon.points[i].x, polygon.points[i].y, mapData.bounds, config.width, config.height);
            ctx.lineTo(pt.x, pt.y);
        }

        ctx.closePath();
        ctx.fill();
    }

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const road of mapData.roads) {
        if (road.points.length < 2) continue;

        ctx.strokeStyle = road.color;
        ctx.lineWidth = road.width * 3;

        ctx.beginPath();
        const first = projectPoint(road.points[0].x, road.points[0].y, mapData.bounds, config.width, config.height);
        ctx.moveTo(first.x, first.y);

        for (let i = 1; i < road.points.length; i++) {
            const pt = projectPoint(road.points[i].x, road.points[i].y, mapData.bounds, config.width, config.height);
            ctx.lineTo(pt.x, pt.y);
        }

        ctx.stroke();
    }

    createGradientFade(ctx, config.width, config.height, theme.gradient_color, 'top');
    createGradientFade(ctx, config.width, config.height, theme.gradient_color, 'bottom');

    const spacedCity = city.toUpperCase().split('').join('  ');

    ctx.fillStyle = theme.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (fonts) {
        ctx.font = 'bold 180px Roboto';
    } else {
        ctx.font = 'bold 180px sans-serif';
    }
    ctx.fillText(spacedCity, config.width / 2, config.height * 0.86);

    if (fonts) {
        ctx.font = '300 66px Roboto';
    } else {
        ctx.font = '66px sans-serif';
    }
    ctx.fillText(country.toUpperCase(), config.width / 2, config.height * 0.90);

    const lat = coordinates.lat;
    const lon = coordinates.lon;
    const coordsText = `${Math.abs(lat).toFixed(4)} ${lat >= 0 ? 'N' : 'S'} / ${Math.abs(lon).toFixed(4)} ${lon >= 0 ? 'E' : 'W'}`;

    if (fonts) {
        ctx.font = 'normal 42px Roboto';
    } else {
        ctx.font = '42px sans-serif';
    }
    ctx.globalAlpha = 0.7;
    ctx.fillText(coordsText, config.width / 2, config.height * 0.93);
    ctx.globalAlpha = 1;

    ctx.strokeStyle = theme.text;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(config.width * 0.4, config.height * 0.875);
    ctx.lineTo(config.width * 0.6, config.height * 0.875);
    ctx.stroke();

    if (fonts) {
        ctx.font = '300 24px Roboto';
    } else {
        ctx.font = '24px sans-serif';
    }
    ctx.textAlign = 'right';
    ctx.globalAlpha = 0.5;
    ctx.fillText('OpenStreetMap contributors', config.width * 0.98, config.height * 0.98);
    ctx.globalAlpha = 1;

    return canvas.toBuffer('image/png');
}
