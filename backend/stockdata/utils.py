import asyncio
import yfinance as yf
import datetime
import numpy as np
import pandas as pd
import scipy.stats

from django.conf import settings
from .models import StockData
from django.db import connection
from arch import arch_model



async def fetch_price_yf(ticker_symbol="AAPL", period="1d", interval="60m"):
    """
    Asynchronously fetch historical stock data from Yahoo Finance, wipe the existing data,
    and store the new data in the StockData table. Optimized for speed.
    """
    # Wipe the entire StockData table asynchronously.
    await asyncio.to_thread(reset_table, StockData)
    print("Existing stock data wiped from the database (yfinance).")

    # Create a ticker object using yfinance.
    ticker = yf.Ticker(ticker_symbol)

    # Fetch historical price data, cash flow, and income statement concurrently.
    data, cf_df, income_stmt_df = await asyncio.gather(
        asyncio.to_thread(ticker.history, period=period, interval=interval),
        asyncio.to_thread(ticker.get_cashflow, freq='yearly'),
        asyncio.to_thread(ticker.get_incomestmt)
    )

    # Compute percentage change for the Close price.
    data['pct_change'] = data['Close'].pct_change(periods=-1).fillna(0) * 100

    # Extract years from the index for vectorized operations.
    data['year'] = data.index.year

    # Build mappings for free cash flow, EPS, and profit margin.
    fcf_mapping = {}
    if "FreeCashFlow" in cf_df.index:
        fcf_series = cf_df.loc["FreeCashFlow"]
        for col in fcf_series.index:
            try:
                year = pd.to_datetime(col).year
            except Exception:
                try:
                    year = int(col)
                except Exception:
                    continue
            fcf_mapping[year] = fcf_series[col]

    eps_mapping = {}
    profit_margin_mapping = {}
    income_stmt_transposed = income_stmt_df.T
    for period_label, row in income_stmt_transposed.iterrows():
        try:
            year = pd.to_datetime(period_label).year
        except Exception:
            try:
                year = int(period_label)
            except Exception:
                continue
        eps_mapping[year] = row.get("BasicEPS", None)
        total_revenue = row.get("TotalRevenue", None)
        gross_profit = row.get("GrossProfit", None)
        if total_revenue and total_revenue != 0:
            profit_margin_mapping[year] = gross_profit / total_revenue
        else:
            profit_margin_mapping[year] = None

    # Map free cash flow, EPS, and profit margin using vectorized operations.
    data['free_cash_flow'] = data['year'].map(fcf_mapping).fillna(0)
    data['eps'] = data['year'].map(eps_mapping)
    data['profit_margin'] = data['year'].map(profit_margin_mapping)

    # Compute market cap and PE ratio.
    data['market_cap'] = data['Volume'] * data['Close']
    data['pe'] = data.apply(lambda row: 0 if (row['eps'] in [None, 0]) else row['Close'] / row['eps'], axis=1)

    # Prepare data for bulk insert.
    records = [
        StockData(
            timestamp=timestamp.to_pydatetime().replace(tzinfo=None),
            open_price=row['Open'],
            high_price=row['High'],
            low_price=row['Low'],
            close_price=row['Close'],
            volume=int(row['Volume']),
            pct_change=row['pct_change'],
            free_cash_flow=row['free_cash_flow'],
            eps=row['eps'],
            profit_margin=row['profit_margin'],
            market_cap=row['market_cap'],
            pe=row['pe']
        )
        for timestamp, row in data.iterrows()
    ]

    # Perform bulk insert.
    await asyncio.to_thread(StockData.objects.bulk_create, records)
    print("Stock data fetched from yfinance and stored successfully.")


async def fetch_price_av():
    pass


def reset_table(model):
    """
    Synchronously wipes all rows from the model's table and resets the auto-increment counter.
    
    Parameters:
        model: The Django model class whose table you want to truncate.
    """
    table_name = model._meta.db_table  # Get the actual database table name
    with connection.cursor() as cursor:
        if connection.vendor == "postgresql":
            cursor.execute(f"TRUNCATE TABLE {table_name} RESTART IDENTITY CASCADE;")
        elif connection.vendor == "mysql":
            cursor.execute(f"TRUNCATE TABLE {table_name};")
        elif connection.vendor == "sqlite":
            cursor.execute(f"DELETE FROM {table_name};")
            cursor.execute(f"DELETE FROM sqlite_sequence WHERE name='{table_name}';")
        else:
            cursor.execute(f"DELETE FROM {table_name};")

import numpy as np
import pandas as pd
import scipy.stats
from arch import arch_model
from sklearn.ensemble import IsolationForest
import asyncio

