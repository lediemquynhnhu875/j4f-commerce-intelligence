"use client";

import { useSyncExternalStore } from "react";
import type { Role } from "./preview-fixtures";
const KEY = "sellens-preview-role";
let memory: Role | null = null;
function snapshot(): Role | null {
  try {
    const value = sessionStorage.getItem(KEY);
    return value === "admin" || value === "user" ? value : null;
  } catch {
    return memory;
  }
}
function subscribe(callback: () => void) {
  window.addEventListener("sellens-demo-session", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("sellens-demo-session", callback);
    window.removeEventListener("storage", callback);
  };
}
export function useDemoRole() {
  return useSyncExternalStore(subscribe, snapshot, () => null);
}
export function setDemoRole(role: Role | null) {
  memory = role;
  try {
    if (role) sessionStorage.setItem(KEY, role);
    else sessionStorage.removeItem(KEY);
  } catch {
    /* The demo still works in memory if browser storage is unavailable. */
  }
  window.dispatchEvent(new Event("sellens-demo-session"));
}
