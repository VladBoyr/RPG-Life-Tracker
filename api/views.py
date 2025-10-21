import os
import pytz
from datetime import timedelta
from django.conf import settings
from django.contrib.auth.models import User
from django.db import models
from django.db.models import Q, Case, When, Value, IntegerField
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_exempt
from django.views.generic import View
from impersonate.views import impersonate as impersonate_view
from impersonate.views import stop_impersonate as stop_impersonate_view
from rest_framework import viewsets, status, generics, permissions
from rest_framework.authentication import SessionAuthentication
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.tokens import RefreshToken
from .models import *
from .serializers import *
from .logic import recalculate_loot_chances, get_weighted_random_award
from .utils import get_user_current_date

def check_for_achievements(character, skill=None):
    newly_claimed_rewards = []
    
    char_achievements = character.achievements.filter(claimed_date__isnull=True, required_level__lte=character.level)
    for ach in char_achievements:
        ach.claimed_date = timezone.now()
        ach.save()
        reward = ReceivedReward.objects.create(
            owner=character.user,
            description=f'Ур. {ach.required_level}: {ach.description}',
            source_name='Уровень персонажа',
            received_date=ach.claimed_date
        )
        newly_claimed_rewards.append(reward)

    if skill:
        skill_achievements = skill.achievements.filter(claimed_date__isnull=True, required_level__lte=skill.level)
        for ach in skill_achievements:
            ach.claimed_date = timezone.now()
            ach.save()
            reward = ReceivedReward.objects.create(
                owner=character.user,
                description=f'Ур. {ach.required_level}: {ach.description}',
                source_name=f'Навык: {skill.name}',
                received_date=ach.claimed_date
            )
            newly_claimed_rewards.append(reward)

    return newly_claimed_rewards

class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_staff

class GroupViewSet(viewsets.ModelViewSet):
    serializer_class = GroupSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        return Group.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        group_data = self.get_serializer(instance).data
        
        group_skills = Skill.objects.filter(group=instance).order_by('id')
        skills_data = SkillSerializer(group_skills, many=True, context={'request': request}).data
        
        group_data['skills'] = skills_data
        
        return Response(group_data)

class UserSearchView(generics.ListAPIView):
    serializer_class = UserSearchSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        query = self.request.query_params.get('search', '').strip()
        exclude_ids_str = self.request.query_params.get('exclude_ids', '')

        exclude_ids = []
        if exclude_ids_str:
            try:
                exclude_ids = [int(i) for i in exclude_ids_str.split(',')]
            except (ValueError, TypeError):
                pass

        queryset = User.objects.exclude(id=self.request.user.id).exclude(id__in=exclude_ids)

        if query:
            queryset = queryset.filter(
                Q(username__icontains=query) | Q(character__name__icontains=query)
            )
            queryset = queryset.annotate(
                relevance=Case(
                    When(Q(username__istartswith=query) | Q(character__name__istartswith=query), then=Value(1)),
                    default=Value(2),
                    output_field=IntegerField(),
                )
            ).order_by('relevance', 'id')
        else:
            queryset = queryset.order_by('id')

        return queryset[:5]

class UserListView(generics.ListAPIView):
    serializer_class = UserSearchSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        return User.objects.exclude(id=self.request.user.id).order_by('id')

class CharacterView(generics.RetrieveUpdateAPIView):
    serializer_class = CharacterSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        character, created = Character.objects.get_or_create(user=self.request.user)
        return character

