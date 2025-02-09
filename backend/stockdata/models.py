from django.db import models

class StockData(models.Model):
    timestamp = models.DateTimeField(unique=True)
    open_price = models.FloatField()
    high_price = models.FloatField()
    low_price = models.FloatField()
    close_price = models.FloatField()
    volume = models.BigIntegerField()
    dividends = models.FloatField(default=0)
    stock_splits = models.FloatField(default=0)
    pct_change = models.FloatField(default=0.0)  # Percentage change for the close price
    
    # Additional fields for the new algorithm
    free_cash_flow = models.FloatField(default=0.0)  # Yearly Free Cash Flow
    eps = models.FloatField(default=0.0)             # Earnings per Share (EPS)
    market_cap = models.FloatField(default=0.0)        # Market Capitalization = Volume * Close
    pe = models.FloatField(default=0.0)                # Price-to-Earnings Ratio = Close / EPS

    def __str__(self):
        return f"{self.timestamp} - Close: {self.close_price}"