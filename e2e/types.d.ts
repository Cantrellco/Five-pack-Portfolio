/**
 * The debug handle the site exposes (see lib/field-state.ts). Declared here
 * too because the e2e suite is compiled by Playwright, outside the app's
 * tsconfig.
 */
declare global {
  interface Window {
    __inkField?: {
      progress: number;
      pointerX: number;
      pointerY: number;
      visible: boolean;
    };
  }
}

export {};
