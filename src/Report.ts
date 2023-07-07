interface Item {
      message: string;
      [key: string]: any;
}

interface Output {
      items: Item[];
}    

class Report {
      errors: Output = {
            items: []
      };
      termErrors: Output = {
            items: []
      };
      converted: Output = {
            items: []
      };

      public async termHelp(file: string, line: number, message: string) {
            const helptext = await this.formatMessage('TERM HELP', file, line, message)

            this.termErrors.items.push({
                  message: helptext
            });
      }

      public async termConverted(term: string) {
            this.converted.items.push({
                  message: term
            });
      }

      public async error(error: string) {
            this.errors.items.push({
                  message: error
            });
      }

      public async print() {
            console.log("\x1b[1;37m");
            console.log(" Resolution Report:");
            console.log("       \x1b[0mNumber of terms converted: " + this.converted.items.length);
            if (this.termErrors.items.length > 0) {
                  console.log("   \x1b[1;37mErrors:\x1b[0m");
                  for (let item of this.termErrors.items) {
                        console.log(item.message);
                  }
            }
      }

      private async formatMessage(type: string, file: string, line: number, message: string) {
            let locator = `${file}:${line}`;
            if (locator.length > 50) {
                  locator = `...${locator.slice(-(50 - 3))}`;
            } else {
                  locator = locator.padEnd(50);
            }

            const formattedMessage = `\x1b[1;31m${type.padEnd(12)} \x1b[1;37m${locator} \x1b[0m${message}`;
            return formattedMessage;
      }
}

export const report = new Report();
