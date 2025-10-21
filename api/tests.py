from django.contrib.auth.models import User
from django.urls import reverse
from django.utils import timezone
from django.db.models import Sum, Q
from decimal import Decimal
from datetime import date
from rest_framework.test import APITestCase
from rest_framework import status
from freezegun import freeze_time
from .models import Character, Skill, Goal, GoalType, GoalCompletion, LootItem, LootRarity, Achievement
from .utils import get_user_current_date

class APITests(APITestCase):
    def setUp(self):
        self.user1_data = {'username': 'testuser1', 'password': 'testpassword123'}
        self.user1 = User.objects.create_user(**self.user1_data)
        self.character1 = Character.objects.create(user=self.user1, name='Герой 1')
        self.skill1 = Skill.objects.create(character=self.character1, name='Тестовый навык', xp_per_unit=10)
        
        self.long_term_goal = Goal.objects.create(skill=self.skill1, description='Долгосрочная цель', goal_type=GoalType.YELLOW, xp_reward=100)
        
        self.daily_goal1 = Goal.objects.create(skill=self.skill1, description='Дейлик 1', goal_type=GoalType.DAILY, xp_reward=25)
        self.daily_goal2 = Goal.objects.create(skill=self.skill1, description='Дейлик 2', goal_type=GoalType.DAILY, xp_reward=25)
        self.daily_goal3 = Goal.objects.create(skill=self.skill1, description='Дейлик 3', goal_type=GoalType.DAILY, xp_reward=25)

        LootItem.objects.create(owner=self.user1, name='Тестовая награда', rarity=LootRarity.COMMON, base_chance='100.00')

        self.user2_data = {'username': 'testuser2', 'password': 'testpassword456'}
        self.user2 = User.objects.create_user(**self.user2_data)
        self.character2 = Character.objects.create(user=self.user2, name='Герой 2')
        self.skill2 = Skill.objects.create(character=self.character2, name='Чужой навык')

    def test_user_registration(self):
        url = reverse('register')
        data = {
            'username': 'newuser',
            'password': 'newpassword123',
            'password2': 'newpassword123',
            'character_name': 'Новичок'
        }

        response = self.client.post(url, data)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username='newuser').exists())
        self.assertTrue(Character.objects.filter(name='Новичок').exists())

    def test_goal_completion_awards_xp(self):
        self.client.force_authenticate(user=self.user1)
        initial_char_xp = self.character1.current_xp
        initial_skill_xp = self.skill1.current_xp
        url = reverse('goal-toggle-complete', kwargs={'pk': self.daily_goal1.id})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(GoalCompletion.objects.filter(goal=self.daily_goal1, owner=self.user1).exists())
        self.character1.refresh_from_db()
        self.skill1.refresh_from_db()
        self.assertEqual(self.character1.current_xp, initial_char_xp + self.daily_goal1.xp_reward)
        self.assertEqual(self.skill1.current_xp, initial_skill_xp + self.daily_goal1.xp_reward)

    def test_add_progress_awards_xp(self):
        self.client.force_authenticate(user=self.user1)
        initial_char_xp = self.character1.current_xp
        initial_skill_xp = self.skill1.current_xp
        url = reverse('skill-add-progress', kwargs={'pk': self.skill1.id})
        data = {'units': 2}
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.character1.refresh_from_db()
        self.skill1.refresh_from_db()
        expected_xp_gain = self.skill1.xp_per_unit * data['units']
        self.assertEqual(self.character1.current_xp, initial_char_xp + expected_xp_gain)
        self.assertEqual(self.skill1.current_xp, initial_skill_xp + expected_xp_gain)

    def test_user_cannot_access_other_user_data(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse('skill-detail', kwargs={'pk': self.skill2.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_lootbox_can_be_opened_after_completing_goals(self):
        self.client.force_authenticate(user=self.user1)
        lootbox_url = reverse('lootbox-api')
        headers = {'HTTP_X_TIMEZONE': 'Europe/Moscow'}
        response = self.client.get(lootbox_url, **headers)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['can_open'])
        self.client.post(reverse('goal-toggle-complete', kwargs={'pk': self.daily_goal1.id}), **headers)
        self.client.post(reverse('goal-toggle-complete', kwargs={'pk': self.daily_goal2.id}), **headers)
        self.client.post(reverse('goal-toggle-complete', kwargs={'pk': self.daily_goal3.id}), **headers)
        response = self.client.get(lootbox_url, **headers)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['can_open'])
        response = self.client.post(lootbox_url, **headers)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('won_item', response.data)
        self.assertIn('name', response.data['won_item'])
        self.character1.refresh_from_db()
        expected_date = get_user_current_date(self.user1, 'Europe/Moscow')
        self.assertEqual(self.character1.last_lootbox_date, expected_date)

    def test_user_registration_creates_all_defaults(self):
        """
        Проверяем, что при регистрации создается пользователь и все связанные
        с ним сущности по умолчанию (персонаж, навыки, ачивки, предметы).
        """
        url = reverse('register')
        data = {
            'username': 'newuser',
            'password': 'StrongPassword123!',
            'password2': 'StrongPassword123!',
            'character_name': 'Новичок'
        }
        response = self.client.post(url, data)

        # Проверяем успешный ответ
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Проверяем, что пользователь и персонаж созданы
        self.assertTrue(User.objects.filter(username='newuser').exists())
        new_user = User.objects.get(username='newuser')
        self.assertTrue(Character.objects.filter(user=new_user, name='Новичок').exists())

        # Проверяем создание стандартных навыков
        self.assertEqual(Skill.objects.filter(character__user=new_user).count(), 2)

        # Проверяем создание стандартных достижений (2 для навыков + 2 для персонажа)
        achievements_query = Achievement.objects.filter(
            Q(owner_character__user=new_user) | Q(owner_skill__character__user=new_user)
        )
        self.assertEqual(achievements_query.count(), 4)

        # Проверяем создание стандартных предметов для лутбокса
        self.assertEqual(LootItem.objects.filter(owner=new_user).count(), 5)
        
        # Проверяем, что шансы предметов были пересчитаны и в сумме дают 100
        total_chance = LootItem.objects.filter(owner=new_user).aggregate(Sum('base_chance'))['base_chance__sum']
        self.assertEqual(total_chance, Decimal('100.00'))

    def test_create_goal_with_invalid_data(self):
        """
        Проверяем, что API возвращает 400 Bad Request при попытке создать
        цель с невалидными данными (например, без описания).
        """
        self.client.force_authenticate(user=self.user1)
        url = reverse('goal-list')
        invalid_data = {
            'skill': self.skill1.id,
            'description': '',  # Пустое описание
            'xp_reward': -50,   # Невалидная награда
        }
        response = self.client.post(url, invalid_data)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # Проверяем, что в ответе есть сообщения об ошибках для конкретных полей
        self.assertIn('description', response.data)
        self.assertIn('xp_reward', response.data)

    @freeze_time("2024-05-21 12:00:00")
    def test_goal_serializer_is_completed_logic(self):
        """
        Проверяем логику поля `is_completed` в GoalSerializer для разных
        типов целей и дат выполнения.
        """
        self.client.force_authenticate(user=self.user1)
        url = reverse('skill-detail', kwargs={'pk': self.skill1.id})

        # --- Сценарий 1: Дейлик, выполненный СЕГОДНЯ ---
        GoalCompletion.objects.create(goal=self.daily_goal1, owner=self.user1, completion_date=date(2024, 5, 21))
        
        # --- Сценарий 2: Дейлик, выполненный ВЧЕРА ---
        GoalCompletion.objects.create(goal=self.daily_goal2, owner=self.user1, completion_date=date(2024, 5, 20))

        # --- Сценарий 3: Долгосрочная цель, выполненная когда-либо ---
        GoalCompletion.objects.create(goal=self.long_term_goal, owner=self.user1, completion_date=date(2024, 5, 1))

        # Получаем данные о навыке и его целях
        response = self.client.get(url, HTTP_X_TIMEZONE='UTC')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        goals_data = response.data['goals']
        
        # Преобразуем список в словарь для удобного доступа
        goals_map = {goal['id']: goal for goal in goals_data}

        # Проверки
        self.assertTrue(goals_map[self.daily_goal1.id]['is_completed'], "Дейлик, выполненный сегодня, должен быть отмечен как is_completed=True")
        self.assertFalse(goals_map[self.daily_goal2.id]['is_completed'], "Дейлик, выполненный вчера, должен быть отмечен как is_completed=False")
        self.assertTrue(goals_map[self.long_term_goal.id]['is_completed'], "Долгосрочная цель должна быть отмечена как is_completed=True")
        
        # Убедимся, что невыполненный дейлик отмечен как False
        self.assertFalse(goals_map[self.daily_goal3.id]['is_completed'], "Невыполненная цель должна быть is_completed=False")
