import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { ApiError, apiRequest, describeError } from '@/api/client';
import { clearAuthToken, getAuthToken, hasAuthToken, setAuthToken } from '@/api/token';
import { CHECK_MODE_STORAGE_KEY } from '@/lib/checkMode';
import { server } from '@/mocks/server';

// Клієнт сам додає префікс /api, тому шлях для apiRequest - відносний до нього,
// а шлях обробника MSW - повний (він зіставляється з адресою запиту).
const PROBE = '/probe';
const PROBE_HANDLER = '/api/probe';

describe('apiRequest: успішні відповіді', () => {
  it('повертає розібраний JSON', async () => {
    server.use(http.get(PROBE_HANDLER, () => HttpResponse.json({ ok: true, items: [1, 2] })));
    await expect(apiRequest<{ ok: boolean }>(PROBE)).resolves.toEqual({ ok: true, items: [1, 2] });
  });

  it('надсилає тіло запиту й заголовок Content-Type', async () => {
    let contentType: string | null = null;
    let received: unknown = null;

    server.use(
      http.post(PROBE_HANDLER, async ({ request }) => {
        contentType = request.headers.get('Content-Type');
        received = await request.json();
        return HttpResponse.json({ ok: true });
      }),
    );

    await apiRequest(PROBE, { method: 'POST', body: { email: 'a@b.ua' } });

    expect(contentType).toBe('application/json');
    expect(received).toEqual({ email: 'a@b.ua' });
  });

  it('на 204 повертає undefined без розбору тіла', async () => {
    server.use(http.get(PROBE_HANDLER, () => new HttpResponse(null, { status: 204 })));
    await expect(apiRequest(PROBE)).resolves.toBeUndefined();
  });
});

describe('apiRequest: обробка помилок', () => {
  it('401 перетворює на ApiError з видом unauthorized', async () => {
    server.use(
      http.get(PROBE_HANDLER, () => HttpResponse.json({ message: 'Потрібна авторизація.' }, { status: 401 })),
    );

    const error = await apiRequest(PROBE).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(401);
    expect((error as ApiError).kind).toBe('unauthorized');
    expect((error as ApiError).message).toBe('Потрібна авторизація.');
  });

  it('500 перетворює на ApiError з видом server', async () => {
    server.use(http.get(PROBE_HANDLER, () => HttpResponse.json({ message: 'Збій сервера.' }, { status: 500 })));
    const error = (await apiRequest(PROBE).catch((caught: unknown) => caught)) as ApiError;

    expect(error.kind).toBe('server');
    expect(error.message).toBe('Збій сервера.');
  });

  it('404 перетворює на ApiError з видом client', async () => {
    server.use(http.get(PROBE_HANDLER, () => HttpResponse.json({ message: 'Немає.' }, { status: 404 })));
    const error = (await apiRequest(PROBE).catch((caught: unknown) => caught)) as ApiError;

    expect(error.kind).toBe('client');
    expect(error.status).toBe(404);
  });

  it('для тіла без JSON показує код відповіді', async () => {
    server.use(http.get(PROBE_HANDLER, () => new HttpResponse('не json', { status: 400 })));
    const error = (await apiRequest(PROBE).catch((caught: unknown) => caught)) as ApiError;

    expect(error.message).toContain('400');
  });

  it('обрив мережі перетворює на ApiError з видом network', async () => {
    server.use(http.get(PROBE_HANDLER, () => HttpResponse.error()));
    const error = (await apiRequest(PROBE).catch((caught: unknown) => caught)) as ApiError;

    expect(error).toBeInstanceOf(ApiError);
    expect(error.kind).toBe('network');
    expect(error.status).toBeNull();
    expect(error.message).toContain('зв’язку');
  });

  it('скасований запит пробрасывается як AbortError, а не як помилка мережі', async () => {
    server.use(http.get(PROBE_HANDLER, () => HttpResponse.json({ ok: true })));
    const controller = new AbortController();
    controller.abort();

    const error = await apiRequest(PROBE, { signal: controller.signal }).catch(
      (caught: unknown) => caught,
    );

    expect(error).not.toBeInstanceOf(ApiError);
    expect((error as Error).name).toBe('AbortError');
  });
});

describe('apiRequest: авторизація', () => {
  it('додає заголовок Authorization, коли токен є', async () => {
    setAuthToken('demo-token.usr-1001');
    let header: string | null = null;

    server.use(
      http.get(PROBE_HANDLER, ({ request }) => {
        header = request.headers.get('Authorization');
        return HttpResponse.json({ ok: true });
      }),
    );

    await apiRequest(PROBE);
    expect(header).toBe('Bearer demo-token.usr-1001');
  });

  it('не додає заголовок без токена', async () => {
    clearAuthToken();
    let header: string | null = 'початково';

    server.use(
      http.get(PROBE_HANDLER, ({ request }) => {
        header = request.headers.get('Authorization');
        return HttpResponse.json({ ok: true });
      }),
    );

    await apiRequest(PROBE);
    expect(header).toBeNull();
  });
});

describe('сховище токена', () => {
  it('токен живе лише в пам’яті модуля, не в localStorage', () => {
    setAuthToken('demo-token.usr-1002');

    expect(getAuthToken()).toBe('demo-token.usr-1002');
    expect(hasAuthToken()).toBe(true);
    // У сховищі може бути лише «Режим перевірки» - і жодного натяку на токен.
    expect(Object.keys(localStorage)).toEqual([CHECK_MODE_STORAGE_KEY]);
    expect(JSON.stringify(localStorage)).not.toContain('demo-token');

    clearAuthToken();
    expect(getAuthToken()).toBeNull();
    expect(hasAuthToken()).toBe(false);
  });
});

describe('describeError', () => {
  it('повертає повідомлення ApiError', () => {
    expect(describeError(new ApiError('Щось пішло не так.', 500, 'server'))).toBe(
      'Щось пішло не так.',
    );
  });

  it('повертає повідомлення звичайної помилки', () => {
    expect(describeError(new Error('Помилка мережі'))).toBe('Помилка мережі');
  });

  it('має запасний текст для невідомих значень', () => {
    expect(describeError(null)).toContain('непередбачена помилка');
    expect(describeError(new Error(''))).toContain('непередбачена помилка');
    expect(describeError('рядок')).toContain('непередбачена помилка');
  });
});
