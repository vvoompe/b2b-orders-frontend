import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './app/App';
import './styles/tokens.css';
import './styles/global.css';

/**
 * Точка входу.
 *
 * Бекенду в проєкті немає, тому mock-API (MSW) працює завжди - і в режимі
 * розробки, і в зібраній версії. Інакше `npm run preview` показував би
 * застосунок без даних.
 */
async function bootstrap(): Promise<void> {
  const { worker } = await import('./mocks/browser');
  await worker.start({
    serviceWorker: { url: '/mockServiceWorker.js' },
    onUnhandledRequest: 'bypass',
  });

  const container = document.getElementById('root');
  if (container === null) {
    throw new Error('Не знайдено кореневий елемент #root у index.html');
  }

  createRoot(container).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  );
}

void bootstrap();
