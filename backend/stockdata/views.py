from asgiref.sync import async_to_sync, sync_to_async
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .utils import fetch_price_yf
from .models import StockData
from .serializers import StockDataSerializer

@api_view(['GET'])
def stock_data_api(request):
    # Wrap the async view so that it runs synchronously.
    return async_to_sync(async_stock_data_api)(request)

async def async_stock_data_api(request):
    # Get parameters from the request (with default values if not provided)
    stock_name = request.query_params.get('stockname', 'AAPL')
    period = request.query_params.get('period', '1d')
    interval = request.query_params.get('interval', '60m')
    
    # Call your async data fetching function
    await fetch_price_yf(ticker_symbol=stock_name, period=period, interval=interval)
    
    # Retrieve all stored stock data asynchronously
    stock_data = await sync_to_async(list)(StockData.objects.all().order_by('timestamp'))
    
    # Serialize the data
    serializer = StockDataSerializer(stock_data, many=True)
    
    # Return the serialized data wrapped in a DRF Response
    return Response(serializer.data)