from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.conf import settings
import yfinance as yf

import logging

logger = logging.getLogger(__name__)

@api_view(['GET'])
def get_stock_data(request):
    '''
    The API function that allows front end to request general stock data
    Request Body:{
        session_id: required;
        stock_symbol: required;
        period: optional;
        data_format: optional;
    }
    Response{
        status_code: [200, 500]
        response_data: {
            symbol: stock_symbol #as requested,
            data: ["Open", "High", "Low", "Close", "Volume"]
        }
    }
    '''


    # create request to API s
    stock_symbol = request.GET.get('symbol', 'AAPL')
    session = request.GET.get('session_id', settings.SESSION_ID)
    period = request.GET.get("period", settings.STOCK_API_PERIOD)
    data_format = request.GET.get("data_format", 0)

    # fetch the data
    try:
        stock = yf.Ticker(stock_symbol)
        data = stock.history(period=period)

        if data.empty:
            return Response({"error": "No data found for the given symbol and period."}, status=404)

        # feed the response
        if data_format:
            data = format_data_frontend()
        
        response_data = {
            "symbol": stock_symbol,
            "data": data[['Open', 'High', 'Low', 'Close', 'Volume']].to_json(orient='records')  # Convert to JSON
        }

        # store the data
        formatted_data = format_data_backend(settings.data_source, stock_data=data)
        store_session(formatted_data, session)


        return Response(response_data, status=200)

    # exception
    except Exception as e:
        logger.error(f"Error fetching stock data: {str(e)}")
        return Response({"error": f"Internal Server Error: {str(e)}"}, status=500)
    



def period_filter(stock_data):
    pass

def format_data_frontend(stock_data):
    pass

def store_session(stock_data, session):
    pass

def format_data_backend(stock_data):
    pass