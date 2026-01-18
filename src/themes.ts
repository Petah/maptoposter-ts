import * as fs from 'fs';
import * as path from 'path';
import { Theme } from './types';

const DEFAULT_THEME: Theme = {
  name: 'Feature-Based Shading',
  bg: '#FFFFFF',
  text: '#000000',
  gradient_color: '#FFFFFF',
  water: '#C0C0C0',
  parks: '#F0F0F0',
  road_motorway: '#0A0A0A',
  road_primary: '#1A1A1A',
  road_secondary: '#2A2A2A',
  road_tertiary: '#3A3A3A',
  road_residential: '#4A4A4A',
  road_default: '#3A3A3A',
};

export function getAvailableThemes(themesDir: string): string[] {
  if (!fs.existsSync(themesDir)) {
    fs.mkdirSync(themesDir, { recursive: true });
    return [];
  }

  return fs
    .readdirSync(themesDir)
    .filter((file) => file.endsWith('.json'))
    .map((file) => file.slice(0, -5))
    .sort();
}

export function loadTheme(themeName: string, themesDir: string): Theme {
  const themePath = path.join(themesDir, `${themeName}.json`);

  if (!fs.existsSync(themePath)) {
    console.log(`Warning: Theme file '${themePath}' not found. Using default feature_based theme.`);
    return DEFAULT_THEME;
  }

  const themeData = JSON.parse(fs.readFileSync(themePath, 'utf-8')) as Theme;
  console.log(`✓ Loaded theme: ${themeData.name || themeName}`);
  if (themeData.description) {
    console.log(`  ${themeData.description}`);
  }

  return themeData;
}

export function listThemes(themesDir: string): void {
  const themes = getAvailableThemes(themesDir);

  if (themes.length === 0) {
    console.log("No themes found in 'themes/' directory.");
    return;
  }

  console.log('\nAvailable Themes:');
  console.log('-'.repeat(60));

  for (const themeName of themes) {
    const themePath = path.join(themesDir, `${themeName}.json`);
    try {
      const themeData = JSON.parse(fs.readFileSync(themePath, 'utf-8'));
      const displayName = themeData.name || themeName;
      const description = themeData.description || '';

      console.log(`  ${themeName}`);
      console.log(`    ${displayName}`);
      if (description) {
        console.log(`    ${description}`);
      }
      console.log();
    } catch {
      console.log(`  ${themeName}`);
      console.log();
    }
  }
}
