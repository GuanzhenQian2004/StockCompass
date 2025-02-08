# stockdata/urls.py
from django.urls import path
from .views import stock_data_api

urlpatterns = [
    path('api/stockdata/', stock_data_api, name='stock_data_api'),
]
