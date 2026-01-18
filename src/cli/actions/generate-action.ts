import {
  CommandLineAction,
  CommandLineStringParameter,
  CommandLineIntegerParameter
} from '@rushstack/ts-command-line';
import * as path from 'path';
import * as fs from 'fs';
import ora from 'ora';
import { getCoordinates } from '@/api/geocoding';
import { fetchMapData } from '@/api/osm';
import { renderPoster } from '@/poster/renderer';
import { loadTheme, getAvailableThemes } from '@/poster/themes';

const THEMES_DIR = path.join(__dirname, '..', '..', '..', 'themes');
const FONTS_DIR = path.join(__dirname, '..', '..', '..', 'fonts');
const POSTERS_DIR = path.join(__dirname, '..', '..', '..', 'posters');

function generateOutputFilename(city: string, themeName: string): string {
  if (!fs.existsSync(POSTERS_DIR)) {
    fs.mkdirSync(POSTERS_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, 15);
  const citySlug = city.toLowerCase().replace(/\s+/g, '_');
  const filename = `${citySlug}_${themeName}_${timestamp}.png`;

  return path.join(POSTERS_DIR, filename);
}

export class GenerateAction extends CommandLineAction {
  private cityParameter: CommandLineStringParameter;
  private countryParameter: CommandLineStringParameter;
  private themeParameter: CommandLineStringParameter;
  private distanceParameter: CommandLineIntegerParameter;

  public constructor() {
    super({
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
  }

  protected async onExecuteAsync(): Promise<void> {
    const city = this.cityParameter.value!;
    const country = this.countryParameter.value!;
    const themeName = this.themeParameter.value!;
    const distance = this.distanceParameter.value!;

    const availableThemes = getAvailableThemes(THEMES_DIR);
    if (!availableThemes.includes(themeName)) {
      console.error(`Error: Theme '${themeName}' not found.`);
      console.error(`Available themes: ${availableThemes.join(', ')}`);
      process.exitCode = 1;
      return;
    }

    console.log('='.repeat(50));
    console.log('City Map Poster Generator');
    console.log('='.repeat(50));

    const theme = loadTheme(themeName, THEMES_DIR);

    let spinner = ora('Looking up coordinates...').start();

    const geocodingResult = await getCoordinates(city, country);
    spinner.succeed(`Found: ${geocodingResult.address}`);
    console.log(`Coordinates: ${geocodingResult.coordinates.lat}, ${geocodingResult.coordinates.lon}`);

    const outputFile = generateOutputFilename(city, themeName);

    console.log(`\nGenerating map for ${city}, ${country}...`);

    spinner = ora('Fetching map data...').start();
    const { mapData, cacheHit } = await fetchMapData(geocodingResult.coordinates, distance, theme, (step) => {
      spinner.text = step;
    });
    if (cacheHit) {
      spinner.succeed('Loaded map data from cache');
    } else {
      spinner.succeed('Downloaded and cached map data');
    }

    spinner = ora('Rendering map...').start();
    console.log('Applying road hierarchy colors...');
    renderPoster(
      mapData,
      theme,
      city,
      country,
      geocodingResult.coordinates,
      outputFile,
      FONTS_DIR
    );
    spinner.succeed(`Saved to ${outputFile}`);

    console.log('\n' + '='.repeat(50));
    console.log('Poster generation complete!');
    console.log('='.repeat(50));
  }
}
