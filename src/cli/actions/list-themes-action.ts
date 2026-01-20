import { BaseAction } from './base-action';
import { Config } from '@/config';
import { THEMES } from '@/theme';

export class ListThemesAction extends BaseAction {
    public constructor(config: Config) {
        super(config, {
            actionName: 'list-themes',
            summary: 'List all available themes',
            documentation: 'Display all available color themes that can be used for poster generation.'
        });
    }

    protected async onExecuteAsync(): Promise<void> {
        console.log('\nAvailable Themes:');
        console.log('-'.repeat(60));

        for (const themeName in THEMES) {
            const theme = THEMES[themeName];
            const displayName = theme.name || themeName;
            const description = theme.description || '';

            console.log(`  ${themeName}`);
            console.log(`    ${displayName}`);
            if (description) {
                console.log(`    ${description}`);
            }
        }
    }
}
