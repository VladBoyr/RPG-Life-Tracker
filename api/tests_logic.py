from django.test import TestCase
from django.contrib.auth.models import User
from decimal import Decimal
from unittest.mock import patch
from .models import User, LootItem, LootRarity
from .logic import recalculate_loot_chances, get_weighted_random_award

class LogicTests(TestCase):
    """
    Юнит-тесты для бизнес-логики в api/logic.py
    """
    def setUp(self):
        """
        Создаем пользователя, который будет владельцем предметов в тестах.
        """
        self.user = User.objects.create_user(username='logic_user', password='password')

    def test_recalculate_with_one_item(self):
        item = LootItem.objects.create(owner=self.user, name='Only One', rarity=LootRarity.COMMON, base_chance=Decimal('50.00'))
        recalculate_loot_chances(self.user)
        item.refresh_from_db()
        self.assertEqual(item.base_chance, Decimal('100.00'))

    def test_recalculate_with_zero_sum_of_others(self):
        item1 = LootItem.objects.create(owner=self.user, name='Item 1', rarity=LootRarity.COMMON, base_chance=Decimal('0.00'))
        item2 = LootItem.objects.create(owner=self.user, name='Item 2', rarity=LootRarity.RARE, base_chance=Decimal('0.00'))
        recalculate_loot_chances(self.user)
        item1.refresh_from_db()
        item2.refresh_from_db()
        self.assertEqual(item1.base_chance, Decimal('50.00'))
        self.assertEqual(item2.base_chance, Decimal('50.00'))

    @patch('api.logic.random.uniform')
    def test_get_award_deterministic(self, mock_uniform):
        # Мокаем random, чтобы он вернул значение, которое точно выберет второй предмет
        mock_uniform.return_value = 15.0 
        
        item1 = LootItem.objects.create(owner=self.user, name='Common', rarity=LootRarity.COMMON, base_chance=Decimal('10.00'))
        item2 = LootItem.objects.create(owner=self.user, name='Rare', rarity=LootRarity.RARE, base_chance=Decimal('90.00'))
        
        won_item, _ = get_weighted_random_award([item1, item2], pity_counter=0)
        
        self.assertEqual(won_item.name, 'Rare')

    # --- Тесты для recalculate_loot_chances ---

    def test_recalculate_empty_list_does_nothing(self):
        """
        Проверяем, что функция не падает и ничего не делает, если у пользователя нет предметов.
        """
        self.assertEqual(LootItem.objects.filter(owner=self.user, received_date__isnull=True).count(), 0)
        recalculate_loot_chances(self.user)
        self.assertEqual(LootItem.objects.filter(owner=self.user, received_date__isnull=True).count(), 0)

    def test_recalculate_single_item_gets_100_percent(self):
        """
        Проверяем, что если у пользователя только один доступный предмет, его шанс становится 100%.
        """
        item = LootItem.objects.create(owner=self.user, name='The One', rarity=LootRarity.COMMON, base_chance=Decimal('50.00'))
        recalculate_loot_chances(self.user)
        item.refresh_from_db()
        self.assertEqual(item.base_chance, Decimal('100.00'))

    def test_recalculate_others_have_zero_chance_split_equally(self):
        """
        Проверяем ветку `else`, когда сумма шансов остальных предметов равна нулю.
        Оставшийся шанс должен разделиться поровну.
        """
        fixed_item = LootItem.objects.create(owner=self.user, name='Fixed', rarity=LootRarity.RARE, base_chance=Decimal('0.00'))
        other1 = LootItem.objects.create(owner=self.user, name='Other 1', rarity=LootRarity.COMMON, base_chance=Decimal('0.00'))
        other2 = LootItem.objects.create(owner=self.user, name='Other 2', rarity=LootRarity.COMMON, base_chance=Decimal('0.00'))

        recalculate_loot_chances(self.user, fixed_item=fixed_item, new_chance_for_fixed=Decimal('40.00'))

        fixed_item.refresh_from_db()
        other1.refresh_from_db()
        other2.refresh_from_db()

        self.assertEqual(fixed_item.base_chance, Decimal('40.00'))
        self.assertEqual(other1.base_chance, Decimal('30.00'))
        self.assertEqual(other2.base_chance, Decimal('30.00'))
    
    def test_recalculate_sum_is_always_100_after_rounding(self):
        """
        Проверяем, что финальная коррекция всегда доводит сумму шансов ровно до 100.
        """
        LootItem.objects.create(owner=self.user, name='Item 1', rarity=LootRarity.COMMON, base_chance=Decimal('33.33'))
        LootItem.objects.create(owner=self.user, name='Item 2', rarity=LootRarity.COMMON, base_chance=Decimal('33.33'))
        LootItem.objects.create(owner=self.user, name='Item 3', rarity=LootRarity.COMMON, base_chance=Decimal('33.33'))

        recalculate_loot_chances(self.user)
        
        items = LootItem.objects.filter(owner=self.user)
        total_chance = sum(item.base_chance for item in items)

        self.assertEqual(total_chance, Decimal('100.00'))

    # --- Тесты для get_weighted_random_award ---

    def test_get_award_empty_list_returns_none(self):
        """
        Проверяем, что функция корректно обрабатывает пустой список предметов.
        """
        won_item, new_pity = get_weighted_random_award([], pity_counter=0)
        self.assertIsNone(won_item)
        self.assertEqual(new_pity, 0)

    @patch('api.logic.random.uniform')
    def test_get_award_pity_bonus_increases_rare_chance(self, mock_uniform):
        """
        Проверяем, что pity_counter увеличивает шанс на выпадение редких предметов.
        """
        common = LootItem.objects.create(owner=self.user, name='Common', rarity=LootRarity.COMMON, base_chance=Decimal('90.00'))
        rare = LootItem.objects.create(owner=self.user, name='Rare', rarity=LootRarity.RARE, base_chance=Decimal('10.00'))
        available_items = [common, rare]
        
        mock_uniform.return_value = 95.0

        won_item, new_pity = get_weighted_random_award(available_items, pity_counter=100)
        
        self.assertEqual(won_item.name, 'Rare')
        self.assertEqual(new_pity, 0)

    @patch('api.logic.random.uniform')
    def test_get_award_no_non_common_items_pity_ignored(self, mock_uniform):
        """
        Проверяем, что pity_bonus не применяется, если нет не-обычных предметов.
        """
        common1 = LootItem.objects.create(owner=self.user, name='Common 1', rarity=LootRarity.COMMON, base_chance=Decimal('50.00'))
        common2 = LootItem.objects.create(owner=self.user, name='Common 2', rarity=LootRarity.COMMON, base_chance=Decimal('50.00'))
        available_items = [common1, common2]
        
        mock_uniform.return_value = 75.0

        won_item, new_pity = get_weighted_random_award(available_items, pity_counter=200)

        self.assertEqual(won_item.name, 'Common 2')
        self.assertEqual(new_pity, 201)

    @patch('api.logic.random.uniform')
    def test_get_award_deterministic_choice_with_mock(self, mock_uniform):
        """
        Проверяем базовый механизм взвешенного выбора с помощью мока random.
        """
        item_a = LootItem.objects.create(owner=self.user, name='A', rarity=LootRarity.COMMON, base_chance=Decimal('20.00'))
        item_b = LootItem.objects.create(owner=self.user, name='B', rarity=LootRarity.RARE, base_chance=Decimal('80.00'))
        available_items = [item_a, item_b]
        
        # Тест 1: Выбираем A
        mock_uniform.return_value = 15.0
        won_item, _ = get_weighted_random_award(available_items, pity_counter=0)
        self.assertEqual(won_item.name, 'A')

        # Тест 2: Выбираем B
        mock_uniform.return_value = 75.0
        won_item, _ = get_weighted_random_award(available_items, pity_counter=0)
        self.assertEqual(won_item.name, 'B')
