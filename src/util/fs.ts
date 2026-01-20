import { promises as fs } from 'fs';
import { logDebug } from '@/util/logger';
import { dirname, join } from 'path';

export async function writeJsonFile(filePath: string[], content: unknown): Promise<void> {
    const json = JSON.stringify(content, null, 4);
    return writeFile(filePath, json);
}

export async function readJsonFile<T>(filePath: string[]): Promise<T | null> {
    const content = await fs.readFile(join(...filePath), 'utf-8');
    return JSON.parse(content) as T;
}

export async function writeFile(filePath: string[], content: string | Buffer): Promise<void> {
    const joinedPath = join(...filePath);
    logDebug('Writing file to', joinedPath, typeof content === 'string' ? content.length : content.byteLength, 'bytes');
    await fs.mkdir(dirname(joinedPath), { recursive: true });
    await fs.writeFile(joinedPath, content, typeof content === 'string' ? 'utf-8' : undefined);
}
