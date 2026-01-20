export function logInfo(...data: unknown[]): void {
    console.info(...data);
}

export function logDebug(...data: unknown[]): void {
    console.debug('[DEBUG]', ...data);
}

export function logError(...data: unknown[]): void {
    console.error(...data);
}
