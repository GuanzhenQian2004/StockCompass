from django.http import JsonResponse
from .utils import get_news_data
import json

# Removed @require_GET for simplicity. You can add method checks inside the view.
async def news_api(request):
    if request.method != "GET":
        return JsonResponse({"error": "Method Not Allowed"}, status=405)

    tickers = request.GET.get("tickers")
    topics = request.GET.get("topics")
    time_from = request.GET.get("time_from")
    time_to = request.GET.get("time_to")
    sort = request.GET.get("sort", "LATEST")
    limit = request.GET.get("limit", 50)
    apikey = request.GET.get("apikey")

    if not apikey:
        return JsonResponse({"error": "Missing required parameter: apikey"}, status=400)

    try:
        limit = int(limit)
    except ValueError:
        limit = 50

    try:
        # Await the asynchronous get_news_data call.
        news_data = await get_news_data(
            tickers=tickers,
            topics=topics,
            time_from=time_from,
            time_to=time_to,
            sort=sort,
            limit=limit,
            apikey=apikey
        )
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

    # Transform news_data into the desired complex structure expected by the frontend.
    # For each article:
    #   - "explanations": use the article title, defaulting to "News"
    #   - "references": use the article URL
    #   - "reasons": use the article source, defaulting to "News Source"
    #   - "text_summary": join all available summaries into one string.
    complex_data = {
        "explanations": [item.get("title") or "News" for item in news_data],
        "references": [item.get("url") for item in news_data],
        "reasons": [item.get("source") or "News Source" for item in news_data],
        "text_summary": "\n".join([item.get("summary") for item in news_data if item.get("summary")])
    }

    return JsonResponse({"complex": json.dumps(complex_data)})
