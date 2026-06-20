/** Injected at build time via Vite `define`. */
declare const __BS_VERSION__: string | undefined;
declare const __BS_BUILD_DATE__: string | undefined;

export const BUILD_VERSION = typeof __BS_VERSION__ !== 'undefined' ? __BS_VERSION__ : '0.1.0-dev';
export const BUILD_STAMP = typeof __BS_BUILD_DATE__ !== 'undefined' ? __BS_BUILD_DATE__ : 'dev';