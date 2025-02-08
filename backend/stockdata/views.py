# stockdata/views.py
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import StockData
from .serializers import StockDataSerializer
from .utils import fetch_price_yf

@api_view(['GET'])
def stock_data_api(request):
    # Get parameters from the request (with default values if not provided)
    stock_name = request.query_params.get('stockname', 'AAPL')
    period = request.query_params.get('period', '1d')
    interval = request.query_params.get('interval', '60m')
    
    # Fetch new stock data (this call wipes and refills the StockData table)
    fetch_price_yf(ticker_symbol=stock_name, period=period, interval=interval)
    
    # Retrieve all stored stock data (optionally, you can filter if needed)
    stock_data = StockData.objects.all().order_by('timestamp')
    
    # Serialize the data
    serializer = StockDataSerializer(stock_data, many=True)
    
    # Return the serialized data as a JSON response
    return Response(serializer.data)
