// Client-side storage utilities
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('LocalStorage');
const isClient = typeof window !== 'undefined' && typeof localStorage !== 'undefined';

export function getLocalStorage(key: string): any | null {
  if (!isClient) {
    return null;
  }

  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    logger.error(`Error reading from localStorage key "${key}":`, error);
    return null;
  }
}

export function setLocalStorage(key: string, value: any): void {
  if (!isClient) {
    return;
  }

  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    logger.error(`Error writing to localStorage key "${key}":`, error);
  }
}
