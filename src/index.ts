#!/usr/bin/env node

import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import ora from 'ora';
import { getCoordinates } from './geocoding';
import { fetchMapData } from './osm';
import { renderPoster } from './renderer';
import { loadTheme, getAvailableThemes, listThemes } from './themes';

const THEMES_DIR = path.join(__dirname, '..', 'themes');
const FONTS_DIR = path.join(__dirname, '..', 'fonts');
const POSTERS_DIR = path.join(__dirname, '..', 'posters');

function generateOutputFilename(city: string, themeName: string): string {
  if (!fs.existsSync(POSTERS_DIR)) {
    fs.mkdirSync(POSTERS_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, 15);
  const citySlug = city.toLowerCase().replace(/\s+/g, '_');
  const filename = `${citySlug}_${themeName}_${timestamp}.png`;

  return path.join(POSTERS_DIR, filename);
}

function printExamples(): void {
  console.log(`
City Map Poster Generator
=========================

Usage:
  maptoposter --city <city> --country <country> [options]

Examples:
  # Iconic grid patterns
  maptoposter -c "New York" -C "USA" -t noir -d 12000           # Manhattan grid
  maptoposter -c "Barcelona" -C "Spain" -t warm_beige -d 8000   # Eixample district grid

  # Waterfront & canals
  maptoposter -c "Venice" -C "Italy" -t blueprint -d 4000       # Canal network
  maptoposter -c "Amsterdam" -C "Netherlands" -t ocean -d 6000  # Concentric canals
  maptoposter -c "Dubai" -C "UAE" -t midnight_blue -d 15000     # Palm & coastline

  # Radial patterns
  maptoposter -c "Paris" -C "France" -t pastel_dream -d 10000   # Haussmann boulevards
  maptoposter -c "Moscow" -C "Russia" -t noir -d 12000          # Ring roads

  # Organic old cities
  maptoposter -c "Tokyo" -C "Japan" -t japanese_ink -d 15000    # Dense organic streets
  maptoposter -c "Marrakech" -C "Morocco" -t terracotta -d 5000 # Medina maze
  maptoposter -c "Rome" -C "Italy" -t warm_beige -d 8000        # Ancient street layout

  # Coastal cities
  maptoposter -c "San Francisco" -C "USA" -t sunset -d 10000    # Peninsula grid
  maptoposter -c "Sydney" -C "Australia" -t ocean -d 12000      # Harbor city
  maptoposter -c "Mumbai" -C "India" -t contrast_zones -d 18000 # Coastal peninsula

  # River cities
  maptoposter -c "London" -C "UK" -t noir -d 15000              # Thames curves
  maptoposter -c "Budapest" -C "Hungary" -t copper_patina -d 8000  # Danube split

  # List themes
  maptoposter --list-themes

Options:
  --city, -c        City name (required)
  --country, -C     Country name (required)
  --theme, -t       Theme name (default: feature_based)
  --distance, -d    Map radius in meters (default: 29000)
  --list-themes     List all available themes

Distance guide:
  4000-6000m   Small/dense cities (Venice, Amsterdam old center)
  8000-12000m  Medium cities, focused downtown (Paris, Barcelona)
  15000-20000m Large metros, full city view (Tokyo, Mumbai)

Available themes can be found in the 'themes/' directory.
Generated posters are saved to 'posters/' directory.
`);
}

async function main(): Promise<void> {
  const program = new Command();

  program
    .name('maptoposter')
    .description('Generate beautiful map posters for any city')
    .option('-c, --city <city>', 'City name')
    .option('-C, --country <country>', 'Country name')
    .option('-t, --theme <theme>', 'Theme name', 'feature_based')
    .option('-d, --distance <meters>', 'Map radius in meters', '29000')
    .option('--list-themes', 'List all available themes')
    .parse(process.argv);

  const options = program.opts();

  // If no arguments provided, show examples
  if (process.argv.length <= 2) {
    printExamples();
    process.exit(0);
  }

  // List themes if requested
  if (options.listThemes) {
    listThemes(THEMES_DIR);
    process.exit(0);
  }

  // Validate required arguments
  if (!options.city || !options.country) {
    console.log('Error: --city and --country are required.\n');
    printExamples();
    process.exit(1);
  }

  // Validate theme exists
  const availableThemes = getAvailableThemes(THEMES_DIR);
  if (!availableThemes.includes(options.theme)) {
    console.log(`Error: Theme '${options.theme}' not found.`);
    console.log(`Available themes: ${availableThemes.join(', ')}`);
    process.exit(1);
  }

  console.log('='.repeat(50));
  console.log('City Map Poster Generator');
  console.log('='.repeat(50));

  // Load theme
  const theme = loadTheme(options.theme, THEMES_DIR);

  // Get coordinates
  let spinner = ora('Looking up coordinates...').start();
  try {
    const geocodingResult = await getCoordinates(options.city, options.country);
    spinner.succeed(`Found: ${geocodingResult.address}`);
    console.log(`✓ Coordinates: ${geocodingResult.coordinates.lat}, ${geocodingResult.coordinates.lon}`);

    const distance = parseInt(options.distance, 10);
    const outputFile = generateOutputFilename(options.city, options.theme);

    console.log(`\nGenerating map for ${options.city}, ${options.country}...`);

    // Fetch map data
    spinner = ora('Fetching map data...').start();
    const mapData = await fetchMapData(geocodingResult.coordinates, distance, theme, (step) => {
      spinner.text = step;
    });
    spinner.succeed('All data downloaded successfully!');

    // Render poster
    spinner = ora('Rendering map...').start();
    console.log('Applying road hierarchy colors...');
    renderPoster(
      mapData,
      theme,
      options.city,
      options.country,
      geocodingResult.coordinates,
      outputFile,
      FONTS_DIR
    );
    spinner.succeed(`Saved to ${outputFile}`);

    console.log('\n' + '='.repeat(50));
    console.log('✓ Poster generation complete!');
    console.log('='.repeat(50));
  } catch (error) {
    spinner.fail('Error');
    console.error(`\n✗ Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

main();
