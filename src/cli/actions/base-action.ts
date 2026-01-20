import { Config } from '@/config';
import { CommandLineAction, ICommandLineActionOptions } from '@rushstack/ts-command-line';

export abstract class BaseAction extends CommandLineAction {
    public constructor(protected config: Config, options: ICommandLineActionOptions) {
        super(options);
    }
}
