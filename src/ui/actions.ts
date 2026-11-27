/**
 * Event delegation: markup declares data-action / data-change / data-input / data-enter,
 * modules register handlers by name. No inline JS in the HTML.
 */
type Handler = (el: HTMLElement, ev: Event) => void | Promise<void>;

const handlers = new Map<string, Handler>();

export const on = (map: Record<string, Handler>): void => {
  Object.entries(map).forEach(([name, fn]) => {
    if (handlers.has(name)) throw new Error(`Duplicate action: ${name}`);
    handlers.set(name, fn);
  });
};

const run = (name: string | undefined, el: HTMLElement, ev: Event): void => {
  if (!name) return;
  const fn = handlers.get(name);
  if (!fn) {
    console.error(`No handler for action "${name}"`);
    return;
  }
  Promise.resolve(fn(el, ev)).catch((err) => console.error(`Action "${name}" failed`, err));
};

export const startActions = (): void => {
  document.addEventListener('click', (ev) => {
    const target = (ev.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (target) run(target.dataset.action, target, ev);
  });
  document.addEventListener('change', (ev) => {
    const target = (ev.target as HTMLElement).closest<HTMLElement>('[data-change]');
    if (target) run(target.dataset.change, target, ev);
  });
  document.addEventListener('input', (ev) => {
    const target = (ev.target as HTMLElement).closest<HTMLElement>('[data-input]');
    if (target) run(target.dataset.input, target, ev);
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Enter') return;
    const target = (ev.target as HTMLElement).closest<HTMLElement>('[data-enter]');
    if (!target) return;
    ev.preventDefault();
    run(target.dataset.enter, target, ev);
  });
};
