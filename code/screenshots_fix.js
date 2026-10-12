const { chromium } = require('playwright');
const crypto = require('crypto');
const fs = require('fs');

const BASE = 'http://localhost:5173';
const OUT = 'C:/Users/alexm/Desktop/Study/Frontend/STEM_project/img/screens';
const consoleErrors = [];

function md5(path) {
  return crypto.createHash('md5').update(fs.readFileSync(path)).digest('hex');
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'uk-UA' });
  const page = await context.newPage();
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));

  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('#login-email', 'admin@demo.ua');
  await page.fill('#login-password', 'admin123');
  await Promise.all([
    page.waitForURL('**/orders', { timeout: 20000 }),
    page.getByRole('button', { name: 'Увійти' }).click(),
  ]);
  await page.waitForTimeout(1500);

  // Перехід усередині застосунку (клік по меню, БЕЗ повного перезавантаження -
  // токен живе в пам'яті модуля і при reload сесія завершується).
  await page.getByRole('link', { name: 'Аналітика' }).click();
  await page.waitForURL('**/analytics', { timeout: 15000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/ris10_analytics.png`, fullPage: true });
  console.log('analytics url:', page.url());
  console.log('analytics перший заголовок:', (await page.locator('h1, h2').first().textContent())?.trim());

  await page.getByRole('link', { name: 'Користувачі' }).click();
  await page.waitForURL('**/admin/users', { timeout: 15000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/ris11_users.png`, fullPage: true });
  console.log('users url:', page.url());
  console.log('users перший заголовок:', (await page.locator('h1, h2').first().textContent())?.trim());

  await context.close();
  await browser.close();

  console.log('--- контроль однаковості файлів ---');
  for (const name of ['ris5_login.png', 'ris10_analytics.png', 'ris11_users.png']) {
    const path = `${OUT}/${name}`;
    const size = fs.statSync(path).size;
    console.log(`${name} ${(size / 1024).toFixed(0)} КБ md5=${md5(path).slice(0, 12)}`);
  }
  console.log('помилок консолі:', consoleErrors.length);
  for (const error of consoleErrors.slice(0, 5)) console.log(error);
})();
