import { test as baseTest, expect } from '@playwright/test';
import { execSync } from 'child_process';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');

const PYTHON_EXE = resolve(__dirname, '../../venv/Scripts/python.exe');
const MANAGE_PY = resolve(__dirname, '../../manage.py');

export const test = baseTest.extend({
  loggedInPage: [async ({ page }, use, testInfo) => {
    const username = `e2e_user_${testInfo.testId}`;
    const password = 'password123';
    const characterName = `Тестер_${testInfo.workerIndex}`;

    try {
      console.log(`[Fixture] Creating user: ${username} for test "${testInfo.title}"`);
      execSync(`"${PYTHON_EXE}" "${MANAGE_PY}" create_test_user ${username}`, { stdio: 'inherit' });

      let connectionSuccess = false;
      for (let i = 0; i < 5; i++) {
        try {
          await page.goto('/login');
          connectionSuccess = true;
          break;
        } catch (error) {
          console.warn(`Attempt ${i + 1} failed: Could not connect to the server. Retrying in 1 second...`);
          await page.waitForTimeout(1000);
        }
      }

      if (!connectionSuccess) {
        throw new Error('Failed to connect to the development server after multiple retries.');
      }

      await page.getByPlaceholder('Логин').fill(username);
      await page.getByPlaceholder('Пароль').fill(password);
      
      const loginResponsePromise = page.waitForResponse(resp => resp.url().includes('/api/token/'));
      await page.getByRole('button', { name: 'Войти' }).click();
      await loginResponsePromise;

      await expect(page.locator('.character-name-input')).toBeVisible({ timeout: 10000 });
      
      await use(page);

    } finally {
      console.log(`[Fixture] Deleting user: ${username}`);
      try {
        execSync(`"${PYTHON_EXE}" "${MANAGE_PY}" delete_test_users ${username}`, { stdio: 'inherit' });
      } catch (e) {
        console.error(`[Fixture] Failed to delete user ${username}, continuing...`, e);
      }
    }
  }, { auto: true }],
});

export { expect };
