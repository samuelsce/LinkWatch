"use client";

import { useLayoutEffect } from "react";
import { themeStorageKey } from "@/config/theme";

type Theme = "light" | "dark";
let sessionPreference: Theme | undefined;

function savedPreference() {
  try {
    const saved = localStorage.getItem(themeStorageKey);
    if (saved === "light" || saved === "dark") return saved;
  } catch { /* Storage may be unavailable; keep the choice for this visit. */ }
  return sessionPreference;
}

export function ThemeToggle() {
  useLayoutEffect(() => {
    const system = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.theme = savedPreference() ?? (system.matches ? "dark" : "light");
    };
    const syncStorage = (event: StorageEvent) => {
      if (event.key === themeStorageKey || event.key === null) {
        sessionPreference = undefined;
        apply();
      }
    };
    apply();
    system.addEventListener("change", apply);
    window.addEventListener("storage", syncStorage);
    return () => {
      system.removeEventListener("change", apply);
      window.removeEventListener("storage", syncStorage);
    };
  }, []);

  function toggle() {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    sessionPreference = next;
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem(themeStorageKey, next); } catch { /* Theme switching still works without storage. */ }
  }

  return <button type="button" onClick={toggle} className="theme-toggle button-secondary" aria-label="Alternar tema" title="Alternar entre tema claro e escuro">
    <svg className="theme-to-dark" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M20.8 13A9 9 0 0 1 11 3.2 9 9 0 1 0 20.8 13Z" strokeLinejoin="round" /></svg>
    <svg className="theme-to-light" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" strokeLinecap="round" /></svg>
    <span className="theme-to-dark theme-label">Modo escuro</span><span className="theme-to-light theme-label">Modo claro</span>
  </button>;
}
