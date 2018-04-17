declare module "nanohtml" {
  export default function (strings: TemplateStringsArray, ...keys: any[]): HTMLElement;
  export function createElement (tag: string | typeof HTMLElement, attributes: any, children: Array<any>): HTMLElement;
}
