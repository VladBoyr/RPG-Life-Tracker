from django.test import TestCase
from django.contrib.auth.models import User
from datetime import date, time
from freezegun import freeze_time
from .models import Character
from .utils import get_user_current_date

class UtilsTests(TestCase):
    """
    Тесты для утилит в api/utils.py
    """
    def setUp(self):
        """
        Создаем пользователя и персонажа с временем сброса в 3:00.
        """
        self.user = User.objects.create_user(username='util_tester')
        # В модели Character время сброса по умолчанию 3:00,
        # поэтому мы просто создаем персонажа.
        self.character = Character.objects.create(user=self.user, name='Utils Tester')

    @freeze_time("2024-05-22 10:00:00") # Замораживаем время в 10:00 UTC
    def test_get_date_after_reset_returns_current_date(self):
        """
        Проверяем, что если локальное время пользователя ПОСЛЕ времени сброса (3:00),
        функция возвращает текущую дату.
        """
        # Сценарий 1: Europe/Moscow (UTC+3). 10:00 UTC -> 13:00 MSK. Это после 3:00.
        moscow_date = get_user_current_date(self.user, 'Europe/Moscow')
        self.assertEqual(moscow_date, date(2024, 5, 22))

        # Сценарий 2: UTC. 10:00 UTC. Это после 3:00.
        utc_date = get_user_current_date(self.user, 'UTC')
        self.assertEqual(utc_date, date(2024, 5, 22))

        # Сценарий 3: America/New_York (UTC-4). 10:00 UTC -> 06:00 EDT. Это после 3:00.
        ny_date = get_user_current_date(self.user, 'America/New_York')
        self.assertEqual(ny_date, date(2024, 5, 22))

    @freeze_time("2024-05-22 01:30:00") # Замораживаем время в 01:30 UTC
    def test_get_date_before_reset_returns_previous_date(self):
        """
        Проверяем, что если локальное время пользователя ДО времени сброса (3:00),
        функция возвращает ВЧЕРАШНЮЮ дату.
        """
        # Сценарий 1: Europe/Moscow (UTC+3). 01:30 UTC -> 04:30 MSK. Это ПОСЛЕ 3:00.
        # Этот случай проверяет, что логика зависит именно от локального времени.
        moscow_date = get_user_current_date(self.user, 'Europe/Moscow')
        self.assertEqual(moscow_date, date(2024, 5, 22), "В Москве уже наступил новый игровой день")

        # Сценарий 2: UTC. 01:30 UTC. Это ДО 3:00.
        # Игровой день еще не сменился.
        utc_date = get_user_current_date(self.user, 'UTC')
        self.assertEqual(utc_date, date(2024, 5, 21), "Для UTC еще длится предыдущий игровой день")

        # Сценарий 3: America/New_York (UTC-4). 01:30 UTC 22-го -> 21:30 EDT 21-го.
        # Это ПОСЛЕ 3:00, но предыдущего дня.
        ny_date = get_user_current_date(self.user, 'America/New_York')
        self.assertEqual(ny_date, date(2024, 5, 21), "В Нью-Йорке еще 21-е число")

    def test_get_date_with_custom_reset_time(self):
        """
        Проверяем, что функция корректно использует измененное время сброса.
        """
        # Устанавливаем время сброса на 22:00 (10 вечера)
        self.character.daily_reset_time = time(22, 0)
        self.character.save()

        # Сценарий 1: Время ДО нового времени сброса
        with freeze_time("2024-05-22 21:00:00"): # 9 вечера
            current_date = get_user_current_date(self.user, 'UTC')
            # Игровой день 22-го числа еще не закончился
            self.assertEqual(current_date, date(2024, 5, 21))

        # Сценарий 2: Время ПОСЛЕ нового времени сброса
        with freeze_time("2024-05-22 23:00:00"): # 11 вечера
            current_date = get_user_current_date(self.user, 'UTC')
            # Наступил новый игровой день
            self.assertEqual(current_date, date(2024, 5, 22))
