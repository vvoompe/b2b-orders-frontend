const { chromium } = require('playwright');
const fs = require('fs');

const BASE = 'http://localhost:5173';
const OUT = 'C:/Users/alexm/Desktop/Study/Frontend/STEM_project/img/screens';
const DEMO_EMAIL = 'admin@demo.ua';
const DEMO_PASSWORD = 'admin123';

const steps = [];
const consoleErrors = [];

function note(name, ok, detail = '') {
  steps.push(`${ok ? 'OK  ' : 'ЗБІЙ'} ${name}${detail ? ` - ${detail}` : ''}`);
}

async function guard(name, fn) {
  try {
    const result = await fn();
    note(name, true, typeof result === 'string' ? result : '');
    return result;
  } catch (error) {
    note(name, false, error.message.split('\n')[0]);
    return null;
  }
}

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.fill('#login-email', DEMO_EMAIL);
  await page.fill('#login-password', DEMO_PASSWORD);
  await Promise.all([
    page.waitForURL('**/orders', { timeout: 20000 }),
    page.getByRole('button', { name: 'Увійти' }).click(),
  ]);
  await page.waitForTimeout(1500);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({ channel: 'msedge' });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'uk-UA',
    permissions: ['clipboard-read', 'clipboard-write'],
  });

  const page = await context.newPage();
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(`pageerror: ${error.message}`));

  // 1. Екран входу
  await guard('Скріншот: екран входу', async () => {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/ris5_login.png`, fullPage: true });
    return 'ris5_login.png';
  });

  // 2. Вхід і список замовлень
  await guard('Вхід під адміністратором', async () => {
    await login(page);
    return page.url();
  });

  await guard('Скріншот: список замовлень (десктоп)', async () => {
    await page.waitForSelector('text=Знайдено замовлень', { timeout: 15000 });
    await page.screenshot({ path: `${OUT}/ris6_orders_desktop.png`, fullPage: true });
    const found = await page.getByText(/Знайдено замовлень: \d+/).first().textContent();
    return found ?? '';
  });

  // 3. Експорт CSV - реальний файл + перевірка вмісту
  await guard('Експорт CSV: файл завантажено й перевірено', async () => {
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 20000 }),
      page.getByRole('button', { name: 'Експорт CSV' }).click(),
    ]);
    const filePath = await download.path();
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\r\n');
    const hasBom = content.charCodeAt(0) === 0xfeff;
    const headerOk = lines[0].includes('Номер,Клієнт,Менеджер');
    const cyrillicOk = /[А-Яа-яІіЇїЄєҐґ]/.test(lines[1] ?? '');
    fs.writeFileSync(`${OUT}/export-preview.csv`, content, 'utf8');
    if (!hasBom || !headerOk || !cyrillicOk) {
      throw new Error(`BOM=${String(hasBom)} header=${String(headerOk)} cyrillic=${String(cyrillicOk)}`);
    }
    return `${download.suggestedFilename()}, рядків: ${String(lines.length)}, BOM: так, кирилиця: так`;
  });

  // 4. Картка замовлення
  await guard('Скріншот: картка замовлення', async () => {
    await page.getByRole('link', { name: /ЗМ-2026-\d+/ }).first().click();
    await page.waitForSelector('text=Фактори, що вплинули на прогноз', { timeout: 15000 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/ris7_order_card.png`, fullPage: true });
    return page.url();
  });

  // 5. Перерахунок прогнозу (реальна зміна стану кнопки)
  await guard('Перерахунок прогнозу: стан кнопки змінився', async () => {
    const before = await page.getByText(/Останній перерахунок/).first().textContent();
    await page.getByRole('button', { name: /Перерахувати прогноз/ }).click();
    await page.waitForTimeout(2500);
    const after = await page.getByText(/Останній перерахунок/).first().textContent();
    await page.screenshot({ path: `${OUT}/ris8_order_card_recalc.png`, fullPage: true });
    if (before === after) throw new Error('час перерахунку не змінився');
    return 'ris8_order_card_recalc.png';
  });

  // 6. Копіювання посилання
  await guard('Копіювати посилання: буфер обміну перевірено', async () => {
    await page.getByRole('button', { name: 'Копіювати посилання' }).click();
    await page.waitForTimeout(600);
    const confirmation = await page.getByText(/скопійовано в буфер/).first().textContent();
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    if (!clipboard.includes('/orders/')) throw new Error(`у буфері: ${clipboard}`);
    await page.screenshot({ path: `${OUT}/ris9_copy_link.png`, fullPage: true });
    return `${confirmation ?? ''} | буфер: ${clipboard}`;
  });

  // 7. Аналітика
  await guard('Скріншот: аналітика', async () => {
    await page.goto(`${BASE}/analytics`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/ris10_analytics.png`, fullPage: true });
    return 'ris10_analytics.png';
  });

  // 8. Користувачі
  await guard('Скріншот: користувачі', async () => {
    await page.goto(`${BASE}/admin/users`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/ris11_users.png`, fullPage: true });
    return 'ris11_users.png';
  });

  // 9. Мобільна версія
  await guard('Скріншот: мобільний список (390x844)', async () => {
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
      locale: 'uk-UA',
    });
    const mobilePage = await mobileContext.newPage();
    mobilePage.on('pageerror', (error) => consoleErrors.push(`mobile pageerror: ${error.message}`));
    await login(mobilePage);
    await mobilePage.waitForSelector('text=Знайдено замовлень', { timeout: 15000 });
    await mobilePage.waitForTimeout(800);
    await mobilePage.screenshot({ path: `${OUT}/ris12_orders_mobile.png`, fullPage: true });
    await mobileContext.close();
    return 'ris12_orders_mobile.png';
  });

  await context.close();
  await browser.close();

  console.log('--- КРОКИ ---');
  for (const step of steps) console.log(step);
  console.log(`--- ПОМИЛКИ КОНСОЛІ: ${String(consoleErrors.length)} ---`);
  for (const error of consoleErrors.slice(0, 10)) console.log(error);
  console.log('--- ФАЙЛИ ---');
  for (const file of fs.readdirSync(OUT).sort()) {
    const size = fs.statSync(`${OUT}/${file}`).size;
    console.log(`${file} ${(size / 1024).toFixed(0)} КБ`);
  }
})();
