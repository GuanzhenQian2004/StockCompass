from django.urls import path
from .views import get_news_data

urlpatterns = [
    path('', get_news_data, name='newsdata_api'),
]