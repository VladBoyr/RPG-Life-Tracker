from django.contrib import admin
from django.urls import path, include, re_path
from api.views import ReactAppView
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/', include('api.urls')),
    path('impersonate/', include('impersonate.urls')),
    re_path(r'^(?!api/|admin/).*$', ReactAppView.as_view(), name='react-app'),
]
