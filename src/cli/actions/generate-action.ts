import {
    CommandLineStringParameter,
    CommandLineIntegerParameter,
    CommandLineChoiceParameter
} from '@rushstack/ts-command-line';
import { getCoordinates } from '@/api/geocoding';
import { fetchMapData } from '@/api/osm';
import { logError, logInfo } from '@/util/logger';
import { BaseAction } from './base-action';
import { Config } from '@/config';
import { getTheme, THEME_IDS } from '@/theme';
import { renderPosterRaster } from '@/raster-renderer';
import { renderPosterSvg } from '@/svg-renderer';
import { writeFile } from '@/util/fs';

function generateOutputFilename(city: string, country: string, themeName: string, format: 'svg' | 'png'): string {
    const citySlug = city.toLowerCase().replace(/\s+/g, '_');
    const countrySlug = country.toLowerCase().replace(/\s+/g, '_');
    const filename = `${citySlug}_${countrySlug}_${themeName}.${format}`;
    return filename;
}

export class GenerateAction extends BaseAction {
    private cityParameter: CommandLineStringParameter;
    private countryParameter: CommandLineStringParameter;
    private themeParameter: CommandLineStringParameter;
    private distanceParameter: CommandLineIntegerParameter;
    private formatParameter: CommandLineChoiceParameter;

    public constructor(config: Config) {
        super(config, {
            actionName: 'generate',
            summary: 'Generate a map poster for a city',
            documentation: `Generate a beautiful map poster for any city in the world.

Examples:
  # Iconic grid patterns
  maptoposter generate -c "New York" -C "USA" -t noir -d 12000
  maptoposter generate -c "Barcelona" -C "Spain" -t warm_beige -d 8000

  # Waterfront & canals
  maptoposter generate -c "Venice" -C "Italy" -t blueprint -d 4000
  maptoposter generate -c "Amsterdam" -C "Netherlands" -t ocean -d 6000

  # Radial patterns
  maptoposter generate -c "Paris" -C "France" -t pastel_dream -d 10000

Distance guide:
  4000-6000m   Small/dense cities (Venice, Amsterdam old center)
  8000-12000m  Medium cities, focused downtown (Paris, Barcelona)
  15000-20000m Large metros, full city view (Tokyo, Mumbai)`
        });

        this.cityParameter = this.defineStringParameter({
            parameterLongName: '--city',
            parameterShortName: '-c',
            argumentName: 'CITY',
            description: 'City name',
            required: true
        });

        this.countryParameter = this.defineStringParameter({
            parameterLongName: '--country',
            parameterShortName: '-C',
            argumentName: 'COUNTRY',
            description: 'Country name',
            required: true
        });

        this.themeParameter = this.defineStringParameter({
            parameterLongName: '--theme',
            parameterShortName: '-t',
            argumentName: 'THEME',
            description: 'Theme name',
            defaultValue: 'feature_based'
        });

        this.distanceParameter = this.defineIntegerParameter({
            parameterLongName: '--distance',
            parameterShortName: '-d',
            argumentName: 'METERS',
            description: 'Map radius in meters',
            defaultValue: 29000
        });

        this.formatParameter = this.defineChoiceParameter({
            parameterLongName: '--format',
            parameterShortName: '-f',
            alternatives: ['svg', 'png'],
            description: 'Output format (svg or png)',
            defaultValue: 'png'
        });
    }

    protected async onExecuteAsync(): Promise<void> {
        const city = this.cityParameter.value!;
        const country = this.countryParameter.value!;
        const themeName = this.themeParameter.value!;
        const distance = this.distanceParameter.value!;
        const format = this.formatParameter.value! as 'svg' | 'png';

        const theme = getTheme(themeName);
        if (!theme) {
            logError(`Error: Theme '${themeName}' not found.`);
            logError(`Available themes: ${THEME_IDS.join(', ')}`);
            process.exitCode = 1;
            return;
        }

        logInfo(`\nGenerating ${format.toUpperCase()} poster for ${city}, ${country}`);
        logInfo(`Theme: ${theme.name} | Distance: ${(distance / 1000).toFixed(1)}km\n`);

        logInfo('Looking up coordinates...');
        const geocodingResult = await getCoordinates(this.config, city, country);
        const { lat, lon } = geocodingResult.coordinates;
        logInfo(geocodingResult.address);
        logInfo(`${lat.toFixed(4)}°${lat >= 0 ? 'N' : 'S'}, ${lon.toFixed(4)}°${lon >= 0 ? 'E' : 'W'}\n`);

        logInfo('Fetching map data...');
        const mapData = await fetchMapData(this.config, geocodingResult.coordinates, distance, theme);
        logInfo(`${mapData.roads.length} roads, ${mapData.water.length} water, ${mapData.parks.length} parks\n`);

        logInfo(`Rendering ${format.toUpperCase()}...`);
        const outputFile = generateOutputFilename(city, country, themeName, format);
        if (format === 'svg') {
            const svg = renderPosterSvg(
                this.config,
                mapData,
                theme,
                city,
                country,
                geocodingResult.coordinates,
            );
            await writeFile([this.config.outputDir, outputFile], svg);
        } else {
            const buffer = renderPosterRaster(
                this.config,
                mapData,
                theme,
                city,
                country,
                geocodingResult.coordinates,
            );
            await writeFile([this.config.outputDir, outputFile], buffer);
        }
        logInfo(`Saved to ${outputFile}\n`);
    }
}
