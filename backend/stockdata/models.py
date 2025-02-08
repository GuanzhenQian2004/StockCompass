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

    def __str__(self):
        return f"{self.timestamp} - Close: {self.close_price}"
