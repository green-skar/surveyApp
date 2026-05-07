/**
 * Design-mode hooks for the in-browser inspector. The full implementation
 * ships with the hosted Create toolchain; this stub keeps local dev working.
 */

export type StyleResolution = {
  element: Element;
};

export type GetStyleInfo = (resolved: StyleResolution) => {
  className: string;
  styles: Record<string, string> | null;
};

export function initDesignMode(_getStyleInfo: GetStyleInfo): () => void {
  return () => {};
}