class SkillViewSet(viewsets.ModelViewSet):
    serializer_class = SkillSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        my_groups = user.group_memberships.all()
        return Skill.objects.filter(
            models.Q(character__user=user) | models.Q(group__in=my_groups) | models.Q(group__owner=user)
        ).distinct()

    def perform_create(self, serializer):
        character_id = self.request.data.get('character')
        group_id = self.request.data.get('group')

        if group_id:
            try:
                group = Group.objects.get(id=group_id, owner=self.request.user)
                serializer.save(group=group, character=None)
            except Group.DoesNotExist:
                raise serializers.ValidationError("Группа не найдена или не принадлежит вам.")
        elif character_id:
            try:
                character = Character.objects.get(id=character_id, user=self.request.user)
                serializer.save(character=character, group=None)
            except Character.DoesNotExist:
                raise serializers.ValidationError("Персонаж не найден или не принадлежит вам.")
        else:
            raise serializers.ValidationError("Необходимо указать либо 'character', либо 'group'.")

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        character_data = CharacterSerializer(request.user.character, context={'request': request}).data
        return Response(character_data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        character_data = CharacterSerializer(request.user.character, context={'request': request}).data
        return Response(character_data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)

        character_data = CharacterSerializer(request.user.character, context={'request': request}).data
        return Response(character_data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def add_progress(self, request, pk=None):
        skill = self.get_object()
        character = request.user.character
        try:
            units = int(request.data.get('units', 1))
            if units <= 0:
                raise ValueError
        except (ValueError, TypeError):
            return Response({'error': 'Количество "units" должно быть положительным числом.'}, status=status.HTTP_400_BAD_REQUEST)

        xp_to_add = skill.xp_per_unit * units
        
        skill_leveled_up = skill.add_xp(xp_to_add)
        character.add_xp(xp_to_add)
        
        skill.save()
        character.save()

        new_rewards = check_for_achievements(character, skill if skill_leveled_up else None)

        GoalHistory.objects.create(
            owner=request.user,
            goal_description=f"{units} ед. прогресса", 
            skill_name=skill.name,
            skill_id=skill.id,
            xp_amount=xp_to_add,
            action=GoalHistoryAction.PROGRESS_ADDED
        )

        skill_data = SkillSerializer(skill, context={'request': request}).data
        character_data = CharacterSerializer(character, context={'request': request}).data

        return Response({
            'message': f'{units} ед. прогресса добавлено.',
            'skill': skill_data,
            'character': character_data,
            'new_rewards': ReceivedRewardSerializer(new_rewards, many=True).data
        }, status=status.HTTP_200_OK)

class GoalViewSet(viewsets.ModelViewSet):
    serializer_class = GoalSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        my_groups = user.group_memberships.all()
        owned_groups = user.owned_groups.all()
        
        return Goal.objects.filter(
            Q(skill__character__user=user) | 
            (Q(skill__group__in=my_groups) & Q(owner=user)) |
            (Q(skill__group__in=my_groups) & Q(owner__isnull=True)) |
            (Q(skill__group__in=owned_groups) & Q(owner__isnull=True))
        ).distinct()
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def get_response_data(self, goal):
        skill = goal.skill
        character = self.request.user.character
        return Response({
            'skill': SkillSerializer(skill, context={'request': self.request}).data,
            'character': CharacterSerializer(character, context={'request': self.request}).data,
        })

    def perform_create(self, serializer):
        skill_id = self.request.data.get('skill')
        user = self.request.user

        skill = Skill.objects.filter(
            Q(pk=skill_id) & (
                Q(character__user=user) |
                Q(group__members=user) |
                Q(group__owner=user)
            )
        ).distinct().first()
           
        if not skill:
            raise serializers.ValidationError("Указанный навык не найден или у вас нет к нему доступа.")

        goal_owner = None
        if skill.character:
            goal_owner = user
        elif skill.group:
            if skill.group.owner != user:
                goal_owner = user

        serializer.save(skill=skill, owner=goal_owner)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        character_data = CharacterSerializer(request.user.character, context={'request': request}).data
        return Response(character_data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return self.get_response_data(instance)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        skill = instance.skill
        self.perform_destroy(instance)
        return self.get_response_data(Goal(skill=skill))

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        original_goal = self.get_object()

        original_goal.pk = None
        original_goal.id = None
        original_goal.save()

        return self.get_response_data(original_goal)

    @action(detail=True, methods=['post'])
    def toggle_complete(self, request, pk=None):
        goal = self.get_object()
        skill = goal.skill
        character = request.user.character

        xp_amount = 0
        completion_record = None
        action_to_log = None

        if goal.goal_type == GoalType.DAILY:
            tz_str = request.headers.get('X-Timezone', 'UTC')
            user_today = get_user_current_date(request.user, tz_str)
            completion_record = GoalCompletion.objects.filter(
                goal=goal, 
                owner=request.user, 
                completion_date=user_today
            ).first()

            if completion_record:
                completion_record.delete()
                xp_amount = -goal.xp_reward
                action_to_log = GoalHistoryAction.REVERTED
            else:
                GoalCompletion.objects.create(
                    goal=goal,
                    owner=request.user,
                    completion_date=user_today
                )
                xp_amount = goal.xp_reward
                action_to_log = GoalHistoryAction.COMPLETED
        else:
            completion_record = GoalCompletion.objects.filter(
                goal=goal, 
                owner=request.user
            ).first()

            if completion_record:
                completion_record.delete()
                xp_amount = -goal.xp_reward
                action_to_log = GoalHistoryAction.REVERTED
            else:
                tz_str = request.headers.get('X-Timezone', 'UTC')
                user_today = get_user_current_date(request.user, tz_str)

                GoalCompletion.objects.create(
                    goal=goal,
                    owner=request.user,
                    completion_date=user_today
                )
                xp_amount = goal.xp_reward
                action_to_log = GoalHistoryAction.COMPLETED

        if xp_amount != 0:
            skill_leveled_up = skill.add_xp(xp_amount)
            character.add_xp(xp_amount)
            skill.save()
            character.save()
            new_rewards = check_for_achievements(character, skill if skill_leveled_up else None)
            GoalHistory.objects.create(
                owner=request.user,
                goal_description=goal.description,
                skill_name=skill.name,
                skill_id=skill.id,
                xp_amount=abs(goal.xp_reward),
                action=action_to_log,
                goal_type=goal.goal_type
            )
        else:
            new_rewards = []

        return Response({
            'skill': SkillSerializer(skill, context={'request': request}).data,
            'character': CharacterSerializer(character, context={'request': request}).data,
            'new_rewards': ReceivedRewardSerializer(new_rewards, many=True).data
        }, status=status.HTTP_200_OK)

class GoalHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = GoalHistorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = GoalHistory.objects.filter(owner=self.request.user)
        skill_id = self.request.query_params.get('skill_id', None)
        if skill_id:
            queryset = queryset.filter(skill_id=skill_id)
        return queryset

class LootItemViewSet(viewsets.ModelViewSet):
    serializer_class = LootItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return LootItem.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        instance = serializer.save(owner=self.request.user)
        recalculate_loot_chances(self.request.user, fixed_item=instance, new_chance_for_fixed=instance.base_chance)

    def perform_update(self, serializer):
        instance = serializer.save()
        recalculate_loot_chances(self.request.user, fixed_item=instance, new_chance_for_fixed=instance.base_chance)

    def perform_destroy(self, instance):
        instance.delete()
        recalculate_loot_chances(self.request.user)

class LootboxAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        character = request.user.character
        tz_str = request.headers.get('X-Timezone', 'UTC')
        user_today = get_user_current_date(request.user, tz_str)

        completed_dailies = GoalCompletion.objects.filter(
            owner=request.user,
            completion_date=user_today,
            goal__goal_type=GoalType.DAILY
        ).count()
        
        can_open = (completed_dailies >= 3 and character.last_lootbox_date != user_today and LootItem.objects.filter(owner=request.user, received_date__isnull=True).exists())
        return Response({'completed_dailies': completed_dailies,'required_dailies': 3,'can_open': can_open,'is_opened_today': character.last_lootbox_date == user_today})

    def post(self, request, *args, **kwargs):
        character = request.user.character
        tz_str = request.headers.get('X-Timezone', 'UTC')
        user_today = get_user_current_date(request.user, tz_str)
        
        status_data = self.get(request).data
        if not status_data['can_open']:
            return Response({'error': 'Лутбокс нельзя открыть.'}, status=status.HTTP_400_BAD_REQUEST)
            
        available_items = list(LootItem.objects.filter(owner=request.user, received_date__isnull=True))
        
        won_item, new_pity_counter = get_weighted_random_award(available_items, character.pity_counter)
        
        if won_item:
            won_item.received_date = timezone.now()
            won_item.save()
            
            character.last_lootbox_date = user_today
            character.pity_counter = new_pity_counter
            character.save()
            ReceivedReward.objects.create(owner=request.user,description=won_item.name,source_name='Лутбокс',received_date=won_item.received_date,rarity=won_item.rarity)
            recalculate_loot_chances(request.user)
            
            return Response({
                'won_item': LootItemSerializer(won_item).data,
                'character': CharacterSerializer(character, context={'request': request}).data
            }, status=status.HTTP_200_OK)
        
        return Response({'error': 'Нет доступных наград.'}, status=status.HTTP_404_NOT_FOUND)

class NoteViewSet(viewsets.ModelViewSet):
    serializer_class = NoteSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        return Note.objects.filter(skill__character__user=user)

    def get_response_data(self, skill):
        return Response({
            'skill': SkillSerializer(skill, context={'request': self.request}).data
        })

    def perform_create(self, serializer):
        skill_id = self.request.data.get('skill')
        try:
            skill = Skill.objects.get(id=skill_id, character__user=self.request.user)
            serializer.save(skill=skill)
        except Skill.DoesNotExist:
            raise serializers.ValidationError("Указанный навык не найден или не принадлежит вам.")
            
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return self.get_response_data(serializer.instance.skill)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=kwargs.pop('partial', False))
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return self.get_response_data(instance.skill)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        skill = instance.skill
        self.perform_destroy(instance)
        skill.refresh_from_db()
        return self.get_response_data(skill)

class AchievementViewSet(viewsets.ModelViewSet):
    serializer_class = AchievementSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self):
        user = self.request.user
        return Achievement.objects.filter(models.Q(owner_character__user=user) | models.Q(owner_skill__character__user=user))

class ReceivedRewardViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ReceivedRewardSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self):
        return ReceivedReward.objects.filter(owner=self.request.user)

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    authentication_classes = ()
    serializer_class = RegisterSerializer

