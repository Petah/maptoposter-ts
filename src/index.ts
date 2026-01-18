#!/usr/bin/env node

import { MapToPosterCommandLine } from '@/cli/application';

const commandLine = new MapToPosterCommandLine();
commandLine.executeAsync().catch(console.error);
