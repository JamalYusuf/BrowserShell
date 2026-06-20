declare global {
  interface GlobalThis {
    __bsPage_dispatch?: (name: string, args: unknown[]) => unknown;
  }
}

export {};