class ImpersonateStartView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, *args, **kwargs):
        user_id_to_impersonate = request.data.get('user_id')
        if not user_id_to_impersonate:
            return Response({'error': 'user_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            target_user = User.objects.get(pk=user_id_to_impersonate)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        target_refresh = RefreshToken.for_user(target_user)

        original_admin_refresh = RefreshToken.for_user(request.user)

        return Response({
            'access': str(target_refresh.access_token),
            'refresh': str(target_refresh),
            'impersonate_exit_token': str(original_admin_refresh),
        })

class ImpersonateStopView(APIView):
    permission_classes = [] 
    authentication_classes = []

    def post(self, request, *args, **kwargs):
        exit_token = request.data.get('impersonate_exit_token')
        if not exit_token:
            return Response({'error': 'impersonate_exit_token is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            refresh = RefreshToken(exit_token)
            admin_user_id = refresh.payload['user_id']
            admin_user = User.objects.get(id=admin_user_id)

            if not admin_user.is_staff:
                return Response({'error': 'User is not an admin.'}, status=status.HTTP_403_FORBIDDEN)

            new_refresh = RefreshToken.for_user(admin_user)

            return Response({
                'access': str(new_refresh.access_token),
                'refresh': str(new_refresh),
            })

        except Exception as e:
            return Response({'error': 'Invalid or expired exit token.', 'detail': str(e)}, status=status.HTTP_401_UNAUTHORIZED)

@method_decorator(ensure_csrf_cookie, name='dispatch')
class GetCSRFToken(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = ()

    def get(self, request, *args, **kwargs):
        return Response({'success': 'CSRF cookie set'})

class ReactAppView(View):
    def get(self, request):
        try:
            with open(os.path.join(settings.BASE_DIR, 'build', 'static', 'index.html')) as file:
                return HttpResponse(file.read())
        except FileNotFoundError:
            return HttpResponse(
                """
                index.html not found ! build your React app !!
                """,
                status=501,
            )
