
// const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
// const USER_AGENT = 'maptoposter/1.0';
// const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

// @todo add standard paper sizes options and desktop/mobile resolutions

export class Config {
    public constructor(
        public readonly width: number,
        public readonly height: number,
        public readonly outputDir: string,
        public readonly cacheDir: string,
        public readonly themesDir: string,
        public readonly fontsDir: string,
        public readonly userAgent: string,
        public readonly nominatimUrl: string,
        public readonly overpassUrl: string,
    ) {
    }

    public static default(): Config {
        return new Config(
            3600,
            4800,
            `${import.meta.dirname}/../output`,
            `${import.meta.dirname}/../cache`,
            `${import.meta.dirname}/../themes`,
            `${import.meta.dirname}/../fonts`,
            'maptoposter/1.0',
            'https://nominatim.openstreetmap.org/search',
            'https://overpass-api.de/api/interpreter',
        );
    }
}
