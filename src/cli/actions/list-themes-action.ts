import { CommandLineAction } from '@rushstack/ts-command-line';
import * as path from 'path';
import { listThemes } from '@/poster/themes';

const THEMES_DIR = path.join(__dirname, '..', '..', '..', 'themes');

export class ListThemesAction extends CommandLineAction {
  public constructor() {
    super({
      actionName: 'list-themes',
      summary: 'List all available themes',
      documentation: 'Display all available color themes that can be used for poster generation.'
    });
  }

  protected onDefineParameters(): void {}

  protected async onExecuteAsync(): Promise<void> {
    listThemes(THEMES_DIR);
  }
}
