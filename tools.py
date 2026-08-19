import os
from dotenv import load_dotenv
from langchain_core.tools import tool
from rich import print
from tavily import TavilyClient

import requests
from bs4 import BeautifulSoup


load_dotenv()

tavily = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))


@tool
def web_search(query: str) -> str:
    """Search the web for the given query and return the results."""
    try:
        response = tavily.search(query=query, max_results=5)

        out = []
        for result in response.get("results", []):
            title = result.get("title", "No Title")
            url = result.get("url", "No URL")
            content = result.get("content", "")[:200]
            out.append(f"Title: {title}\nURL: {url}\nSnippet: {content}\n")

        return "\n---\n".join(out)
    except Exception as e:
        return f"An error occurred during web search: {str(e)}"


if __name__ == "__main__":
    print(web_search.invoke({"query": "What is the capital of France?"}))





@tool
def scrape_url(url: str) -> str:
    """Scrape and return clean text content from a given URL for deeper reading."""
    try:
        resp = requests.get(
            url, timeout=8, headers={"User-Agent": "Mozilla/5.0"}
        )
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")

        for tag in soup(["script", "style", "nav", "footer"]):
            tag.decompose()

        return soup.get_text(separator=" ", strip=True)[:3000]
    except Exception as e:
        return f"Could not scrape URL: {str(e)}"


