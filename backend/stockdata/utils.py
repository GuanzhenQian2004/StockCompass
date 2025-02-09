import yfinance as yf
from django.conf import settings
from .models import StockData
from django.db import connection

def fetch_price_yf(ticker_symbol="AAPL", period="1d", interval="60m"):
    """
    Fetch historical stock data from Yahoo Finance, wipe the existing data,
    and store the new data in the StockData table.
    
    Parameters:
        ticker_symbol (str).
        period (str): "1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "10y", "ytd", "max"
        interval (str): "1m", "2m", "5m", "15m", "30m", "60m", "90m", "1h", "1d", "5d", "1wk", "1mo", "3mo"
    """
    
    # Wipe the entire StockData table
    reset_table(StockData)
    print("Existing stock data wiped from the database (yfinance).")

    # Create a ticker object using yfinance
    ticker = yf.Ticker(ticker_symbol)
    
    # Fetch historical data as a pandas DataFrame
    data = ticker.history(period=period, interval=interval)
    # Iterate over each row in the DataFrame and store it

    print("Stock data fetched from yfinance successfully.")

    stocks_to_create = []
    for timestamp, row in data.iterrows():
        dt = timestamp.to_pydatetime().replace(tzinfo=None)
        stocks_to_create.append(
            StockData(
                timestamp=dt,
                open_price=row['Open'],
                high_price=row['High'],
                low_price=row['Low'],
                close_price=row['Close'],
                volume=int(row['Volume']),
                dividends=row['Dividends'],
                stock_splits=row['Stock Splits']
            )
        )
    
    # Bulk create all entries in a single query
    StockData.objects.bulk_create(stocks_to_create)
    print("Data stored successfully.")


def fetch_price_av():
   pass


def reset_table(model):
    """
    Wipes all rows from the model's table and resets the auto-increment counter.
    
    Parameters:
        model: The Django model class whose table you want to truncate.
    """
    table_name = model._meta.db_table  # Get the actual database table name
    with connection.cursor() as cursor:
        if connection.vendor == "postgresql":
            # PostgreSQL: Restart identity resets the primary key sequence.
            cursor.execute(f"TRUNCATE TABLE {table_name} RESTART IDENTITY CASCADE;")
        elif connection.vendor == "mysql":
            # MySQL: TRUNCATE resets the auto-increment counter automatically.
            cursor.execute(f"TRUNCATE TABLE {table_name};")
        elif connection.vendor == "sqlite":
            # SQLite: Delete rows and reset the sequence in sqlite_sequence table.
            cursor.execute(f"DELETE FROM {table_name};")
            cursor.execute(f"DELETE FROM sqlite_sequence WHERE name='{table_name}';")
        else:
            # Fallback: Just delete rows (IDs may not reset)
            cursor.execute(f"DELETE FROM {table_name};")
