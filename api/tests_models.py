from django.test import TestCase
from django.contrib.auth.models import User
from .models import Character, Skill

class ModelXPTests(TestCase):
    """
    Тесты для методов `add_xp` в моделях Character и Skill.
    """
    def setUp(self):
        """
        Создаем базовые объекты для каждого теста: User, Character, Skill.
        """
        self.user = User.objects.create_user(username='model_tester')
        self.character = Character.objects.create(user=self.user, name='Тестовый Персонаж')
        self.skill = Skill.objects.create(character=self.character, name='Тестовый Навык')

    # --- Тесты для Character.add_xp ---

    def test_character_add_xp_no_level_up(self):
        """
        Проверяет простое добавление опыта персонажу без повышения уровня.
        """
        initial_xp = self.character.current_xp
        initial_level = self.character.level
        
        leveled_up = self.character.add_xp(50)

        self.assertFalse(leveled_up, "Персонаж не должен был повысить уровень.")
        self.assertEqual(self.character.current_xp, initial_xp + 50)
        self.assertEqual(self.character.level, initial_level, "Уровень не должен был измениться.")

    def test_character_add_xp_single_level_up(self):
        """
        Проверяет повышение персонажем одного уровня при добавлении опыта.
        """
        # Устанавливаем персонажа в состояние "почти левел-ап"
        self.character.current_xp = 90
        self.character.xp_to_next_level = 100
        
        leveled_up = self.character.add_xp(20) # Общий опыт станет 110/100

        self.assertTrue(leveled_up, "Персонаж должен был повысить уровень.")
        self.assertEqual(self.character.level, 2, "Уровень персонажа должен стать 2.")
        self.assertEqual(self.character.current_xp, 10, "Остаток опыта должен быть 10.")
        # Проверяем, что планка опыта для следующего уровня обновилась
        # Формула для 2-го уровня: lvl * 120 = 240
        self.assertEqual(self.character.xp_to_next_level, 240)

    def test_character_add_xp_multiple_level_ups(self):
        """
        Проверяет повышение персонажем нескольких уровней за одно добавление опыта.
        """
        # Добавляем 1000 опыта
        leveled_up = self.character.add_xp(1000)

        # Расчет:
        # 1 -> 2: стоит 100. Остаток 900.
        # 2 -> 3: стоит 240. Остаток 660.
        # 3 -> 4: стоит 360. Остаток 300.
        # 4 -> 5: стоит round(100 * 4**1.5) = 800. Не хватает.
        # Итог: Уровень 4, 300 опыта.

        self.assertTrue(leveled_up)
        self.assertEqual(self.character.level, 4, "Персонаж должен был достичь 4 уровня.")
        self.assertEqual(self.character.current_xp, 300, "Остаток опыта должен быть 300.")
        self.assertEqual(self.character.xp_to_next_level, 800)

    def test_character_add_xp_negative_amount(self):
        """
        Проверяет, что при добавлении отрицательного опыта, он не уходит ниже нуля.
        """
        self.character.current_xp = 50
        leveled_up = self.character.add_xp(-200)

        self.assertFalse(leveled_up)
        self.assertEqual(self.character.current_xp, 0, "Опыт не должен быть отрицательным.")
        self.assertEqual(self.character.level, 1, "Уровень не должен был измениться.")


    # --- Тесты для Skill.add_xp ---

    def test_skill_add_xp_no_level_up(self):
        """
        Проверяет простое добавление опыта навыку без повышения уровня.
        """
        initial_xp = self.skill.current_xp
        initial_level = self.skill.level

        leveled_up = self.skill.add_xp(50)

        self.assertFalse(leveled_up, "Навык не должен был повысить уровень.")
        self.assertEqual(self.skill.current_xp, initial_xp + 50)
        self.assertEqual(self.skill.level, initial_level, "Уровень не должен был измениться.")

    def test_skill_add_xp_single_level_up(self):
        """
        Проверяет повышение навыком одного уровня при добавлении опыта.
        """
        self.skill.current_xp = 90
        self.skill.xp_to_next_level = 100
        
        leveled_up = self.skill.add_xp(20) # Общий опыт станет 110/100

        self.assertTrue(leveled_up, "Навык должен был повысить уровень.")
        self.assertEqual(self.skill.level, 2, "Уровень навыка должен стать 2.")
        self.assertEqual(self.skill.current_xp, 10, "Остаток опыта должен быть 10.")
        # Формула для 2-го уровня: 100 * lvl = 200
        self.assertEqual(self.skill.xp_to_next_level, 200)

    def test_skill_add_xp_multiple_level_ups(self):
        """
        Проверяет повышение навыком нескольких уровней за одно добавление опыта.
        """
        leveled_up = self.skill.add_xp(550)

        # Расчет:
        # 1 -> 2: стоит 100. Остаток 450.
        # 2 -> 3: стоит 200. Остаток 250.
        # 3 -> 4: стоит 300. Не хватает.
        # Итог: Уровень 3, 250 опыта.

        self.assertTrue(leveled_up)
        self.assertEqual(self.skill.level, 3, "Навык должен был достичь 3 уровня.")
        self.assertEqual(self.skill.current_xp, 250, "Остаток опыта должен быть 250.")
        self.assertEqual(self.skill.xp_to_next_level, 300)

    def test_skill_add_xp_negative_amount(self):
        """
        Проверяет, что при добавлении отрицательного опыта, он не уходит ниже нуля.
        """
        self.skill.current_xp = 50
        leveled_up = self.skill.add_xp(-200)

        self.assertFalse(leveled_up)
        self.assertEqual(self.skill.current_xp, 0, "Опыт не должен быть отрицательным.")
        self.assertEqual(self.skill.level, 1, "Уровень не должен был измениться.")

    def test_character_delevel_on_negative_xp(self):
        """
        Проверяет, что персонаж теряет уровень, если опыт уходит в минус.
        """
        # Устанавливаем персонажа: Уровень 2, 50/240 XP
        self.character.level = 2
        self.character.current_xp = 50
        self.character.xp_to_next_level = self.character._get_xp_for_level(2) # 240
        self.character.save()

        leveled_up = self.character.add_xp(-100)
        self.character.save()
        self.character.refresh_from_db()

        self.assertFalse(leveled_up)
        self.assertEqual(self.character.level, 1, "Персонаж должен был откатиться на 1-й уровень.")
        self.assertEqual(self.character.current_xp, 50, "Опыт должен был стать 50/100.")
        self.assertEqual(self.character.xp_to_next_level, 100, "Планка опыта должна была сброситься до 100 для 1-го уровня.")

    def test_character_multiple_delevels(self):
        """
        Проверяет откат на несколько уровней за раз.
        """
        # Устанавливаем персонажа: Уровень 4, 10/800 XP
        self.character.level = 4
        self.character.current_xp = 10
        self.character.xp_to_next_level = 800
        self.character.save()
        
        leveled_up = self.character.add_xp(-705)
        self.character.save()
        self.character.refresh_from_db()

        self.assertFalse(leveled_up)
        self.assertEqual(self.character.level, 1)
        self.assertEqual(self.character.current_xp, 5)
        self.assertEqual(self.character.xp_to_next_level, 100)

    def test_character_delevel_stops_at_level_1(self):
        """
        Проверяет, что опыт не уходит в минус на 1-м уровне, а сбрасывается в 0.
        """
        self.character.current_xp = 20
        self.character.save()
        
        leveled_up = self.character.add_xp(-1000)
        self.character.save()
        self.character.refresh_from_db()

        self.assertFalse(leveled_up)
        self.assertEqual(self.character.level, 1, "Уровень не должен быть ниже 1.")
        self.assertEqual(self.character.current_xp, 0, "Опыт должен сброситься в 0, а не стать отрицательным.")


    # --- Новые тесты для Skill ---

    def test_skill_delevel_on_negative_xp(self):
        """
        Проверяет, что навык теряет уровень, если опыт уходит в минус.
        """
        # Устанавливаем навык: Уровень 3, 50/300 XP
        self.skill.level = 3
        self.skill.current_xp = 50
        self.skill.xp_to_next_level = self.skill._get_xp_for_level(3) # 300
        self.skill.save()
        
        leveled_up = self.skill.add_xp(-100)
        self.skill.save()
        self.skill.refresh_from_db()
        
        self.assertFalse(leveled_up)
        self.assertEqual(self.skill.level, 2, "Навык должен был откатиться на 2-й уровень.")
        self.assertEqual(self.skill.current_xp, 150, "Опыт должен был стать 150/200.")
        self.assertEqual(self.skill.xp_to_next_level, 200, "Планка опыта должна была сброситься до 200 для 2-го уровня.")

    def test_skill_multiple_delevels(self):
        """
        Проверяет откат навыка на несколько уровней за раз.
        """
        # Устанавливаем навык: Уровень 4, 10/400 XP
        self.skill.level = 4
        self.skill.current_xp = 10
        self.skill.xp_to_next_level = 400
        self.skill.save()
        
        leveled_up = self.skill.add_xp(-605)
        self.skill.save()
        self.skill.refresh_from_db()

        self.assertFalse(leveled_up)
        self.assertEqual(self.skill.level, 1)
        self.assertEqual(self.skill.current_xp, 5)
        self.assertEqual(self.skill.xp_to_next_level, 100)

    def test_skill_delevel_stops_at_level_1(self):
        """
        Проверяет, что опыт навыка не уходит в минус на 1-м уровне.
        """
        self.skill.current_xp = 20
        self.skill.save()
        
        leveled_up = self.skill.add_xp(-1000)
        self.skill.save()
        self.skill.refresh_from_db()

        self.assertFalse(leveled_up)
        self.assertEqual(self.skill.level, 1, "Уровень навыка не должен быть ниже 1.")
        self.assertEqual(self.skill.current_xp, 0, "Опыт навыка должен сброситься в 0.")
