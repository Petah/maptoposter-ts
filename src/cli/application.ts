#!/usr/bin/env node

import { CommandLineParser } from '@rushstack/ts-command-line';
import { GenerateAction } from '@/cli/actions/generate-action';
import { ListThemesAction } from '@/cli/actions/list-themes-action';

export class MapToPosterCommandLine extends CommandLineParser {
  public constructor() {
    super({
      toolFilename: 'maptoposter',
      toolDescription: 'Generate beautiful map posters for any city'
    });

    this.addAction(new GenerateAction());
    this.addAction(new ListThemesAction());
  }

  protected onDefineParameters(): void {}
}
