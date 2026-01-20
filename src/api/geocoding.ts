import { apiGet } from '@/util/api';
import { cache } from '@/util/cache';
import { Config } from '@/config';

export interface GeocodingResult {
    address: string;
    coordinates: Coordinates;
}

export interface Coordinates {
    lat: number;
    lon: number;
}

interface NominatimResult {
    display_name: string;
    lat: string;
    lon: string;
}

export async function getCoordinates(config: Config, city: string, country: string): Promise<GeocodingResult> {
    return cache(config, ['geocode', city, country], () =>
        fetchCoordinates(config, city, country)
    );
}

export async function fetchCoordinates(config: Config, city: string, country: string): Promise<GeocodingResult> {
    const query = `${city}, ${country}`;
    const params = new URLSearchParams({
        q: query,
        format: 'json',
        limit: '1',
    });

    const url = `${config.nominatimUrl}?${params}`;
    const results = await apiGet<NominatimResult[]>(config, url);

    if (!results || results.length === 0) {
        throw new Error(`Could not find coordinates for ${city}, ${country}`);
    }

    const location = results[0];

    return {
        address: location.display_name,
        coordinates: {
            lat: parseFloat(location.lat),
            lon: parseFloat(location.lon),
        },
    };
}
