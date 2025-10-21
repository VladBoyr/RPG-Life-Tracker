import { test, expect } from './fixtures.js';

test.describe('RPG-Life: Полный E2E-тест пользовательского пути', () => {

  test('should display character data and skills on the main page', async ({ page }) => {
    await expect(page.locator('.character-name-input')).toBeVisible();
    await expect(page.getByRole('heading', { name: '(Уровень: 1)' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Тестирование E2E' })).toBeVisible();
  });

  test('should create, update, and delete a skill', async ({ page }) => {
    const newSkillName = 'Изучение Playwright';
    const updatedSkillName = 'Мастер Playwright';

    await page.locator('.skills-panel').getByRole('button', { name: 'Добавить' }).click();
    await expect(page.getByRole('heading', { name: 'Новый навык' })).toBeVisible();
    
    await page.getByLabel('Название навыка:').fill(newSkillName);
    await page.getByLabel('Описание единицы прогресса:').fill('главу документации');
    await page.getByLabel('Опыт за единицу:').fill('50');
    
    const createResponse = page.waitForResponse('**/api/skills/');
    await page.getByRole('button', { name: 'Сохранить' }).click();
    await createResponse; // Ждем обновления данных

    await expect(page.getByRole('cell', { name: newSkillName })).toBeVisible();

    const skillRow = page.getByRole('row', { name: new RegExp(newSkillName) });
    await skillRow.getByRole('button', { name: '✏️' }).click();

    await expect(page.getByRole('heading', { name: 'Редактировать навык' })).toBeVisible();
    await page.getByLabel('Название навыка:').fill(updatedSkillName);

    const updateResponse = page.waitForResponse('**/api/skills/**');
    await page.getByRole('button', { name: 'Сохранить' }).click();
    await updateResponse; // Ждем обновления данных

    await expect(page.getByRole('cell', { name: updatedSkillName })).toBeVisible();
    await expect(page.getByRole('cell', { name: newSkillName, exact: true })).not.toBeVisible();
    
    const updatedSkillRow = page.getByRole('row', { name: new RegExp(updatedSkillName) });
    page.on('dialog', dialog => dialog.accept());
    
    const deleteResponse = page.waitForResponse('**/api/skills/**');
    await updatedSkillRow.getByRole('button', { name: '🗑️' }).click();
    await deleteResponse; // Ждем обновления данных

    await expect(page.getByRole('cell', { name: updatedSkillName })).not.toBeVisible();
  });

  test('should add progress to a skill and see XP update', async ({ page }) => {
    const skillRow = page.getByRole('row', { name: 'Тестирование E2E' });
    const characterPanel = page.locator('.character-panel');

    await expect(skillRow.getByRole('cell').nth(2)).toContainText('0 / 100');
    await expect(characterPanel).toContainText('0 / 100 XP');

    await skillRow.click();
    
    const progressAdder = page.locator('.progress-adder');
    await expect(progressAdder).toContainText('Добавить прогресс (15 XP за тест)');
    
    const progressResponse = page.waitForResponse('**/api/skills/*/add_progress/');
    await progressAdder.getByRole('button', { name: '+1 к прогрессу' }).click();
    await progressResponse;

    await expect(skillRow.getByRole('cell').nth(2)).toContainText('15 / 100');
    await expect(characterPanel).toContainText('15 / 100 XP');
  });

  test('should create, complete, and delete a goal', async ({ page }) => {
    await page.getByRole('cell', { name: 'Тестирование E2E' }).click();
    await expect(page.locator('.goals-panel h3')).toHaveText('Цели для: Тестирование E2E');

    await page.locator('.goals-panel').getByRole('button', { name: 'Добавить' }).click();
    await expect(page.getByRole('heading', { name: 'Новая цель' })).toBeVisible();

    const goalDescription = 'Написать первый E2E тест';
    await page.getByLabel('Описание цели:').fill(goalDescription);
    await page.getByLabel('Награда (XP):').fill('30');
    
    const createResponse = page.waitForResponse('**/api/goals/');
    await page.getByRole('button', { name: 'Сохранить' }).click();
    await createResponse;

    const goalItem = page.locator('.goals-list li', { hasText: goalDescription });
    await expect(goalItem).toBeVisible();

    const characterPanel = page.locator('.character-panel');
    await expect(characterPanel).toContainText('0 / 100 XP');
    
    const checkbox = goalItem.getByRole('checkbox');
    const completeResponse = page.waitForResponse('**/api/goals/*/toggle_complete/');
    await checkbox.click();
    await completeResponse;
    
    await expect(checkbox).toBeChecked(); 
    await expect(characterPanel).toContainText('30 / 100 XP');
    await expect(goalItem).toHaveClass(/completed/);

    const uncompleteResponse = page.waitForResponse('**/api/goals/*/toggle_complete/');
    await checkbox.click();
    await uncompleteResponse;

    await expect(checkbox).not.toBeChecked();
    await expect(characterPanel).toContainText('0 / 100 XP');
    await expect(goalItem).not.toHaveClass(/completed/);

    page.on('dialog', dialog => dialog.accept());
    await goalItem.getByRole('button', { name: '🗑️' }).click();
    await expect(goalItem).not.toBeVisible();
  });

  test('should be able to open a lootbox after completing 3 daily goals', async ({ page }) => {
    await page.getByRole('link', { name: 'Награды' }).click();
    await expect(page).toHaveURL('/rewards');

    await expect(page.getByRole('button', { name: 'Открыть лутбокс!' })).toBeDisabled();
    await expect(page.getByText('Выполнено дейликов сегодня: 0 / 3')).toBeVisible();

    await page.getByRole('link', { name: 'Главная' }).click();
    await expect(page).toHaveURL('/main');

    await page.getByRole('cell', { name: 'Тестирование E2E' }).click();
    await expect(page.locator('.goals-panel h3')).toHaveText('Цели для: Тестирование E2E');
    
    for (let i = 1; i <= 3; i++) {
        await page.locator('.goals-panel').getByRole('button', { name: 'Добавить' }).click();
        await page.getByLabel('Описание цели:').fill(`Дейлик номер ${i}`);
        await page.getByLabel('Награда (XP):').fill('25');
        
        const createGoalResponse = page.waitForResponse('**/api/goals/');
        await page.getByRole('button', { name: 'Сохранить' }).click();
        await createGoalResponse;
        
        const goalItem = page.locator('.goals-list li', { hasText: `Дейлик номер ${i}` });
        const checkbox = goalItem.getByRole('checkbox');
        
        const completeResponse = page.waitForResponse('**/api/goals/*/toggle_complete/');
        await checkbox.click();
        await completeResponse;
        
        await expect(checkbox).toBeChecked();
    }

    await page.getByRole('link', { name: 'Награды' }).click();

    await expect(page.getByText('Выполнено дейликов сегодня: 3 / 3')).toBeVisible();
    const openButton = page.getByRole('button', { name: 'Открыть лутбокс!' });
    await expect(openButton).toBeEnabled();

    const lootboxResponsePromise = page.waitForResponse(resp => resp.url().includes('/api/lootbox/') && resp.request().method() === 'POST');
    await openButton.click();
    const response = await lootboxResponsePromise;
    const responseBody = await response.json();
    const wonItemData = responseBody.won_item;

    const wonItemDisplay = page.locator('.won-item-display');
    await expect(wonItemDisplay).toContainText(`Вы выиграли: ${wonItemData.name}`, { timeout: 10000 });

    const historyList = page.locator('.history-panel');
    await expect(historyList).toContainText(`"${wonItemData.name}" из "Лутбокс"`);
  });

    // --- Аутентификация ---
    test.describe('Аутентификация', () => {
        test('должен успешно регистрировать нового пользователя', async ({ page }) => {
            const username = `new_user_${Date.now()}`;
            await page.goto('/register');

            await expect(page.getByRole('heading', { name: 'Регистрация' })).toBeVisible();

            await page.getByPlaceholder('Логин (для входа)').fill(username);
            await page.getByPlaceholder('Имя персонажа (отображаемое)').fill('Новый Герой');
            await page.locator('input[name="password"]').fill('superSecurePassword123');
            await page.locator('input[name="password2"]').fill('superSecurePassword123');
            await page.getByRole('button', { name: 'Зарегистрироваться' }).click();

            await expect(page.getByText('Регистрация прошла успешно!')).toBeVisible();
            await expect(page).toHaveURL('/login', { timeout: 5000 }); // Ждем редиректа

            // Проверяем, что можем войти с новыми данными
            await page.getByPlaceholder('Логин').fill(username);
            await page.locator('input[name="password"]').fill('superSecurePassword123');
            await page.getByRole('button', { name: 'Войти' }).click();

            await expect(page).toHaveURL('/main');
            await expect(page.locator('.character-name-input')).toHaveValue('Новый Герой');
        });

        test('должен выходить из системы', async ({ page }) => { // Используем `page` из фикстуры, т.к. она уже залогинена
            await page.goto('/main');
            await expect(page.getByRole('button', { name: 'Выйти' })).toBeVisible();
            await page.getByRole('button', { name: 'Выйти' }).click();

            await expect(page).toHaveURL('/login');

            // Проверяем, что защищенные роуты недоступны
            await page.goto('/main');
            await expect(page).toHaveURL('/login');
        });
    });

    // --- Главная страница: Навыки, Цели, Прогресс ---
    test.describe('Главная страница', () => {

        test('должен отображать данные персонажа и изменять имя', async ({ page }) => {
            await expect(page.locator('.character-name-input')).toBeVisible();
            await expect(page.getByRole('heading', { name: '(Уровень: 1)' })).toBeVisible();

            const newName = 'Супер Тестер';
            const nameInput = page.locator('.character-name-input');
            await nameInput.fill(newName);
            await nameInput.press('Enter');

            // Ждем ответа от API и перезагружаем страницу для проверки
            await page.waitForResponse(resp => resp.url().includes('/api/character/'));
            await page.reload();

            await expect(nameInput).toHaveValue(newName);
        });

        test('должен выполнять CRUD для Навыков', async ({ page }) => {
            const skillName = 'Изучение Playwright';
            const updatedSkillName = 'Мастер Playwright';

            // Create
            await page.locator('.skills-panel .add-btn').click();
            await page.getByLabel('Название навыка:').fill(skillName);
            await page.getByLabel('Описание единицы прогресса:').fill('тест');
            await page.getByLabel('Опыт за единицу:').fill('20');

            const createResponse = page.waitForResponse('**/api/skills/'); // Ждем ответа от API создания
            await page.getByRole('button', { name: 'Сохранить' }).click();
            await createResponse; // Убеждаемся, что сервер ответил

            const newSkillRow = page.getByRole('row', { name: new RegExp(skillName) });
            await expect(newSkillRow).toBeVisible();

            // Update
            await newSkillRow.getByRole('button', { name: '✏️' }).click();
            await page.getByLabel('Название навыка:').fill(updatedSkillName);

            const updateResponse = page.waitForResponse('**/api/skills/**'); // Ждем ответа от API создания
            await page.getByRole('button', { name: 'Сохранить' }).click();
            await updateResponse; // Убеждаемся, что сервер ответил

            await expect(page.getByRole('cell', { name: updatedSkillName })).toBeVisible();
            await expect(page.getByRole('cell', { name: skillName, exact: true })).not.toBeVisible();

            // Delete
            page.on('dialog', dialog => dialog.accept());
            await page.getByRole('row', { name: new RegExp(updatedSkillName) }).getByRole('button', { name: '🗑️' }).click();
            await expect(page.getByRole('cell', { name: updatedSkillName })).not.toBeVisible();
        });

        test('должен выполнять CRUD для Целей, добавлять прогресс и выполнять цели', async ({ page }) => {
            const goalName = 'Написать первый тест';
            const updatedGoalName = 'Написать стабильный тест';
            const characterPanel = page.locator('.character-panel');
            const skillRow = page.getByRole('row', { name: /Тестирование E2E/ });

            // Выбираем навык
            await skillRow.click();
            await expect(page.locator('.goals-panel h3')).toContainText('Тестирование E2E');
            await expect(characterPanel).toContainText('0 / 100 XP');

            // --- Добавление прогресса ---
            await page.getByRole('button', { name: '+1 к прогрессу' }).click();
            await expect(characterPanel).toContainText('15 / 100 XP');
            await expect(skillRow).toContainText('15 / 100');

            // --- CRUD Целей ---
            // Create
            await page.locator('.goals-panel .add-btn').click();
            await page.getByLabel('Описание цели:').fill(goalName);
            await page.getByLabel('Награда (XP):').fill('30');
            await page.getByRole('button', { name: 'Сохранить' }).click();
            const goalItem = page.locator('.goals-list li', { hasText: goalName });
            await expect(goalItem).toBeVisible();

            // Read (проверяется видимостью)

            // Update
            await goalItem.getByRole('button', { name: '✏️' }).click();
            await page.getByLabel('Описание цели:').fill(updatedGoalName);
            await page.getByRole('button', { name: 'Сохранить' }).click();
            const updatedGoalItem = page.locator('.goals-list li', { hasText: updatedGoalName });
            await expect(updatedGoalItem).toBeVisible();
            await expect(goalItem).not.toBeVisible();

            // --- Выполнение цели ---
            const checkbox = updatedGoalItem.getByRole('checkbox');
            const completeResponse = page.waitForResponse('**/api/goals/*/toggle_complete/');
            await checkbox.click();
            await completeResponse;
            await expect(checkbox).toBeChecked();
            await expect(updatedGoalItem).toHaveClass(/completed/);
            await expect(characterPanel).toContainText('45 / 100 XP'); // 15 + 30

            // --- Отмена выполнения ---
            const uncompleteResponse = page.waitForResponse('**/api/goals/*/toggle_complete/');
            await checkbox.click();
            await uncompleteResponse;
            await expect(checkbox).not.toBeChecked();
            await expect(updatedGoalItem).not.toHaveClass(/completed/);
            await expect(characterPanel).toContainText('15 / 100 XP'); // 45 - 30

            // Delete
            page.on('dialog', dialog => dialog.accept());
            await updatedGoalItem.getByRole('button', { name: '🗑️' }).click();
            await expect(updatedGoalItem).not.toBeVisible();
        });
        
        test('должен выполнять CRUD для Заметок', async ({ page }) => {
            const noteText = 'Playwright очень мощный инструмент.';
            const updatedNoteText = 'Не забыть проверить фикстуры.';

            // Открываем модальное окно заметок
            const skillRow = page.getByRole('row', { name: /Тестирование E2E/ });
            await skillRow.dblclick();
            await expect(page.getByRole('heading', { name: /Заметки по навыку/ })).toBeVisible();

            // Create
            await page.getByRole('button', { name: 'Добавить новую заметку' }).click();
            await page.getByLabel('Текст заметки:').fill(noteText);
            await page.getByRole('button', { name: 'Сохранить' }).click();
            const noteItem = page.locator('.notes-list li', { hasText: noteText });
            await expect(noteItem).toBeVisible();

            // Read (проверяется видимостью)

            // Update
            await noteItem.getByRole('button', { name: '✏️' }).click();
            await page.getByLabel('Текст заметки:').fill(updatedNoteText);
            await page.getByRole('button', { name: 'Сохранить' }).click();
            const updatedNoteItem = page.locator('.notes-list li', { hasText: updatedNoteText });
            await expect(updatedNoteItem).toBeVisible();
            await expect(noteItem).not.toBeVisible();

            // Delete
            page.on('dialog', dialog => dialog.accept());
            await updatedNoteItem.getByRole('button', { name: '🗑️' }).click();
            await expect(updatedNoteItem).not.toBeVisible();
            
            // Закрываем модальное окно
            await page.getByRole('button', { name: '×' }).click();
        });

test('should correctly de-level after uncompleting a goal that caused a level-up', async ({ page }) => {
    const characterPanel = page.locator('.character-panel');
    const skillRow = page.getByRole('row', { name: /Тестирование E2E/ });
    const xpPerUnit = 15;
    const goalXp = 25;

    // --- 1. SETUP: Ставим персонажа в состояние "почти левел-ап" ---
    // Нам нужно 90 XP. 6 единиц прогресса * 15 XP/ед. = 90 XP.
    await skillRow.click();
    for (let i = 0; i < 6; i++) {
        await page.getByRole('button', { name: '+1 к прогрессу' }).click();
        // Ждем обновления UI, чтобы избежать гонки состояний
        await expect(skillRow.getByRole('cell').nth(2)).toContainText(`${(i + 1) * xpPerUnit} /`);
    }

    // Проверяем, что состояние корректно: Уровень 1, 90/100 XP
    const skillLevelCell = skillRow.getByRole('cell').nth(1);
    await expect(skillLevelCell).toHaveText('1');
    await expect(skillRow.getByRole('cell').nth(2)).toHaveText('90 / 100');
    await expect(characterPanel).toContainText('Уровень: 1');
    await expect(characterPanel).toContainText('90 / 100 XP');

    // --- 2. ACTION: Выполняем цель, которая повышает уровень ---
    await page.locator('.goals-panel .add-btn').click();
    await page.getByLabel('Описание цели:').fill('Цель для повышения уровня');
    await page.getByLabel('Награда (XP):').fill(goalXp.toString());
    await page.getByRole('button', { name: 'Сохранить' }).click();
    
    const goalItem = page.locator('.goals-list li', { hasText: 'Цель для повышения уровня' });
    const checkbox = goalItem.getByRole('checkbox');
    const levelUpResponse = page.waitForResponse('**/api/goals/*/toggle_complete/');
    await checkbox.click();
    await levelUpResponse;

    // --- 3. VERIFY: Проверяем, что уровень повысился ---
    // Ожидаемый результат: 90 + 25 = 115. 115 - 100 (за уровень) = 15 XP.
    await expect(skillLevelCell).toHaveText('2');
    await expect(skillRow.getByRole('cell').nth(2)).toHaveText('15 / 200');
    await expect(characterPanel).toContainText('Уровень: 2');
    await expect(characterPanel).toContainText('15 / 240 XP');

    // --- 4. DE-LEVEL ACTION: Отменяем ту же цель ---
    const delevelResponse = page.waitForResponse('**/api/goals/*/toggle_complete/');
    await checkbox.click();
    await delevelResponse;

    // --- 5. FINAL VERIFY: Проверяем, что произошел откат на предыдущий уровень ---
    // Ожидаемый результат: 15 - 25 = -10. Откат на 1 уровень, 100 - 10 = 90 XP.
    await expect(skillLevelCell).toHaveText('1');
    await expect(skillRow.getByRole('cell').nth(2)).toHaveText('90 / 100');
    await expect(characterPanel).toContainText('Уровень: 1');
    await expect(characterPanel).toContainText('90 / 100 XP');
});
    });

    // --- Страница "Награды" ---
    test.describe('Страница "Награды"', () => {

        test('должен открывать лутбокс после выполнения 3 дейликов и показывать награду в истории', async ({ page }) => {
            // Переходим на страницу наград и проверяем, что кнопка заблокирована
            await page.getByRole('link', { name: 'Награды' }).click();
            await expect(page).toHaveURL('/rewards');
            await expect(page.getByRole('button', { name: 'Открыть лутбокс!' })).toBeDisabled();

            // Возвращаемся и выполняем 3 дейлика
            await page.getByRole('link', { name: 'Главная' }).click();
            const skillRow = page.getByRole('row', { name: /Тестирование E2E/ });
            await skillRow.click();

            for (let i = 1; i <= 3; i++) {
                await page.locator('.goals-panel .add-btn').click();
                await page.getByLabel('Описание цели:').fill(`Дейлик ${i}`);
                await page.getByLabel('Награда (XP):').fill('10');
                await page.locator('form').getByRole('button', { name: 'Сохранить' }).click();
                const goalItem = page.locator('.goals-list li', { hasText: `Дейлик ${i}` });
                const checkbox = goalItem.getByRole('checkbox');
                const completeResponse = page.waitForResponse('**/api/goals/*/toggle_complete/');
                await checkbox.click();
                await completeResponse;
                await expect(checkbox).toBeChecked();
            }

            // Снова идем на страницу наград
            await page.getByRole('link', { name: 'Награды' }).click();
            await expect(page.getByRole('button', { name: 'Открыть лутбокс!' })).toBeEnabled();

            // Открываем лутбокс
            const lootboxResponse = page.waitForResponse(resp => resp.url().includes('/api/lootbox/') && resp.request().method() === 'POST');
            await page.getByRole('button', { name: 'Открыть лутбокс!' }).click();
            const response = await lootboxResponse;
            const responseBody = await response.json();
            const wonItem = responseBody.won_item;
    
            await expect(page.locator('.won-item-display')).toContainText(`Вы выиграли: ${wonItem.name}`, { timeout: 10000 });

            // Проверяем историю
            const historyList = page.locator('.history-panel');
            await expect(historyList).toContainText(`"${wonItem.name}" из "Лутбокс"`);
        });

        test('должен выполнять CRUD для Предметов лутбокса', async ({ page }) => {
            const lootName = 'Редкий артефакт';
            const updatedLootName = 'Легендарный артефакт';

            await page.getByRole('link', { name: 'Награды' }).click();

            // Create
            await page.getByRole('button', { name: 'Добавить предмет' }).click();
            await page.getByLabel('Название награды:').fill(lootName);
            await page.getByLabel('Редкость:').selectOption('RARE');
            await page.getByLabel('Базовый шанс (%):').fill('5.5');
            await page.getByRole('button', { name: 'Сохранить' }).click();
            const newLootRow = page.getByRole('row', { name: new RegExp(lootName) });
            await expect(newLootRow).toBeVisible();

            // Update
            await newLootRow.getByRole('button', { name: '✏️' }).click();
            await page.getByLabel('Название награды:').fill(updatedLootName);
            await page.getByLabel('Редкость:').selectOption('LEGENDARY');
            await page.getByRole('button', { name: 'Сохранить' }).click();
            await expect(page.getByRole('cell', { name: updatedLootName })).toBeVisible();

            // Delete
            page.on('dialog', dialog => dialog.accept());
            await page.getByRole('row', { name: new RegExp(updatedLootName) }).getByRole('button', { name: '🗑️' }).click();
            await expect(page.getByRole('cell', { name: updatedLootName })).not.toBeVisible();
        });

        test('должен выполнять CRUD для Достижений', async ({ page }) => {
            const achDesc = 'Достигнуть 10 уровня';
            const updatedAchDesc = 'Достигнуть 20 уровня';

            await page.getByRole('link', { name: 'Награды' }).click();

            // Create
            await page.getByRole('button', { name: 'Добавить достижение' }).click();
            await page.getByLabel('Требуемый уровень:').fill('10');
            await page.getByLabel('Описание награды:').fill(achDesc);
            await page.getByRole('button', { name: 'Сохранить' }).click();
            const newAchItem = page.locator('.management-list li', { hasText: achDesc });
            await expect(newAchItem).toBeVisible();
            
            // Update
            await newAchItem.getByRole('button', { name: '✏️' }).click();
            await page.getByLabel('Требуемый уровень:').fill('20');
            await page.getByLabel('Описание награды:').fill(updatedAchDesc);
            await page.getByRole('button', { name: 'Сохранить' }).click();
            await expect(page.locator('.management-list li', { hasText: updatedAchDesc })).toBeVisible();

            // Delete
            page.on('dialog', dialog => dialog.accept());
            await page.locator('.management-list li', { hasText: updatedAchDesc }).getByRole('button', { name: '🗑️' }).click();
            await expect(page.locator('.management-list li', { hasText: updatedAchDesc })).not.toBeVisible();
        });
    });

    // --- Страница "Настройки" ---
    test.describe('Страница "Настройки"', () => {
        test('должен изменять тему и время сброса дейликов', async ({ page }) => {
            await page.getByRole('link', { name: 'Настройки' }).click();
            await expect(page).toHaveURL('/settings');

            // --- Смена темы ---
            const themeSelect = page.getByLabel('Тема:');
            const body = page.locator('body');

            await themeSelect.selectOption('light');
            await expect(body).toHaveAttribute('data-theme', 'light');

            await themeSelect.selectOption('dark');
            await expect(body).toHaveAttribute('data-theme', 'dark');

            // --- Смена времени сброса ---
            const timeSelect = page.getByLabel('Время обновления (местное):');
            await timeSelect.selectOption({ label: '05:00' });
            await page.getByRole('button', { name: 'Сохранить изменения' }).click();

            await expect(page.getByText('Настройки успешно сохранены!')).toBeVisible();
            await page.reload();
            await expect(timeSelect).toHaveValue('5');
        });
    });
});
