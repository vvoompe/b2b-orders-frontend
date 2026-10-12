import { isSimulatedNetworkDown } from './checkMode';

/** Стан мережі без React: браузер повідомляє про розрив подіями online/offline. */
export function isBrowserOnline(): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.onLine !== 'boolean') return true;
  return navigator.onLine;
}

/**
 * Чи зв'язок вважається робочим. Ураховує і реальний стан браузера,
 * і змодельований обрив із режиму перевірки.
 */
export function isOnline(): boolean {
  return isBrowserOnline() && !isSimulatedNetworkDown();
}
