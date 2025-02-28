from gdeltdoc import GdeltDoc, Filters
import pandas as pd
import requests
from newspaper import Article
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import urlparse


def get_news_gdelt(kw, sd, ed, nr=20):

    f = Filters(
        keyword = kw,
        start_date = sd,
        end_date = ed,
        num_records = nr,
        country = ["UK", "US"],
    )

    gd = GdeltDoc()

    # Search for articles matching the filters
    articles = gd.article_search(f)
    articles = articles[articles["url"].str.contains(r"^https?://", na=False)]
    articles = articles[articles["language"] == "English"]


    # Function to extract article text using newspaper3k
    def extract_article_text(url):
        try:
            article = Article(url)
            article.download()
            article.parse()
            if not article.text:
                return None
            return article.text
        except:
            return None

    # Main function to process a list of URLs
    def process_articles(df, max_workers=100):
        # Extract the first column as a list of URLs
        urls = df['url'].tolist()

        # Prepare the results DataFrame
        results = []

        # Process URLs in parallel
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_url = {
                executor.submit(extract_article_text, url): url
                for url in urls
            }

            for future in as_completed(future_to_url):
                url = future_to_url[future]
                try:
                    result = future.result()
                    results.append(result)
                except Exception as e:
                    print(f"Error processing {url}: {e}")
                    results.append({"url": url, "text": None})

        # Convert results to a DataFrame
        results_df = pd.DataFrame(results, columns=["content"])
        return results_df


    processed_articles = process_articles(articles)
    result = pd.concat([articles["url"], processed_articles], axis=1)
    result = result[ (result["content"].notnull()) & (result["content"] != "None") ]

    return(result)