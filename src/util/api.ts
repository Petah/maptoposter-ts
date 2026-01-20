import { Config } from '@/config';
import { logDebug, logError } from '@/util/logger';


export async function apiGet<T>(config: Config, url: string): Promise<T> {
    logDebug('Fetching API URL:', url);
    const response = await fetch(url, {
        headers: {
            'User-Agent': config.userAgent,
        },
    });

    const text = await response.text();

    if (!response.ok) {
        logError('API request failed for', url, response.status, response.statusText, text);
        throw new Error(`API request failed: ${response.statusText}`);
    }

    const result = JSON.parse(text) as T;
    logDebug('API response received:', url, JSON.stringify(result).length, 'bytes');
    return result;
}

export async function apiPost<T>(config: Config, url: string, body: string): Promise<T> {
    logDebug('Posting to API URL:', url, 'with body length', body.length);
    const response = await fetch(config.overpassUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
    });

    const text = await response.text();

    if (!response.ok) {
        logError('API POST request failed for', url, response.status, response.statusText, text);
        throw new Error(`API POST request failed: ${response.statusText}`);
    }

    const result = JSON.parse(text) as T;

    logDebug('API POST response received:', url, JSON.stringify(result).length, 'bytes');
    return result;
}
