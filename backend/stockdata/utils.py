import asyncio
import yfinance as yf
import pandas as pd
from django.conf import settings
from .models import StockData
from django.db import connection

async def fetch_price_yf(ticker_symbol="AAPL", period="1d", interval="60m"):
    """
    Asynchronously fetch historical stock data from Yahoo Finance, wipe the existing data,
    and store the new data in the StockData table. Merged data includes:
      - Annual Free Cash Flow from ticker.get_cashflow(freq='yearly')
      - Annual EPS and profit margin from ticker.get_incomestmt() 
          • EPS is extracted from the "BasicEPS" column
          • Profit margin is computed as GrossProfit / TotalRevenue
      - Market Cap computed as Volume * Close
      - PE Ratio computed as Close / EPS (if EPS is None or 0, then PE is 0)
      
    For each historical data row, the free cash flow, EPS, and profit margin values are determined by
    matching the row’s year with the respective annual data. If a year is not found, EPS and profit margin
    default to None while free cash flow defaults to 0.
    
    A percentage change column (pct_change) is also computed for the close price.
    
    Parameters:
        ticker_symbol (str): The stock symbol to fetch data for.
        period (str): Time period (e.g., "1d", "5d", "1mo", etc.).
        interval (str): Data interval (e.g., "1m", "5m", "60m", etc.).
    """
    # Wipe the entire StockData table asynchronously.
    await asyncio.to_thread(reset_table, StockData)
    print("Existing stock data wiped from the database (yfinance).")

    # Create a ticker object using yfinance.
    ticker = yf.Ticker(ticker_symbol)

    # Fetch historical price data as a pandas DataFrame asynchronously.
    data = await asyncio.to_thread(ticker.history, period=period, interval=interval)
    
    # Compute percentage change for the Close price.
    data['pct_change'] = data['Close'].pct_change(periods=-1).fillna(0) * 100

    ##############################################################
    # Retrieve and merge yearly Free Cash Flow from cash flow data #
    ##############################################################
    # Get yearly cash flow data.
    cf_df = await asyncio.to_thread(ticker.get_cashflow, freq='yearly')
    # Use the "FreeCashFlow" row (as shown in your result.txt)
    if "FreeCashFlow" in cf_df.index:
        fcf_series = cf_df.loc["FreeCashFlow"]
    else:
        fcf_series = pd.Series(dtype=float)
    fcf_mapping = {}
    for col in fcf_series.index:
        try:
            year = pd.to_datetime(col).year
        except Exception:
            try:
                year = int(col)
            except Exception:
                continue
        fcf_mapping[year] = fcf_series[col]

    ##############################################################
    # Retrieve and merge annual EPS and profit margin from income stmt #
    ##############################################################
    # Get the income statement once and transpose it.
    income_stmt_df = await asyncio.to_thread(ticker.get_incomestmt)
    income_stmt_transposed = income_stmt_df.T  # now rows correspond to reporting periods

    # Build mappings from year to annual BasicEPS and profit margin.
    eps_mapping = {}
    profit_margin_mapping = {}
    for period_label, row in income_stmt_transposed.iterrows():
        try:
            # Attempt to extract the year from the period label.
            year = pd.to_datetime(period_label).year
        except Exception:
            try:
                year = int(period_label)
            except Exception:
                continue
        # EPS: use the "BasicEPS" value; if missing, default to None.
        eps_mapping[year] = row.get("BasicEPS", None)
        # Profit margin: calculate as GrossProfit / TotalRevenue if possible.
        total_revenue = row.get("TotalRevenue", None)
        gross_profit = row.get("GrossProfit", None)
        if total_revenue and total_revenue != 0:
            profit_margin_mapping[year] = gross_profit / total_revenue
        else:
            profit_margin_mapping[year] = None

    # Helper function to get free cash flow for a given year.
    def get_fcf_for_year(dt):
        return fcf_mapping.get(dt.year, 0)

    # For each timestamp in our historical data, fill in the free cash flow, EPS, and profit margin.
    free_cash_flow_list = []
    eps_list = []
    profit_margin_list = []
    for ts in data.index:
        dt = ts.to_pydatetime() if hasattr(ts, "to_pydatetime") else ts
        free_cash_flow_list.append(get_fcf_for_year(dt))
        eps_list.append(eps_mapping.get(dt.year, None))
        profit_margin_list.append(profit_margin_mapping.get(dt.year, None))
    data['free_cash_flow'] = free_cash_flow_list
    data['eps'] = eps_list
    data['profit_margin'] = profit_margin_list

    #######################################################
    # Compute additional financial metrics                #
    # - Market Cap = Volume * Close                       #
    # - PE Ratio = Close / EPS (if EPS is missing or 0, then 0)
    #######################################################
    data['market_cap'] = data['Volume'] * data['Close']
    data['pe'] = data.apply(lambda row: 0 if (row['eps'] in [None, 0]) else row['Close'] / row['eps'], axis=1)

    #################################################
    # Store each row in the database asynchronously #
    #################################################
    for timestamp, row in data.iterrows():
        dt = timestamp.to_pydatetime().replace(tzinfo=None)
        await asyncio.to_thread(
            StockData.objects.create,
            timestamp=dt,
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
    print("Stock data fetched from yfinance and stored successfully.")


async def fetch_price_av():
    # Placeholder for async implementation for Alpha Vantage or similar.
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