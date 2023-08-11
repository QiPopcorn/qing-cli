#!/usr/bin/env node

import * as fs from 'node:fs';
import * as path from 'node:path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { inquirerPrompt } from './utils/command';
import { initTemplate } from './utils/renderTemplate';
import { defaultBanner, gradientBanner } from './utils/banners';
yargs(hideBin(process.argv)).command(
  ['create', 'c'],
  'Create New Project',
  function (yargs) {
    return yargs.option({
      name: {
        demand: false,
        describe: 'Your project name',
        type: 'string'
      },
      typescript: {
        alias: 'ts',
        demand: false,
        describe: 'Use TypeScript',
        type: 'boolean'
      },
      elementplus: {
        alias: 'element',
        demand: false,
        describe: 'Use Element-Plus',
        type: 'boolean'
      }
    });
  },
  async function (argv) {
    if (!argv.name && argv._.length > 1) {
      argv.name = argv._[1];
    }
    console.log(argv);
    console.log(process.stdout.isTTY && process.stdout.getColorDepth() > 8 ? gradientBanner : defaultBanner);
    console.log();
    const cwd = process.cwd();

    // if any of the feature flags is set, we would skip the feature prompts
    const isFeatureFlagsUsed =
      typeof (argv.default ?? argv.ts ?? argv.router ?? argv.pinia ?? argv.vitest ?? argv.eslint) === 'boolean';
    const answers = await inquirerPrompt(argv);
    initTemplate(answers);
  }
).argv;
