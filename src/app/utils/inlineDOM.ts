export function inlineStylesFromDOM(element: HTMLElement): string {
    const clone = element.cloneNode(true) as HTMLElement;

    const walk = (el: Element) => {
        const computed = window.getComputedStyle(el);
        const inline: string[] = [];

        for (let i = 0; i < computed.length; i++) {
            const prop = computed[i];
            const value = computed.getPropertyValue(prop);
            inline.push(`${prop}:${value}`);
        }

        (el as HTMLElement).setAttribute("style", inline.join(";"));
    };

    // Walk the tree
    walk(clone);
    clone.querySelectorAll("*").forEach(walk);

    return clone.outerHTML;
}
