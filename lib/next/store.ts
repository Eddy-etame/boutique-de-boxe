'use client';
import { useSyncExternalStore } from 'react';

/**
 * Petits magasins externes pour lire l’état du navigateur sans setState dans un effet :
 * la sélection de séance (sessionStorage) et l’adresse de la page (URL).
 */

const SESSION_KEY = 'boutique-session';
const SESSION_EVENT = 'boutique:session';

function subscribeSession(cb: () => void) {
  window.addEventListener(SESSION_EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(SESSION_EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}
export function useSessionRaw(): string {
  return useSyncExternalStore(
    subscribeSession,
    () => {
      try {
        return sessionStorage.getItem(SESSION_KEY) || '';
      } catch {
        return '';
      }
    },
    () => '',
  );
}
export function writeSession(value: Record<string, unknown>) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(value));
    window.dispatchEvent(new Event(SESSION_EVENT));
  } catch {}
}
export function parseSession(raw: string): Record<string, unknown> {
  try {
    const d = JSON.parse(raw || '{}');
    return d && typeof d === 'object' ? d : {};
  } catch {
    return {};
  }
}

const URL_EVENT = 'boutique:url';
function subscribeUrl(cb: () => void) {
  window.addEventListener(URL_EVENT, cb);
  window.addEventListener('popstate', cb);
  return () => {
    window.removeEventListener(URL_EVENT, cb);
    window.removeEventListener('popstate', cb);
  };
}
export function useSearch(): string {
  return useSyncExternalStore(subscribeUrl, () => location.search, () => '');
}
export function replaceSearch(params: URLSearchParams) {
  const q = params.toString();
  history.replaceState(null, '', location.pathname + (q ? '?' + q : ''));
  window.dispatchEvent(new Event(URL_EVENT));
}

const LOCAL_EVENT = 'boutique:local';
function subscribeLocal(cb: () => void) {
  window.addEventListener(LOCAL_EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(LOCAL_EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}
export function useLocal(key: string): string {
  return useSyncExternalStore(
    subscribeLocal,
    () => {
      try {
        return localStorage.getItem(key) || '';
      } catch {
        return '';
      }
    },
    () => '',
  );
}
export function writeLocal(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
    window.dispatchEvent(new Event(LOCAL_EVENT));
  } catch {}
}
