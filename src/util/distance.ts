export function metersToDegreesLat(meters: number): number {
    return meters / 111320;
}

export function metersToDegreesLon(meters: number, lat: number): number {
    return meters / (111320 * Math.cos((lat * Math.PI) / 180));
}
