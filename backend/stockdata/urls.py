# stockdata/urls.py
from django.urls import path
from .views import stock_data_api, unusual_ranges_api

urlpatterns = [
    path('api/stockdata/', stock_data_api, name='stock_data_api'),
    path('api/unusual_range/', unusual_ranges_api, name='unusual_range_api')
]
