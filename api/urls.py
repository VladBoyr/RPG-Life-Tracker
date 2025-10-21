from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import *

router = DefaultRouter()
router.register(r'skills', SkillViewSet, basename='skill')
router.register(r'goals', GoalViewSet, basename='goal')
router.register(r'loot-items', LootItemViewSet, basename='lootitem')
router.register(r'notes', NoteViewSet, basename='note')
router.register(r'achievements', AchievementViewSet, basename='achievement')
router.register(r'rewards-history', ReceivedRewardViewSet, basename='rewardhistory')
router.register(r'groups', GroupViewSet, basename='group')
router.register(r'goals-history', GoalHistoryViewSet, basename='goalhistory')

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('impersonate/start/', ImpersonateStartView.as_view(), name='impersonate-start'),
    path('impersonate/stop/', ImpersonateStopView.as_view(), name='impersonate-stop'),
    path('character/', CharacterView.as_view(), name='character-detail'),
    path('lootbox/', LootboxAPIView.as_view(), name='lootbox-api'),
    path('users/', UserListView.as_view(), name='user-list'),
    path('users/search/', UserSearchView.as_view(), name='user-search'),
    path('get-csrf-token/', GetCSRFToken.as_view(), name='get-csrf-token'),
    path('', include(router.urls)),
]
