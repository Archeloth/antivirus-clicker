type Attrs = Record<string, string | number | boolean | undefined>;

/** Tiny element factory: h('div', { class: 'x', text: 'hi' }, child...). */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) continue;
    if (key === 'class') el.className = String(value);
    else if (key === 'text') el.textContent = String(value);
    else el.setAttribute(key, value === true ? '' : String(value));
  }
  el.append(...children);
  return el;
}

/** Write text only when it changed (avoids needless DOM mutations each frame). */
export function setText(el: Element, text: string): void {
  if (el.textContent !== text) el.textContent = text;
}

export function setClass(el: Element, cls: string, on: boolean): void {
  if (el.classList.contains(cls) !== on) el.classList.toggle(cls, on);
}

/**
 * Remembers the last value written per element+key so per-frame renders only
 * touch the DOM on change.
 */
export class DomCache {
  private readonly values = new WeakMap<Element, Map<string, string | number>>();

  changed(el: Element, key: string, value: string | number): boolean {
    let map = this.values.get(el);
    if (!map) {
      map = new Map();
      this.values.set(el, map);
    }
    if (map.get(key) === value) return false;
    map.set(key, value);
    return true;
  }

  style(el: HTMLElement, prop: string, value: string): void {
    if (this.changed(el, prop, value)) el.style.setProperty(prop, value);
  }
}
