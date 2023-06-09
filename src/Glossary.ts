import { Logger } from 'tslog';
import { tmpdir } from 'os';

import download = require('download');
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
      altvsntags: string;
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
      website?: string;
}

export interface Output {
      entries: Entry[];
}

export class Glossary {
      private log = new Logger();
      public vsntag?: string;
      public safURL: string;
      private mrgURL?: string;
      public saf!: Promise<SAF>;
      private mrg!: Promise<MRG>;
      public glossary: Output = {
            entries: []
      };

      public constructor({ safURL, vsntag}: { safURL: string, vsntag?: string}) {
            this.safURL = safURL;
            this.vsntag = vsntag;
      }

      public async main() {
            await this.getSafMap();
            await this.getMrgMap();
            await this.populateGlossary();

            return this.glossary
      }
      /**
       * Retrieves the SAF (Scope Administration File) map.
       * @returns A promise that resolves to the SAF map.
       */
      private async getSafMap(): Promise<SAF> {
            try {
                  // Try to load the SAF map from the safURL
                  this.saf = yaml.load(fs.readFileSync(this.safURL, 'utf8')) as Promise<SAF>;
            } catch (err) {
                  try {
                        // If the file does not exist locally, download it to the temp directory
                        const filePath = path.join(tmpdir(), `saf.yaml`);
                        this.log.info('Trying to download ' + this.safURL)

                        fs.writeFileSync(filePath, await download(this.safURL));

                        // Update the safURL to the downloaded file and recursively call getSafMap()
                        this.safURL = filePath
                        this.getSafMap();
                  } catch (err) {
                        // Log the error if the SAF download fails
                        this.log.error("Failed to download SAF:", err);
                  }
            }

            return this.saf
      }

      /**
       * Retrieves the MRG (Machine Readable Glossary) map.
       * @returns A promise that resolves to the MRG map.
       */
      private async getMrgMap(): Promise<MRG> {
            // Find the MRG inside the versions section of the SAF that matches the specified `vsntag`
            let version = (await this.saf).versions.find(version => version.vsntag === this.vsntag);
            
            if (!version && this.vsntag) {
                  // Look inside 'altvsntags' if no MRG has been found
                  version = (await this.saf).versions.find(version => version.altvsntags && version.altvsntags.includes(this.vsntag!));
            }

            let mrgfile: string;
            if (version) {
                  // Use the specific MRG file specified in the version if available
                  mrgfile = version.mrgfile;
            } else {
                  // If version not found, fallback to the default MRG reference in the SAF scope section
                  mrgfile = (await this.saf).scope.mrgfile;
            }

            if (mrgfile) {
                  // Construct the `mrgURL` using the SAF scope information and MRG file name <scopedir/glossarydir/mrgfile>
                  this.mrgURL = path.join((await this.saf).scope.scopedir, (await this.saf).scope.glossarydir, mrgfile)

                  try {
                        // Try to load the MRG map from the `mrgURL`
                        this.mrg = yaml.load(fs.readFileSync(this.mrgURL, 'utf8')) as Promise<MRG>;
                  } catch (err) {
                        try {
                              // If the file does not exist locally, download it to the temp directory
                              const filePath = path.join(tmpdir(), `mrg-mrg.yaml`);
                              this.log.info('Trying to download ' + this.mrgURL)

                              fs.writeFileSync(filePath, await download(this.mrgURL));

                              // Update the `mrgURL` to the downloaded file and recursively call getMrgMap()
                              this.mrgURL = filePath
                              this.getMrgMap();
                        } catch (err) {
                              // Log the error if the MRG download fails and return an empty MRG map
                              this.log.error("Failed to download MRG: ", err);
                              return this.mrg
                        }
                  }
            }

            return this.mrg;
      }

      /**
       * Populates the glossary by processing MRG entries.
       * @returns A promise that resolves to the populated glossary.
       */
      private async populateGlossary(): Promise<Output> {
            const mrgEntries = (await this.mrg).entries;
            const safWebsite = (await this.saf).scope.website;

            for (const entry of mrgEntries) {
                  // Split the formPhrases string into the forms and trim each form, or set it as an empty list
                  const alternatives = entry.formPhrases ? entry.formPhrases.split(",").map(t => t.trim()) : [];

                  // Mapping of macro placeholders to their corresponding replacements
                  const regexMap: { [key: string]: string[] } = {
                        "{ss}": ["s", "'s", "(s)"],
                        "{yies}": ["y's", "ies"],
                        "{ying}": ["ier", "ying", "ies", "ied"],
                  };

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

                  // Create the original Entry with the (alternative) vsntag and SAF scope website
                  // NOTE: This does mean an entire MRG may be copied if an altvsntag is used.
                  //       Can be fixed by making vsntag a list inside the runtime glossary.
                  const glossaryEntry: Entry = {
                        ...entry,
                        vsntag: this.vsntag || entry.vsntag,
                        website: safWebsite,
                  };

                  // Add the original entry to the glossary
                  this.glossary.entries.push(glossaryEntry);

                  // Add entries of the alternative forms to the glossary
                  for (const alternative of alternatives.filter(s => !s.includes("{"))) {
                        const altEntry: Entry = { ...glossaryEntry, term: alternative };
                        this.glossary.entries.push(altEntry);
                  }
            }

            return this.glossary;
      }

}
