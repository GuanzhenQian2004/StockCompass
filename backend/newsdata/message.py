import os
import json
import yfinance as yf
from argparse import ArgumentParser
import requests
import concurrent.futures
from openai import OpenAI
from .news_gdelt import get_news_gdelt

def send_post_request(url, payload, headers):
    response = requests.post(url, json=payload, headers=headers)
    try:
        return response.json()
    except json.decoder.JSONDecodeError:
        return {"error": "Invalid JSON", "status_code": response.status_code, "response_text": response.text}


def api_data_request(api_key, stock, start, end):
    url = "https://api.perplexity.ai/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    setting = """You are a stock wizard, generating explanations for a change in stock performance for a given range of time. 
        You will be evaluated on the quality and novelty of your explanations in that order. 
        Quality is measured by the degree to which your data is supported by the references you present. 
        Novelty is the likelihood that another model would not present this information. Be concise and to the point. 
        When providing references, ALWAYS include the name of the news outlet (e.g., 'Reuters', 'Bloomberg', 'CNBC', 'Financial Times') as the source. 
        If any of the explanations appear weak, ignore them and focus on improving the others. 
        DO NOT MENTION UNSUPPORTED HYPOTHETICAL CLAIMS."""
    
    query = f"""Analyze the stock {stock} and provide detailed potential explanations for the change in stock performance between the dates {start} and {end}. 
        To accomplish this task, search for financial news for the given time period. Focus on the most relevant information. 
        AVOID REPEATING YOURSELF. Look for and record any unusual patterns or events that may have caused the change. 
        Provide a summary of your findings, as well as any references you used to make your conclusions. 
        Be sure to include the reasons for the change in stock performance. DO NOT MENTION MARKET VOLATILITY."""
    
    payload = {
        "model": "sonar",
        "messages": [{"role": "system", "content": setting}, {"role": "user", "content": query}],
        "max_tokens": 200,
        "temperature": 0.2,
        "top_p": 0.9,
        "presence_penalty": 2,
    }

    full_data = send_post_request(url, payload, headers)
    if full_data.get('choices'):
        return {
            "citations": full_data.get("citations", []),
            "content": [choice.get("message", {}).get("content") for choice in full_data.get("choices", [])]
        }
    
    result = {"citations": [], "content": []}
    return result



def api_enhancement_request_openai(api_key, stock, start, end, explanations, references, fetched_news):
    client = OpenAI(api_key=api_key)
    
    setting =  """ You will be provided with a list of citations to various news sources and a text string describing possible explanations 
    for a volitility change in stock performance. Your job is to analyze this string and then rethink the provided explanations. 
    Check each of the sites and enhance the explanations by providing additional details and context. 
    Feel free to remove explanations that don't make much sense. YOU WILL BE EXPECTED TO FIND MORE RESOURCES. 
    You will be evaluated on the quality and novelty of your enhancements in that order. 
    Quality is measured by the degree to which your data is supported by the references you present. 
    Novelty is the likelihood that another model would not present this information. 
    Be concise and to the point. If any of the explanations appear weak, ignore them and focus on improving the others. 
    For summary, you need to speak like expert financial analyst, be critical, concise, and use professional terms.
    For each reasoning and explanation, you just need to provide 1-2 sentence, but make sure to use complete sentence and be professional.
    DO NOT MENTION UNSUPPORTED HYPOTHETICAL CLAIMS. 
    YOUR OUTPUT MUST BE IN THE JSON FORMAT: {\"explanations\": [\"explanation1\", \"explanation2\"], \"reasons\": [\"reason1\", \"reason2\"], \"references\": [\"reference1\", \"reference2\"], \"text_summary\": \"summary\"}"""
    
    query = f"""I have these explanations for the change in stock performance of {stock} between the dates {start} and {end}.
        I also have these news articles with their links between the dates {start} and {end} that may provide additional context.
        I need you to enhance them by providing additional details and context. Check the provided citations for more information.
        Be sure to remove any explanations that don't make much sense. Provide a summary of your enhancements, 
        as well as any references you used to make your conclusions. Be sure to include the reasons for the change in stock performance. 
        In your response, use both explanation/refrerence pairs and news article summaries. 
        DO NOT MENTION MARKET VOLATILITY. YOUR RESPONSE MUST BE IN VALID JSON FORMAT. AND DO NOT COMMENT ON THE PREVIOUS STRING, 
        JUST THE EXPLANATIONS.
        \\n explanations: {explanations}, \\n references: {references} 
        \\n news articles: {fetched_news}"""
    
    payload = {
        "model": "gpt-4o",
        "messages": [{"role": "system", "content": setting}, {"role": "user", "content": query}],
        "response_format": {"type": 'json_object'},
    }
    const_response = client.chat.completions.create(
        model='gpt-4o',
        messages=[
            {'role':'system', "content": setting},
            {'role':"user", "content": query}
        ],
        stream=False
    )

    return const_response


def create_key_value_pairs(links, contents):
    """
    Organizes links and contents into a key-value pair format.

    Args:
        links (list): List of website links.
        contents (list): List of corresponding content.

    Returns:
        str: A string formatted in key-value pairs.
    """
    if len(links) != len(contents):
        raise ValueError("The length of 'links' and 'contents' must be the same.")

    output = []
    for link, content in zip(links, contents):
        # Format each link-content pair as key-value
        pair = f"- Link: {link}\n- Content: {content}"
        output.append(pair)

    # Join all pairs with a separator for clarity
    return "\n---\n".join(output)


def ticker_to_company_name(ticker):
    try:
        stock = yf.Ticker(ticker)
        return stock.info['longName']  # Returns the full company name
    except Exception as e:
        print(f"Error fetching data for {ticker}: {e}")
        return ticker



def generate_data_openai(api_key_perplexity, api_key_openai, stock, start, end):
    # Function to fetch simple explanations
    def fetch_simple_explanations():
        return api_data_request(api_key_perplexity, stock, start, end)

    # Function to fetch company news
    def fetch_company_news():
        return get_news_gdelt(ticker_to_company_name(stock), start, end)

    # Run both tasks concurrently
    with concurrent.futures.ThreadPoolExecutor() as executor:
        # Submit tasks to the executor
        future_simple_explanations = executor.submit(fetch_simple_explanations)
        future_company_news = executor.submit(fetch_company_news)

        # Wait for both tasks to complete and retrieve results
        simple_explanations = future_simple_explanations.result()
        company_news = future_company_news.result()

    # Enhance explanations using OpenAI
    complex_explanations = api_enhancement_request_openai(
        api_key_openai, stock, start, end, simple_explanations['content'], simple_explanations["citations"], company_news
    )
    return complex_explanations.choices[0].message.content




## These functions are not used in the code, deepseek generation speed is too slow, but response is logical ##

# def api_enhancement_request_deepseek(api_key, stock, start, end, explanations, references):
#     url = "https://api.deepseek.com/v1/chat/completions"
#     headers = {
#         "Authorization": f"Bearer {api_key}",
#         "Content-Type": "application/json"
#     }
#     setting =  """ You will be provided with a list of citations to various news sources and a text string describing possible explanations for a change in stock performance. Your job is to analyze this string and then rethink the provided explanations. Check each of the sites and enhance the explanations by providing additional details and context. Feel free to remove explanations that don't make much sense. YOU WILL BE EXPECTED TO FIND MORE RESOURCES. You will be evaluated on the quality and novelty of your enhancements in that order. Quality is measured by the degree to which your data is supported by the references you present. When providing references, ALWAYS include the name of the news outlet (e.g., 'Reuters', 'Bloomberg', 'CNBC', 'Financial Times') as the source. Novelty is the likelihood that another model would not present this information. Be concise and to the point. If any of the explanations appear weak, ignore them and focus on improving the others. DO NOT MENTION UNSUPPORTED HYPOTHETICAL CLAIMS. YOUR OUTPUT MUST BE IN THE JSON FORMAT: {\"explanations\": [\"explanation1\", \"explanation2\"], \"reasons\": [\"reason1\", \"reason2\"], \"references\": [\"reference1\", \"reference2\"], \"text_summary\": \"summary\"}"""
    
#     query = f"""I have these explanations for the change in stock performance of {stock} between the dates {start} and {end}.
#         I need you to enhance them by providing additional details and context. Check the provided citations for more information.
#         Be sure to remove any explanations that don't make much sense. Provide a summary of your enhancements, as well as any references you used to make your conclusions. Be sure to include the reasons for the drop in stock performance. DO NOT MENTION MARKET VOLATILITY. YOUR RESPONSE MUST BE IN VALID JSON FORMAT. AND DO NOT COMMENT ON THE PREVIOUS STRING, JUST THE EXPLANATIONS.
#         \\n explanations: {explanations}, \\n references: {references}"""
    
#     payload = {
#         "model": "deepseek-chat",
#         "messages": [{"role": "system", "content": setting}, {"role": "user", "content": query}],
#         "response_format": {"type": 'json_object'},
#     }
#     return send_post_request(url, payload, headers)


# def generate_data_deepseek(api_key_1, api_key_2, stock, start, end):
#     simple_explanations = api_data_request(api_key_1, stock, start, end)
#     complex_explanations = api_enhancement_request_deepseek(api_key_2, stock, start, end, simple_explanations['content'], simple_explanations["citations"])
#     choices = complex_explanations.get('choices')
#     if choices and isinstance(choices, list) and choices[0].get('message'):
#         return choices[0]['message'].get('content', 'No content available')
#     return "No valid complex explanation returned."


# def validate_news_item(data):
#     required_fields = ['title', 'url']
#     for field in required_fields:
#         if field not in data:
#             raise ValueError(f"Missing required field: {field}")
#     return data