#!/usr/bin/env node

import { CommandLineParser } from '@rushstack/ts-command-line';
import { GenerateAction } from '@/cli/actions/generate-action';
import { ListThemesAction } from '@/cli/actions/list-themes-action';
import { Config } from '@/config';

export class MapToPosterCommandLine extends CommandLineParser {
    public constructor(config: Config) {
        super({
            toolFilename: 'maptoposter',
            toolDescription: 'Generate beautiful map posters for any city'
        });

        this.addAction(new GenerateAction(config));
        this.addAction(new ListThemesAction(config));
    }
}
