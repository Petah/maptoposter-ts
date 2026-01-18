# Map Poster Generator

Generate beautiful map posters for any city using OpenStreetMap data.

> TypeScript port of the original [Python version](https://github.com/originalankur/maptoposter) by Ankur Gupta.

## Installation

```bash
npm install
npm run build
```

## Usage

```bash
# Generate a poster
npm start -- --city "Paris" --country "France"

# With options
npm start -- --city "Tokyo" --country "Japan" --theme midnight_blue --distance 15000

# List available themes
npm start -- --list-themes
```

### Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--city` | `-c` | City name | (required) |
| `--country` | `-C` | Country name | (required) |
| `--theme` | `-t` | Theme name | `feature_based` |
| `--distance` | `-d` | Map radius in meters | `29000` |
| `--list-themes` | | List all available themes | |

### Distance Guide

| Distance | Best For |
|----------|----------|
| 4000-6000m | Small/dense cities (Venice, Amsterdam old center) |
| 8000-12000m | Medium cities, focused downtown (Paris, Barcelona) |
| 15000-20000m | Large metros, full city view (Tokyo, Mumbai) |

## Examples

```bash
# Iconic grid patterns
npm start -- -c "New York" -C "USA" -t noir -d 12000
npm start -- -c "Barcelona" -C "Spain" -t warm_beige -d 8000

# Waterfront & canals
npm start -- -c "Venice" -C "Italy" -t blueprint -d 4000
npm start -- -c "Amsterdam" -C "Netherlands" -t ocean -d 6000

# Radial patterns
npm start -- -c "Paris" -C "France" -t pastel_dream -d 10000

# Organic old cities
npm start -- -c "Tokyo" -C "Japan" -t japanese_ink -d 15000
npm start -- -c "Rome" -C "Italy" -t warm_beige -d 8000

# River cities
npm start -- -c "London" -C "UK" -t noir -d 15000
npm start -- -c "Budapest" -C "Hungary" -t copper_patina -d 8000
```

## Themes

Themes are stored as JSON files in the `themes/` directory. Each theme defines colors for:

- Background and text
- Gradient overlays
- Water features
- Parks and green spaces
- Road hierarchy (motorway, primary, secondary, tertiary, residential)

## Output

Generated posters are saved to the `posters/` directory as PNG files at 300 DPI (3600x4800 pixels).

## Data Sources

- Map data: [OpenStreetMap](https://www.openstreetmap.org/) via Overpass API
- Geocoding: [Nominatim](https://nominatim.openstreetmap.org/)

## License

MIT
