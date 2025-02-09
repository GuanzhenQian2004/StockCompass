import asyncio
import yfinance as yf
import pandas as pd
from django.conf import settings
from .models import StockData
from django.db import connection

async def fetch_price_yf(ticker_symbol="AAPL", period="1d", interval="60m"):
    """
    Asynchronously fetch historical stock data from Yahoo Finance, wipe the existing data,
    and store the new data in the StockData table. Additional data merged includes:
      - Free Cash Flow (yearly) from ticker.get_cashflow(freq='yearly')
      - EPS from ticker.get_eps_revisions() (using the "0y" revision and "upLast7days" column)
      - Market Cap computed as Volume * Close
      - PE Ratio computed as Close / EPS (if EPS==0, then PE is 0)

    For each historical data row, the free cash flow value is determined by matching the row's year
    with the year extracted from the cash flow data's column headers. If no match is found, 0 is used.
    For EPS, a single EPS revision value is used for all rows.

    Also computes pct_change for the close price.
    
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
    
    # Compute percentage change for the Close price:
    data['pct_change'] = data['Close'].pct_change(periods=-1).fillna(0) * 100

    ##############################################################
    # Retrieve and merge yearly Free Cash Flow from cash flow data #
    ##############################################################
    # Get yearly cash flow data
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
    # Retrieve and merge EPS revisions                            #
    ##############################################################
    # Get the EPS revisions DataFrame
    eps_df = await asyncio.to_thread(ticker.get_eps_revisions)
    # For simplicity, select the "0y" revision and choose the "upLast7days" column as representative
    if "0y" in eps_df.index:
        eps_value = eps_df.loc["0y", "upLast7days"]
    else:
        eps_value = 0.0

    # Function to return free cash flow based on the year of the datetime.
    def get_fcf_for_year(dt):
        return fcf_mapping.get(dt.year, 0)

    # For each timestamp in the historical data, fill in the free cash flow and EPS.
    free_cash_flow_list = []
    eps_list = []
    for ts in data.index:
        dt = ts.to_pydatetime() if hasattr(ts, "to_pydatetime") else ts
        free_cash_flow_list.append(get_fcf_for_year(dt))
        # Use the same EPS value for every row (if available); otherwise, fill with 0.
        eps_list.append(eps_value if eps_value is not None else 0)
    data['free_cash_flow'] = free_cash_flow_list
    data['eps'] = eps_list

    #######################################################
    # Compute additional financial metrics                #
    # - Market Cap = Volume * Close                       #
    # - PE Ratio = Close / EPS (0 if EPS is 0)              #
    #######################################################
    data['market_cap'] = data['Volume'] * data['Close']
    data['pe'] = data.apply(lambda row: 0 if row['eps'] == 0 else row['Close'] / row['eps'], axis=1)

    #################################################
    # Store each row in the database asynchronously #
    #################################################
    print("Stock data fetched from yfinance successfully.")

    stocks_to_create = []
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
            dividends=row['Dividends'],
            stock_splits=row['Stock Splits'],
            pct_change=row['pct_change'],
            free_cash_flow=row['free_cash_flow'],
            eps=row['eps'],
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