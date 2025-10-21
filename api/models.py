import datetime
import math
from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator
from django.utils import timezone

class GoalType(models.TextChoices):
    DAILY = 'DAILY', 'Ежедневная'
    BLUE = 'BLUE', 'Краткосрочная'
    YELLOW = 'YELLOW', 'Среднесрочная'
    RED = 'RED', 'Долгосрочная'

class LootRarity(models.TextChoices):
    COMMON = 'COMMON', 'Обычный'
    UNCOMMON = 'UNCOMMON', 'Необычный'
    RARE = 'RARE', 'Редкий'
    UNIQUE = 'UNIQUE', 'Уникальный'
    LEGENDARY = 'LEGENDARY', 'Легендарный'

class Group(models.Model):
    name = models.CharField(max_length=100, unique=True)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='owned_groups')
    members = models.ManyToManyField(User, related_name='group_memberships', blank=True)

    def __str__(self):
        return self.name

class Character(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='character')
    name = models.CharField(max_length=100)
    level = models.IntegerField(default=1)
    current_xp = models.IntegerField(default=0)
    xp_to_next_level = models.IntegerField(default=100)
    pity_counter = models.IntegerField(default=0)
    last_lootbox_date = models.DateField(null=True, blank=True)
    daily_reset_time = models.TimeField(default=datetime.time(3, 0))

    def __str__(self):
        return self.name

    def _get_xp_for_level(self, lvl):
        if lvl == 1: return 100
        if lvl < 4: return lvl * 120
        return round(100 * (lvl ** 1.5))

    def add_xp(self, amount):
        leveled_up = False
        self.current_xp += amount
        
        if amount > 0:
            while self.current_xp >= self.xp_to_next_level:
                self.current_xp -= self.xp_to_next_level
                self.level += 1
                self.xp_to_next_level = self._get_xp_for_level(self.level)
                leveled_up = True
        elif amount < 0:
            while self.current_xp < 0:
                if self.level <= 1:
                    self.current_xp = 0
                    break

                self.level -= 1
                xp_of_previous_level = self._get_xp_for_level(self.level)
                self.current_xp += xp_of_previous_level
                self.xp_to_next_level = xp_of_previous_level

        if self.current_xp < 0:
            self.current_xp = 0

        return leveled_up

class Skill(models.Model):
    character = models.ForeignKey(Character, on_delete=models.CASCADE, related_name='skills', null=True, blank=True)
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='skills', null=True, blank=True)

    name = models.CharField(max_length=100)
    unit_description = models.CharField(max_length=100, default='ед. прогресса')
    xp_per_unit = models.IntegerField(default=10)
    level = models.IntegerField(default=1)
    current_xp = models.IntegerField(default=0)
    xp_to_next_level = models.IntegerField(default=100)

    def __str__(self):
        return self.name
    
    def _get_xp_for_level(self, lvl):
        return 100 * lvl

    def add_xp(self, amount):
        leveled_up = False
        self.current_xp += amount

        if amount > 0:
            while self.current_xp >= self.xp_to_next_level:
                self.current_xp -= self.xp_to_next_level
                self.level += 1
                self.xp_to_next_level = self._get_xp_for_level(self.level)
                leveled_up = True
        elif amount < 0:
            while self.current_xp < 0:
                if self.level <= 1:
                    self.current_xp = 0
                    break

                self.level -= 1
                xp_of_previous_level = self._get_xp_for_level(self.level)
                self.current_xp += xp_of_previous_level
                self.xp_to_next_level = xp_of_previous_level

        if self.current_xp < 0:
            self.current_xp = 0

        return leveled_up

class Goal(models.Model):
    skill = models.ForeignKey(Skill, on_delete=models.CASCADE, related_name='goals')
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='personal_goals', null=True, blank=True)
    description = models.CharField(max_length=255)
    goal_type = models.CharField(max_length=10, choices=GoalType.choices, default=GoalType.DAILY)
    xp_reward = models.IntegerField(default=25, validators=[MinValueValidator(0)])

    class Meta:
        ordering = ['id']

    def __str__(self):
        return self.description

class GoalCompletion(models.Model):
    goal = models.ForeignKey(Goal, on_delete=models.CASCADE, related_name='completions')
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='goal_completions')
    completion_date = models.DateField()

    class Meta:
        unique_together = ('goal', 'owner', 'completion_date')

    def __str__(self):
        return f"{self.goal.description} completed on {self.completion_date} by {self.owner.username}"

class Achievement(models.Model):
    owner_skill = models.ForeignKey(Skill, on_delete=models.CASCADE, related_name='achievements', null=True, blank=True)
    owner_character = models.ForeignKey(Character, on_delete=models.CASCADE, related_name='achievements', null=True, blank=True)
    required_level = models.IntegerField()
    description = models.CharField(max_length=255)
    claimed_date = models.DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return f'Lvl {self.required_level}: {self.description}'

class Note(models.Model):
    skill = models.ForeignKey(Skill, on_delete=models.CASCADE, related_name='notes')
    text = models.TextField()
    date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.text[:50]

class LootItem(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='loot_items')
    name = models.CharField(max_length=100)
    rarity = models.CharField(max_length=10, choices=LootRarity.choices, default=LootRarity.COMMON)
    base_chance = models.DecimalField(max_digits=5, decimal_places=2)
    received_date = models.DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return f'{self.name} ({self.get_rarity_display()})'

class ReceivedReward(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_rewards')
    description = models.CharField(max_length=255)
    source_name = models.CharField(max_length=100)
    received_date = models.DateTimeField(default=timezone.now)
    rarity = models.CharField(max_length=10, choices=LootRarity.choices, null=True, blank=True)
    
    class Meta:
        ordering = ['-received_date']
        
    def __str__(self):
        return f'"{self.description}" from {self.source_name}'

class GoalHistoryAction(models.TextChoices):
    COMPLETED = 'COMPLETED', 'Выполнена'
    REVERTED = 'REVERTED', 'Отменена'
    PROGRESS_ADDED = 'PROGRESS_ADDED', 'Добавлен прогресс'

class GoalHistory(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='goal_history')
    goal_description = models.CharField(max_length=255)
    skill_name = models.CharField(max_length=100)
    skill_id = models.IntegerField(null=True, blank=True)
    xp_amount = models.IntegerField()
    goal_type = models.CharField(max_length=10, choices=GoalType.choices, null=True, blank=True)
    action = models.CharField(max_length=20, choices=GoalHistoryAction.choices)
    timestamp = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'Goal History Entry'
        verbose_name_plural = 'Goal History Entries'

    def __str__(self):
        return f'[{self.timestamp.strftime("%Y-%m-%d %H:%M")}] {self.owner.username} - {self.get_action_display()} "{self.goal_description}" ({self.xp_amount} XP)'
