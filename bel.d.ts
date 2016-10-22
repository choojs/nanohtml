declare module "bel" {
    export default function (strings: TemplateStringsArray, ...keys): HTMLElement;
    export function createElement (tag: string, attributes: any, children: Array<any>): HTMLElement;
}
