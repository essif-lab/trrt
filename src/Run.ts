#!/usr/bin/env node

import { Interpreter } from './Interpreter.js';
import { Converter } from './Converter.js';
import { Glossary } from './Glossary.js';
import { Resolver } from './Resolver.js'
import { Logger } from 'tslog';
import { Command } from 'commander';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { report } from './Report.js';

import yaml from 'js-yaml';
import chalk from 'chalk';
import clear from 'clear';
import figlet from 'figlet';

export let interpreter: Interpreter;
export let converter: Converter;
export let glossary: Glossary;
export let resolver: Resolver;
const program = new Command();

clear();

console.log(
      chalk.red(
            figlet.textSync('trrt-cli', { horizontalLayout: 'full' })
      )
);

program
      .name('trrt')
      .version('1.0.0')
      .usage('[ <paramlist> ] [ <globpattern> ]\n' +
      '- <paramlist> (optional) is a list of key-value pairs\n' +
      '- <globpattern> (optional) specifies a set of (input) files that are to be processed')
      .description("The CLI for the Term Reference Resolution Tool")
      .option('-c, --config <path>', 'Path (including the filename) of the tool\'s (YAML) configuration file')
      .option('-o, --output <dir>', '(Root) directory for output files to be written')
      .option('-s, --scopedir <path>', 'Path of the scope directory where the SAF is located')
      .option('-v, --vsntag <vsntag>', 'Version to use when no version is set in term ref (default: "latest")')
      .option('-int, --interpreter <type>', 'Set interpreter to Alt syntax')
      .option('-con, --converter <type>', 'Set converter to Markdown, HTTP or ESIFF output')
      .parse(process.argv);

program.parse()

async function main(): Promise<void> {
      const log = new Logger();

      // Parse command line parameters
      var options = program.opts();
      if (program.args[0]) {
            options.input = program.args[0]
      }

      if (options.config) {
            try {
                  const config = yaml.load(readFileSync(resolve(options.config), 'utf8')) as yaml.Schema;

                  // Merge config options with command line options
                  options = { ...config, ...options };
            } catch (err) {
                  log.error('Failed to read or parse the config file:', err);
                  process.exit(1);
            }
      }

      // Check if required options are provided
      if (!options.output || !options.scopedir) {
            program.help();
            log.error('ERROR: Required options are missing');
            log.error('Please provide the following options: --output <path>, --scopedir <path>');
            process.exit(1);
      
      } else {
            // Create an interpreter, converter and glossary with the provided options
            converter = new Converter({ template: options.converter ?? "default"});
            interpreter = new Interpreter({ regex: options.interpreter ?? "default"});
            glossary = new Glossary({ scopedir: resolve(options.scopedir) });

            // Create a resolver with the provided options
            resolver = new Resolver({
                  outputPath: resolve(options.output),
                  vsntag: options.vsntag ?? "latest",
                  globPattern: options.input
            });
            
            // Resolve terms
            // TODO: Make this a try-catch block
            if (await resolver.resolve()) {
                  log.info("Resolution complete...");
            } else {
                  log.error("Failed to resolve terms, see logs...");
                  process.exit(1);
            }
      }

      report.print();
}

main();
