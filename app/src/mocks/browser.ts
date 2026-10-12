import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

/**
 * Service worker MSW для браузера. Це єдине «джерело даних» застосунку:
 * бекенду в проєкті немає за межами проєкту (див. Розділ 10 ТЗ).
 */
export const worker = setupWorker(...handlers);
