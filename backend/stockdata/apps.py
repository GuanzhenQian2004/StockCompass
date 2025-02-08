from django.apps import AppConfig
from django.conf import settings
import yfinance

class StockDataConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'stockdata'

    def ready(self):
        # Print settings from .env
        print("===== Django Settings Loaded from .env =====")
        print(f"STOCK_API_KEYS: {settings.STOCK_API_KEYS}")
        print(f"STOCK_API_BASE_URL: {settings.STOCK_API_BASE_URL}")
        print(f"STOCK_API_PERIOD: {settings.STOCK_API_PERIOD}")
        print(f"NEWS_API_KEYS: {settings.NEWS_API_KEYS}")
        print(f"NEWS_API_BASE_URL: {settings.NEWS_API_BASE_URL}")
        print("=============================================")