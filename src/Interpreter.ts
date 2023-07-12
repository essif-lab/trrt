export class Interpreter {
      private type: string;
      private regex: RegExp;

      public constructor({ regex}: { regex: string}) {
            const map: { [key: string]: RegExp } = {
                  alt: /(?:(?<=[^`\\])|^)\[(?=[^@\]]+@[:a-z0-9_-]*\](?:\([#a-z0-9_-]+\))?)(?<showtext>[^\n\]@]+?)@(?<scopetag>[a-z0-9_-]*)(?::(?<vsntag>[a-z0-9_-]+?))?\](?:\((?<id>[a-z0-9_-]*)(?:#(?<trait>[a-z0-9_-]+?))?\))/g,
                  default: /(?:(?<=[^`\\])|^)\[(?=[^@\]]+\]\([#a-z0-9_-]*@[:a-z0-9_-]*\))(?<showtext>[^\n\]@]+)\]\((?:(?<id>[a-z0-9_-]*)?(?:#(?<trait>[a-z0-9_-]+))?)?@(?<scopetag>[a-z0-9_-]*)(?::(?<vsntag>[a-z0-9_-]+))?\)/g,
            };
            
            let key = regex.toString().toLowerCase()
            let exist = map.hasOwnProperty(key);
            // Check if the regex parameter is a key in the defaults map
            if (exist) {
                  this.type = key;
                  this.regex = map[key];
            } else {
                  this.type = 'custom';
                  // Remove leading and trailing slashes, and flags
                  this.regex = new RegExp(regex.replace(/^\/|\/[a-z]*$/g, ''), 'g');
            }
      }

      getRegex(): RegExp {
            return this.regex;
      }

      interpret(match: RegExpMatchArray): Map<string, string> {
            var termProperties: Map<string, string> = new Map();

            if (match.groups != undefined) {
                  termProperties.set("showtext", match.groups.showtext);
                  termProperties.set("term", match.groups.id || match.groups.showtext.toLowerCase().replace(/['()]+/g, "").replace(/[^a-z0-9_-]+/g, "-"));
                  termProperties.set("trait", match.groups.trait);
                  termProperties.set("scopetag", match.groups.scopetag);
                  termProperties.set("vsntag", match.groups.vsntag);
            }

            return termProperties;
      }

      getType(): string {
            return this.type;
      }
}
