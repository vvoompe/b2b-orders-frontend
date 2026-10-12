import { useCallback, useEffect, useState } from 'react';
import {
  readCheckMode,
  resetCheckMode,
  subscribeCheckMode,
  updateCheckMode,
  type CheckModeFlags,
} from '@/lib/checkMode';
import { isOnline } from '@/lib/online';

/** Чи є зв'язок (справжній або змодельований) - оновлюється на події мережі. */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState<boolean>(() => isOnline());

  useEffect(() => {
    const update = (): void => setOnline(isOnline());

    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    const unsubscribe = subscribeCheckMode(update);

    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
      unsubscribe();
    };
  }, []);

  return online;
}

function mediaMatches(query: string): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(query).matches;
}

/**
 * Адаптивність на рівні розмітки: на мобільному рендеримо картки,
 * на десктопі - таблицю. Це не «дві копії заради CSS», а різні подання
 * одних даних із різними елементами керування.
 */
export function useIsMobile(breakpoint = 768): boolean {
  const query = `(max-width: ${breakpoint - 1}px)`;
  const [isMobile, setIsMobile] = useState<boolean>(() => mediaMatches(query));

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;

    const list = window.matchMedia(query);
    const onChange = (): void => setIsMobile(list.matches);

    onChange();
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, [query]);

  return isMobile;
}

export interface CheckModeControls {
  flags: CheckModeFlags;
  update: (patch: Partial<CheckModeFlags>) => void;
  reset: () => void;
}

/** Поточні прапорці режиму перевірки разом із функціями зміни. */
export function useCheckMode(): CheckModeControls {
  const [flags, setFlags] = useState<CheckModeFlags>(() => readCheckMode());

  useEffect(() => {
    const sync = (): void => setFlags(readCheckMode());
    return subscribeCheckMode(sync);
  }, []);

  const update = useCallback((patch: Partial<CheckModeFlags>) => {
    setFlags(updateCheckMode(patch));
  }, []);

  const reset = useCallback(() => {
    setFlags(resetCheckMode());
  }, []);

  return { flags, update, reset };
}
