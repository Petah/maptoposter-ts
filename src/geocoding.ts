import { GeocodingResult } from './types';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'maptoposter/1.0';

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

export async function getCoordinates(city: string, country: string): Promise<GeocodingResult> {
  const query = `${city}, ${country}`;
  const params = new URLSearchParams({
    q: query,
    format: 'json',
    limit: '1',
  });

  const response = await fetch(`${NOMINATIM_URL}?${params}`, {
    headers: {
      'User-Agent': USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error(`Geocoding request failed: ${response.statusText}`);
  }

  const results = (await response.json()) as NominatimResult[];

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
