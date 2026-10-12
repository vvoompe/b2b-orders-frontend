import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/** Node-версія mock-API: використовується у тестах (Vitest + jsdom). */
export const server = setupServer(...handlers);
