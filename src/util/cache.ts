import { logDebug } from '@/util/logger';
import { Config } from '@/config';
import { readJsonFile, writeJsonFile } from '@/util/fs';

interface CacheEntry<T> {
    data: T;
    cachedAt: string;
}

function getCacheKey(key: (string | number)[]): string {
    return key.map(k => k.toString().toLowerCase().replace(/[^a-z0-9]+/g, '_')).join('_').replace(/_+/g, '_');
}

export async function cache<T>(
    config: Config,
    key: (string | number)[],
    fetcher: () => Promise<T>
): Promise<T> {
    const cacheKey = getCacheKey(key);
    const cachePath = [config.cacheDir, `${cacheKey}.json`];

    try {
        const entry = await readJsonFile<CacheEntry<T>>(cachePath);
        if (entry) {
            logDebug('Loaded from cache', cacheKey, 'cached at', entry.cachedAt);
            return entry.data;
        }
    } catch {
        // Invalid cache, fall through to fetch
    }

    const data = await fetcher();

    const entry: CacheEntry<T> = {
        data,
        cachedAt: new Date().toISOString(),
    };
    await writeJsonFile(cachePath, entry);

    return data;
}
