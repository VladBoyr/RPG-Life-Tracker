from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from api.models import Character, Skill, Goal, LootItem, LootRarity
from api.logic import recalculate_loot_chances
from decimal import Decimal

class Command(BaseCommand):
    help = 'Creates a clean test user for E2E testing. Usage: manage.py create_test_user <username>'

    def add_arguments(self, parser):
        parser.add_argument('username', type=str, help='The username for the test user')

    def handle(self, *args, **options):
        username = options['username']
        password = 'password123'
        character_name = f'Тестер_{username.split("_")[-1]}'

        try:
            old_user = User.objects.get(username=username)
            self.stdout.write(f'Deleting old test user "{username}"...')
            old_user.delete()
        except User.DoesNotExist:
            pass

        self.stdout.write(f'Creating new test user "{username}"...')
        
        user = User.objects.create_user(username=username, password=password)
        
        character = Character.objects.create(user=user, name=character_name)

        Skill.objects.create(character=character, name='Тестирование E2E', unit_description='тест', xp_per_unit=15)
        
        LootItem.objects.create(owner=user, name='Тестовый Common', rarity=LootRarity.COMMON, base_chance=Decimal('70.00'))
        LootItem.objects.create(owner=user, name='Тестовый Rare', rarity=LootRarity.RARE, base_chance=Decimal('20.00'))
        LootItem.objects.create(owner=user, name='Тестовый Legendary', rarity=LootRarity.LEGENDARY, base_chance=Decimal('10.00'))
        recalculate_loot_chances(user)

        self.stdout.write(self.style.SUCCESS(
            f'Successfully created test user.\nUsername: {username}\nPassword: {password}'
        ))
