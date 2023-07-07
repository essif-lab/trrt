import { Entry } from "./Glossary.js";
import Handlebars from 'handlebars';

export class Converter {
      private type: string;
      private template: string;

      public constructor({ template }: { template: any }) {
            const map: { [key: string]: string } = {
                  http: '<a href="{{navurl}}{{#trait}}#{{/trait}}{{trait}}">{{showtext}}</a>',
                  essif: '<a href="{{navurl}}{{#trait}}#{{/trait}}{{trait}}" title="{{glossaryText}}">{{showtext}}</a>', 
                  default: '[{{showtext}}]({{navurl}}{{#trait}}#{{/trait}}{{trait}})',
            };

            let key = template.toLowerCase()
            let exist = map.hasOwnProperty(key);
            if (exist) {
                  this.type = key;
                  this.template = map[key];
            } else {
                  this.type = 'custom';
                  this.template = template;
            }
      }

      convert(entry: Entry, term: Map<string, string>): string {
            const template = Handlebars.compile(this.template, {noEscape: true});

            const data = {
                  ...entry,
                  ...Object.fromEntries(term),
            };

            return template(data);
      }

      getType(): string {
            return this.type;
      }
}
