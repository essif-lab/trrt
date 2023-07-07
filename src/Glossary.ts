import { Logger } from 'tslog';
import { glob } from 'glob';

import fs = require("fs");
import path = require('path');
import yaml = require('js-yaml');

interface SAF {
      scope: Scope;
      scopes: Scopes[];
      versions: Version[];
}

interface Scope {
      website: string;
      scopetag: string;
      scopedir: string;
      curatedir: string;
      glossarydir: string;
      mrgfile: string;
}

interface Scopes {
      scopetags: string[];
      scopedir: string;
}

interface Version {
      vsntag: string;
      mrgfile: string;
      altvsntags: string[];
}

interface MRG {
      terminology: Terminology;
      scopes: Scopes[];
      entries: Entry[];
}

interface Terminology {
      scopetag: string;
      scopedir: string;
      curatedir: string;
      vsntag: string;
      altvsntags: string[];
}

export interface Entry {
      term: string;
      vsntag: string;
      scopetag: string;
      locator: string;
      formPhrases?: string;
      glossaryText: string;
      navurl?: string;
      headingids?: string[];
      altvsntags?: string[];
      [key: string]: any;
}

export interface Output {
      entries: Entry[];
}

export class Glossary {
      private log = new Logger();
      public scopedir: string;
      public saf!: Promise<SAF>;
      public runtime: Output = {
            entries: []
      };

      public constructor({ scopedir}: { scopedir: string}) {
            this.scopedir = scopedir;

            this.saf = this.getSafMap(path.join(this.scopedir, 'saf.yaml'));
      }

      /**
       * Initializes the glossary by populating the runtime glossary.
       * @returns A promise that resolves to the populated runtime glossary.
       */
      public async initialize() {
            // Get the SAF map
            await this.getSafMap(path.join(this.scopedir, 'saf.yaml'));

            // Load all mrgfiles in the glossarydir
            const mrgfiles = await glob(path.join((await this.saf).scope.scopedir, (await this.saf).scope.glossarydir, 'mrg.*.*.yaml'));

            // Get the MRG map of each MRG file
            for (const mrgfile of mrgfiles) {
                  const mrg = await this.getMrgMap(mrgfile);
                  // Populate the runtime glossary with the MRG entries
                  await this.populateRuntime(mrg);
            }
            
            return this.runtime;
      }

      /**
       * Retrieves the SAF (Scope Administration File) map.
       * @returns A promise that resolves to the SAF map.
       */
      private async getSafMap(safURL: string): Promise<SAF> {
            let saf = {} as Promise<SAF>;

            try {
                  // Try to load the SAF map from the scopedir
                  saf = yaml.load(fs.readFileSync(safURL, 'utf8')) as Promise<SAF>;
            } catch (err) {
                  // TODO: Log the error if the mapping fails
                  null;
            }

            return saf
      }

      /**
       * Retrieves the MRG (Machine Readable Glossary) map.
       * @returns A promise that resolves to the MRG map.
       */
      public async getMrgMap(mrgURL: string): Promise<MRG> {
            let mrg = {} as Promise<MRG>;

            try {
                  // Try to load the MRG map from the `mrgURL`
                  mrg = yaml.load(fs.readFileSync(mrgURL, 'utf8')) as Promise<MRG>;
            } catch (err) {
                  null;
            }

            return mrg;
      }

      /**
       * Populates the runtime glossary by processing MRG entries.
       * @returns A promise that resolves to the populated runtime glossary.
       */
      public async populateRuntime(mrg: MRG): Promise<Output> {
            try {
                  const mrgEntries = mrg.entries;
                  const safWebsite = (await this.saf).scope.website;

                  for (const entry of mrgEntries) {
                        // Split the formPhrases string into the forms and trim each form, or set it as an empty list
                        const alternatives = entry.formPhrases ? entry.formPhrases.split(",").map(t => t.trim()) : [];

                        // Mapping of macro placeholders to their corresponding replacements
                        const regexMap: { [key: string]: string[] } = {
                              "{ss}": ["s"],
                              "{yies}": ["ys", "ies"],
                              "{ying}": ["ier", "ying", "ies", "ied"],
                        };

                        // For each alternative, check if it contains a macro
                        for (const alternative of alternatives) {
                              const match = alternative.match(/\{(ss|yies|ying)}/);
                              if (match) {
                                    const macro = match[0];
                                    const replacements = regexMap[macro];
                                    if (replacements) {
                                          // Replace the macro with each possible replacement and add the new alternative to the alternatives array
                                          for (const replacement of replacements) {
                                                alternatives.push(alternative.replace(match[0], replacement));
                                          }
                                    }
                              }
                        }

                        // fill altvsntag based on `altvsntags` property in the MRG
                        const glossaryEntry: Entry = {
                              ...entry,
                              altvsntags: mrg.terminology.altvsntags,
                              navurl: path.join(safWebsite, entry.navurl ? entry.navurl : ''),
                        };

                        // Add the original entry to the glossary
                        this.runtime.entries.push(glossaryEntry);

                        // Add entries of the alternative forms to the glossary
                        for (const alternative of alternatives.filter(s => !s.includes("{"))) {
                              const altEntry: Entry = { ...glossaryEntry, term: alternative };
                              this.runtime.entries.push(altEntry);
                        }
                  }
            } catch (err) {
                  // TODO: Log the error if the runtime glossary fails
                  null;
            }

            return this.runtime;
      }

}
