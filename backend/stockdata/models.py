from django.db import models

class StockData(models.Model):
    timestamp = models.DateTimeField(unique=True)
    open_price = models.FloatField(null=True)
    high_price = models.FloatField(null=True)
    low_price = models.FloatField(null=True)
    close_price = models.FloatField(null=True)
    volume = models.BigIntegerField(null=True)
    dividends = models.FloatField(null=True)
    pct_change = models.FloatField(null=True)
    free_cash_flow = models.FloatField(null=True)
    eps = models.FloatField(null=True)       
    market_cap = models.FloatField(null=True)        
    pe = models.FloatField(null=True)               

    def __str__(self):
        return f"{self.timestamp} - Close: {self.close_price}"