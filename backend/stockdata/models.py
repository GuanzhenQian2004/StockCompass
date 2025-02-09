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

    def __str__(self):
        return f"{self.timestamp} - Close: {self.close_price}"
