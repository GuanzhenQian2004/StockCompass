from django.db import models

class StockData(models.Model):
    timestamp = models.DateTimeField(unique=True)
    open_price = models.FloatField(null=True)
    high_price = models.FloatField(null=True)
    low_price = models.FloatField(null=True)
    close_price = models.FloatField(null=True)
    volume = models.BigIntegerField(null=True)
    dividends = models.FloatField(null=True)
    stock_splits = models.FloatField(null=True)
    pct_change = models.FloatField(null=True)  # Percentage change for the close price
    
    # Additional fields for the new algorithm
    free_cash_flow = models.FloatField(null=True)  # Yearly Free Cash Flow
    eps = models.FloatField(null=True)             # Earnings per Share (EPS)
    market_cap = models.FloatField(null=True)        # Market Capitalization = Volume * Close
    pe = models.FloatField(null=True)                # Price-to-Earnings Ratio = Close / EPS

    def __str__(self):
        return f"{self.timestamp} - Close: {self.close_price}"