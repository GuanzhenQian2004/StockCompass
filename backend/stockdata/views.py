from asgiref.sync import async_to_sync, sync_to_async
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .utils import fetch_price_yf
from .models import StockData
from .serializers import StockDataSerializer
from datetime import datetime

@api_view(['GET'])
def stock_data_api(request):
    # Wrap the async view so that it runs synchronously.
    return async_to_sync(async_stock_data_api)(request)

async def async_stock_data_api(request):
    try:
        # Get parameters from the request (with default values if not provided)
        stock_name = request.query_params.get('stockname', 'AAPL')
        period = request.query_params.get('period', '1d')
        interval = request.query_params.get('interval', '60m')
    
        # Call the async data fetching function
        await fetch_price_yf(ticker_symbol=stock_name, period=period, interval=interval)
    
        # Retrieve all stored stock data asynchronously
        stock_data = await sync_to_async(list)(StockData.objects.all().order_by('timestamp'))
    
        # Serialize the data
        serializer = StockDataSerializer(stock_data, many=True)
    
        # Format the data:
        # - Format time to "YYYY-MM-DD"
        # - Round numeric fields to 2 decimal places (if not None)
        time_series = [
            {
                "time": datetime.fromisoformat(item["timestamp"].replace('Z','')).strftime("%Y-%m-%d"),
                "close_price": round(item["close_price"], 2) if item["close_price"] is not None else None,
                "volume": item["volume"],

            }
            for item in serializer.data
        ]
        fin_data = [
            {
                "time": datetime.fromisoformat(item["timestamp"].replace('Z','')).strftime("%Y-%m-%d"),
                "free_cash_flow": round(item["free_cash_flow"], 3) if item["free_cash_flow"] is not None else None,
                "eps": round(item["eps"], 2) if item["eps"] is not None else None,
                "profit_margin": round(item["profit_margin"], 2) if item["profit_margin"] is not None else None,
                "market_cap": round(item["market_cap"], 2) if item["market_cap"] is not None else None,
                "pct_change": round(item["pct_change"], 2) if item["pct_change"] is not None else None,
                "pe": round(item["pe"], 2) if item["pe"] is not None else None,
            }
            for item in serializer.data
        ]
    
        # Prepare the final response data
        response_data = {
            "status_code": 200,
            "time_series": time_series,
            "fin_data": fin_data,
        }
    except Exception as e:
        # If an exception occurs, return an error status and message.
        response_data = {
            "status_code": 500,
            "error": str(e)
        }
    
    return Response(response_data)