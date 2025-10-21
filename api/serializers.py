from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Q
from rest_framework import serializers
from rest_framework.serializers import ValidationError
from .logic import recalculate_loot_chances
from .models import *
from .utils import get_user_current_date

class UserSearchSerializer(serializers.ModelSerializer):
    character_name = serializers.CharField(source='character.name', read_only=True, default='')

    class Meta:
        model = User
        fields = ['id', 'username', 'character_name']

class GroupMemberSerializer(serializers.ModelSerializer):
    character_name = serializers.CharField(source='character.name', read_only=True, default='')

    class Meta:
        model = User
        fields = ['id', 'username', 'character_name']

class GroupSerializer(serializers.ModelSerializer):
    members = GroupMemberSerializer(many=True, read_only=True)
    member_ids = serializers.ListField(
        child=serializers.IntegerField(), write_only=True, required=False
    )

    class Meta:
        model = Group
        fields = ['id', 'name', 'members', 'member_ids']

    def update(self, instance, validated_data):
        if 'member_ids' in validated_data:
            member_ids = validated_data.pop('member_ids')
            members = User.objects.filter(id__in=member_ids)
            instance.members.set(members)
        return super().update(instance, validated_data)

class NoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Note
        fields = ['id', 'text', 'date']

class GoalSerializer(serializers.ModelSerializer):
    is_completed = serializers.SerializerMethodField()
    owner = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Goal
        fields = ['id', 'description', 'goal_type', 'xp_reward', 'skill', 'is_completed', 'owner']

    def get_is_completed(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        
        user = request.user
        
        if obj.goal_type == GoalType.DAILY:
            tz_str = request.headers.get('X-Timezone', 'UTC')
            user_today = get_user_current_date(user, tz_str)
            return GoalCompletion.objects.filter(
                goal=obj, 
                owner=user, 
                completion_date=user_today
            ).exists()
        else:
            return GoalCompletion.objects.filter(
                goal=obj, 
                owner=user
            ).exists()

class GoalHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = GoalHistory
        fields = ['id', 'goal_description', 'skill_name', 'skill_id', 'xp_amount', 'action', 'timestamp', 'goal_type']

class AchievementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Achievement
        fields = ['id', 'required_level', 'description', 'claimed_date', 'owner_skill', 'owner_character']

class SkillSerializer(serializers.ModelSerializer):
    goals = serializers.SerializerMethodField()
    notes = NoteSerializer(many=True, read_only=True)
    achievements = AchievementSerializer(many=True, read_only=True)

    class Meta:
        model = Skill
        fields = [
            'id', 'name', 'unit_description', 'xp_per_unit', 
            'level', 'current_xp', 'xp_to_next_level', 
            'goals', 'notes', 'achievements',
            'character', 'group'
        ]
        extra_kwargs = {
            'character': {'required': False, 'allow_null': True},
            'group': {'required': False, 'allow_null': True},
        }
    
    def get_goals(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return []
        
        user = request.user
        
        queryset = obj.goals.filter(
            Q(owner__isnull=True) | Q(owner=user)
        ).distinct()
        
        return GoalSerializer(queryset, many=True, context=self.context).data

class CharacterSerializer(serializers.ModelSerializer):
    skills = serializers.SerializerMethodField()
    achievements = AchievementSerializer(many=True, read_only=True)
    is_staff = serializers.ReadOnlyField(source='user.is_staff') 

    class Meta:
        model = Character
        fields = [
            'id', 'name', 'level', 'current_xp', 'xp_to_next_level', 
            'pity_counter', 'last_lootbox_date', 'daily_reset_time', 
            'skills', 'achievements', 'is_staff'
        ]

    def get_skills(self, obj):
        user = obj.user
        
        queryset = Skill.objects.filter(
            Q(character=obj) |
            Q(group__members=user)
        ).distinct().order_by('id')

        return SkillSerializer(queryset, many=True, context=self.context).data

class LootItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = LootItem
        fields = ['id', 'name', 'rarity', 'base_chance', 'received_date']

class ReceivedRewardSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReceivedReward
        fields = ['id', 'description', 'source_name', 'received_date', 'rarity']

class RegisterSerializer(serializers.ModelSerializer):
    password2 = serializers.CharField(style={'input_type': 'password'}, write_only=True)
    character_name = serializers.CharField(write_only=True, required=True, max_length=100)

    class Meta:
        model = User
        fields = ['username', 'password', 'password2', 'email', 'character_name']
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise ValidationError({"password2": "Пароли не совпадают."})
        
        temp_user_for_validation = User(
            username=attrs.get('username'),
            email=attrs.get('email')
        )
        
        try:
            validate_password(attrs['password'], user=temp_user_for_validation)
        except DjangoValidationError as e:
            raise ValidationError({'password': list(e.messages)})

        return attrs

    def create(self, validated_data):
        user = User.objects.create(
            username=validated_data['username'],
            email=validated_data.get('email', '')
        )

        user.set_password(validated_data['password'])
        user.save()

        character = Character.objects.create(
            user=user, 
            name=validated_data['character_name']
        )

        skill1 = Skill.objects.create(character=character, name='Чтение книг', unit_description='1 страницу', xp_per_unit=10)
        Achievement.objects.create(owner_skill=skill1, required_level=10, description='Купить часы')

        skill2 = Skill.objects.create(character=character, name='Езда на премиум такси', unit_description='1 поездку', xp_per_unit=20)
        Achievement.objects.create(owner_skill=skill2, required_level=5, description='Купить дорогой парфюм')

        Achievement.objects.create(owner_character=character, required_level=5, description='Начало пути')
        Achievement.objects.create(owner_character=character, required_level=10, description='Опытный деятель')

        LootItem.objects.create(owner=user, name='Лимонад', rarity=LootRarity.COMMON, base_chance='69.45')
        LootItem.objects.create(owner=user, name='Мороженое', rarity=LootRarity.UNCOMMON, base_chance='19.65')
        LootItem.objects.create(owner=user, name='Покупка цацки', rarity=LootRarity.RARE, base_chance='5.20')
        LootItem.objects.create(owner=user, name='Luxury ресторан', rarity=LootRarity.UNIQUE, base_chance='4.05')
        LootItem.objects.create(owner=user, name='Часы', rarity=LootRarity.LEGENDARY, base_chance='1.65')
        
        recalculate_loot_chances(user)

        return user
