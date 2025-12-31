type Listener = (name: string, value: number | null) => void;

const store: Record<string, number | null> = {};
const listeners: Set<Listener> = new Set();

export const get = (name: string): number | null | undefined => {
  if (!name) return undefined;
  return store[name];
};

export const set = (name: string, value: number | null) => {
  if (!name) return;
  const prev = store[name];
  store[name] = value;
  if (prev !== value) {
    listeners.forEach(l => l(name, value));
  }
};

export const subscribe = (listener: Listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getAll = () => ({ ...store });

export default { get, set, subscribe, getAll };