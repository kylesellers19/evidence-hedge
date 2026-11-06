// The engine build that produced a result: the short commit SHA, injected by
// Vite's `define` at build time (vite.config.js). Plain Node (checks) has no
// build step and reports 'dev'.
/* global __ENGINE_VERSION__ */
export const ENGINE_VERSION = typeof __ENGINE_VERSION__ !== 'undefined' ? __ENGINE_VERSION__ : 'dev'
