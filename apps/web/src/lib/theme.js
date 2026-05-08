export const THEME_STORAGE_KEY = "theme";

export const THEME_CHANGE_EVENT = "surveyapp-theme";

/** @returns {'light' | 'dark'} */
export function readStoredTheme() {
  if (typeof window === "undefined") return "light";
  return localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
}

/** @param {'light' | 'dark'} mode */
export function applyTheme(mode) {
  const dark = mode === "dark";
  document.documentElement.classList.toggle("dark", dark);
  localStorage.setItem(THEME_STORAGE_KEY, dark ? "dark" : "light");
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}
