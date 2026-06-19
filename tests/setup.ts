import { DEFAULT_CONFIG } from '@/shared/storage';

const store: Record<string, unknown> = { config: DEFAULT_CONFIG };

Object.assign(globalThis, {
  chrome: {
    runtime: {
      sendMessage: async () => {},
    },
    storage: {
      local: {
        get: async (keys?: string | string[] | null) => {
          if (typeof keys === 'string') return { [keys]: store[keys] };
          if (Array.isArray(keys)) {
            const result: Record<string, unknown> = {};
            for (const k of keys) result[k] = store[k];
            return result;
          }
          return { ...store };
        },
        set: async (items: Record<string, unknown>) => {
          Object.assign(store, items);
        },
      },
    },
  },
});