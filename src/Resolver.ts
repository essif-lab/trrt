import { interpreter, converter, glossary } from './Run.js'
import { Logger } from 'tslog';
import { report } from './Report.js';
import { glob } from 'glob';

import fs = require("fs");
import path = require('path');

export class Resolver {
      private log = new Logger();
      private outputPath: string;
      private globPattern: string;
      private vsntag: string;

      public constructor({
            outputPath,
            globPattern,
            vsntag,
      }: {
            outputPath: string;
            globPattern: string;
            vsntag: string;
      }) {
            this.outputPath = outputPath;
            this.globPattern = globPattern;
            this.vsntag = vsntag;
      }
      /**
       * Creates directory tree and writes data to a file.
       * @param dirPath - The directory path.
       * @param file - The file name.
       * @param data - The data to write.
       */
      private writeFile(dirPath: string, file: string, data: string) {
            // Check if the directory path doesn't exist
            if (!fs.existsSync(dirPath)) {
                  // Create the directory and any necessary parent directories recursively
                  try {
                        fs.mkdirSync(dirPath, { recursive: true });
                  } catch (error) {
                        this.log.error("Error creating directory " + dirPath + ": " + error);
                  }
            };
            try {
                  this.log.trace("Writing: " + path.join(dirPath, file));
                  fs.writeFileSync(path.join(dirPath, file), data);
            } catch (error) {
                  this.log.error("Error writing file " + path.join(dirPath, file) + ": " + error);
            }
      }

      /**
       * Interprets and converts terms in the given data string based on the interpreter and converter.
       * @param file The file path of the file being processed.
       * @param data The input data string to interpret and convert.
       * @returns A Promise that resolves to the processed data string or undefined in case of no matches.
       */
      private async interpretAndConvert(file: string, data: string): Promise<string | undefined> {
            let matches: RegExpMatchArray[] = Array.from(data.matchAll(interpreter!.getRegex()));
            if (matches.length < 1) {
                  return undefined;
            }

            let lastIndex = 0;
      
            // Iterate over each match found in the data string
            for (const match of matches) {
                  const termProperties: Map<string, string> = interpreter!.interpret(match);
                  
                  // If the term has an empty scopetag, set it to the scopetag of the SAF
                  if (!termProperties.get("scopetag")) {
                        termProperties.set("scopetag", (await glossary.saf).scope.scopetag);
                  }

                  // If the term has an empty vsntag, set it to the default vsntag
                  if (!termProperties.get("vsntag")) {
                        termProperties.set("vsntag", this.vsntag);
                  }

                  // Find the matching entry in the glossary based on the term, scopetag and vsntag
                  let entry = glossary.runtime.entries.find(entry =>
                        entry.term === termProperties.get("term")! &&
                        entry.scopetag === termProperties.get("scopetag")! &&
                        (entry.vsntag === termProperties.get("vsntag")! ||
                        entry.altvsntags?.includes(termProperties.get("vsntag")!))
                  );

                  if (entry) {
                        // Convert the term using the configured converter
                        let replacement = converter!.convert(entry, termProperties);

                        // Only execute the replacement steps if the 'replacement' string is not empty
                        if (replacement.length > 0) {
                              const startIndex = match.index! + lastIndex;
                              const matchLength = match[0].length;
                              const textBeforeMatch = data.substring(0, startIndex);
                              const textAfterMatch = data.substring(startIndex + matchLength);
                              
                              // Replace the matched term with the generated replacement in the data string
                              data = `${textBeforeMatch}${replacement}${textAfterMatch}`;
      
                              // Update the lastIndex to account for the length difference between the match and replacement
                              lastIndex += replacement.length - matchLength;

                              // Log the converted term
                              report.termConverted(entry.term!);
                        } else {
                              report.termHelp(file, data.substring(0, match.index).split('\n').length, `Conversion of term ref '${match[0]}' resulted in an empty string`);
                        }
                  } else {
                        report.termHelp(file, data.substring(0, match.index).split('\n').length, `Term ref '${match[0]}' could not be matched with a MRG entry`);
                  }
            }

            return data;
      }

      /**
       * Resolves and converts files in the specified input path.
       */
      public async resolve(): Promise<boolean> {
            // Initialize the runtime glossary
            await(glossary.initialize());

            // Log information about the interpreter, converter and the files being read
            this.log.info(`Using interpreter '${interpreter.getType()}' and converter '${converter.getType()}'`)
            this.log.info(`Reading files using pattern string '${this.globPattern}'`);

            // Get the list of files based on the glob pattern
            const files = await glob(this.globPattern);

            // Process each file
            for (let filePath of files) {
                  // Read the file content
                  const data = fs.readFileSync(filePath, "utf8");

                  // Interpret and convert the file data
                  const convertedData = await this.interpretAndConvert(filePath, data);

                  // Write the converted data to the output file
                  if (convertedData) {
                        this.writeFile(path.join(this.outputPath, path.dirname(filePath)),
                        path.basename(filePath),
                        convertedData
                        );
                  }
            }

            return true;
      }
}
