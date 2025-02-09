from django.http import JsonResponse
from .utils import get_news_data
from message import generate_data

# Removed @require_GET for simplicity. You can add method checks inside the view.
# async def news_api(request):
#     if request.method != "GET":
#         return JsonResponse({"error": "Method Not Allowed"}, status=405)

#     tickers = request.GET.get("tickers")
#     topics = request.GET.get("topics")
#     time_from = request.GET.get("time_from")
#     time_to = request.GET.get("time_to")
#     sort = request.GET.get("sort", "LATEST")
#     limit = request.GET.get("limit", 50)
#     apikey = request.GET.get("apikey")

#     if not apikey:
#         return JsonResponse({"error": "Missing required parameter: apikey"}, status=400)

#     try:
#         limit = int(limit)
#     except ValueError:
#         limit = 50

#     try:
#         # Await the asynchronous get_news_data call.
#         news_data = await get_news_data(
#             tickers=tickers,
#             topics=topics,
#             time_from=time_from,
#             time_to=time_to,
#             sort=sort,
#             limit=limit,
#             apikey=apikey
#         )
#     except Exception as e:
#         return JsonResponse({"error": str(e)}, status=500)

#     return JsonResponse({"news": news_data})

from asgiref.sync import async_to_sync, sync_to_async
from rest_framework.decorators import api_view, renderer_classes
from rest_framework.renderers import JSONRenderer
from rest_framework.response import Response
from .utils import *
from .models import StockData
from .serializers import StockDataSerializer
from datetime import datetime
from django.conf import settings

@api_view(['GET'])
@renderer_classes([JSONRenderer])
def news_data_api(request):
    # Wrap the async view so that it runs synchronously.
    return async_to_sync(async_news_data_api)(request)

async def async_news_data_api(request):
    try:
        API_KEY_1 = settings.API_PER
        API_KEY_2 = settings.API_DS
        stockname = request.query_params.get('stockname', 'AAPL')
        period = request.query_params.get('period', '[2025-01-01, 2025-01-10]')
        
        # Generate both simple and complex responses.
        simple_res, complex_res = generate_data(API_KEY_1, API_KEY_2, stockname, period)
        
        response_data = {
            "status_code": 200,
            "simple": simple_res,
            "complex": complex_res
        }
        return Response(response_data)
    
    except Exception as e:
        # Log the error if desired, then return a JSON response with the error message.
        error_data = {
            "status_code": 500,
            "error": str(e)
        }
        return Response(error_data, status=500)