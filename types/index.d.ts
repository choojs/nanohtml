declare module "nanohtml" {
  export default function (strings: TemplateStringsArray, ...keys: any[]): HTMLElement;
  export function createElement (tag: string, attributes: any, children: Array<any>): HTMLElement;
}

declare module "nanohtml/raw" {
  export default function raw(tag: string): ChildNode[] | string;
}
