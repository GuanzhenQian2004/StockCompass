from django.urls import path
from .views import get_stock_data

urlpatterns = [
    path('', get_stock_data, name='stockdata_api'),
]