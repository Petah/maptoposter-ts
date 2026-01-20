import { MapToPosterCommandLine } from '@/cli/application';
import { Config } from './config';

const commandLine = new MapToPosterCommandLine(Config.default());
await commandLine.executeAsync();