async def unusual_ranges(data, confidence_level=0.05):
    """
    Identify unusual date ranges using GARCH-based volatility and a statistical test.
    No machine learning is used.
    """
    # Input validation
    if not data or "time" not in data or "price" not in data:
        raise ValueError("Data must contain 'time' and 'price' arrays")
    
    # Prepare data
    times = np.array([np.datetime64(t) for t in data["time"]])
    prices = np.array(data["price"], dtype=float)
    if len(prices) < 2:
        raise ValueError("Not enough price data to compute daily changes.")
    
    # Compute daily changes and dates
    daily_changes = np.diff(prices)
    daily_dates = times[1:]
    
    # Fit GARCH model
    garch_fit = await asyncio.to_thread(
        lambda: arch_model(daily_changes, vol='Garch', p=1, q=1).fit(disp='off')
    )
    forecast = garch_fit.conditional_volatility
    
    # Compute critical value for the specified confidence level
    crit_value = scipy.stats.norm.ppf(1 - confidence_level / 2)
    
    # Identify unusual dates using GARCH-based volatility and statistical test
    mask = (np.abs(daily_changes) > (crit_value * forecast))
    unusual_dates = daily_dates[mask]
    
    if unusual_dates.size == 0:
        raise Exception("No unusual dates found with the specified threshold.")
    
    # Sort the unusual dates
    unusual_dates = np.sort(unusual_dates)
    
    # Compute gaps between consecutive unusual dates
    gaps = np.diff(unusual_dates)
    gaps_in_days = gaps.astype('timedelta64[D]').astype(int)
    
    # Group unusual dates into ranges based on gaps
    gap_threshold = np.mean(gaps_in_days) + np.std(gaps_in_days)
    gap_indices = np.where(gaps_in_days > gap_threshold)[0]
    
    if gap_indices.size == 0:
        ranges = [(unusual_dates[0], unusual_dates[-1])]
    else:
        start_indices = np.r_[0, gap_indices + 1]
        end_indices = np.r_[gap_indices, unusual_dates.size - 1]
        ranges = [(unusual_dates[s], unusual_dates[e]) for s, e in zip(start_indices, end_indices) if s != e]
    
    # Format and adjust ranges
    max_date = times.max()
    adjusted_ranges = []
    for start, end in ranges:
        if start == end:
            if start < max_date:
                end = start + np.timedelta64(2, 'D')
            else:
                start = start - np.timedelta64(2, 'D')
        adjusted_ranges.append((str(start.astype('M8[D]')), str(end.astype('M8[D]'))))
    
    return adjusted_ranges


async def get_stock_metadata_info(ticker_symbol="AAPL"):
    """
    Asynchronously fetch stock metadata using yfinance and extract:
      - currency
      - exchangeName
      - longName
      - last close price (using 'previousClose')
    
    Parameters:
        ticker_symbol (str): The stock ticker symbol (default "AAPL").
    
    Returns:
        dict: A dictionary with the extracted information.
    """

    print("In the util function")

    # Create the Ticker object.
    ticker = yf.Ticker(ticker_symbol)

    test_data = ticker.get_history_metadata()

    print("test data fetched")

    # Run the synchronous call in a separate thread.
    metadata = await asyncio.to_thread(ticker.get_history_metadata)
    
    print("metadata fetched")

    # Navigate the nested metadata structure.
    # Typically the useful info is nested inside the 'chart' key.
    currency = metadata["currency"]
    exchangeName = metadata["fullExchangeName"]
    longName = metadata["longName"]
    hist = ticker.history(period="1d")
    lastClose = hist.index[-1].date()  
    # Calculate monthly percentage change:
    # Retrieve approximately 35 days of data to cover "30 days ago".
    hist_month = await asyncio.to_thread(ticker.history, period="35d")

    print("hist month fetched")

    if not hist_month.empty:
        price_today_month = hist_month["Close"].iloc[-1]
        price_30_days_ago = hist_month["Close"].iloc[0]
        monthly_pct_change = (price_today_month / price_30_days_ago) - 1
    else:
        monthly_pct_change = None

    # Calculate annual percentage change:
    # Retrieve approximately 400 days of data to cover "365 days ago".
    hist_year = await asyncio.to_thread(ticker.history, period="400d")

    print("hist year fetched")

    if not hist_year.empty:
        price_today_year = hist_year["Close"].iloc[-1]
        price_365_days_ago = hist_year["Close"].iloc[0]
        yearly_pct_change = (price_today_year / price_365_days_ago) - 1
    else:
        yearly_pct_change = None

    return {
        "currency": currency,
        "exchangeName": exchangeName,
        "longName": longName,
        "lastClose": lastClose,
        "montly_pct_change": monthly_pct_change,
        "yearly_pct_change": yearly_pct_change
    }