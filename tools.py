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
def web_search(query: str = "", url: str = "") -> str:
    """Search the web for the given query topic and return recent, relevant results."""
    search_term = query.strip() or url.strip()
    if not search_term:
        return "No search query provided."
    try:
        response = tavily.search(query=search_term, max_results=5)

        out = []
        for result in response.get("results", []):
            title = result.get("title", "No Title")
            url_res = result.get("url", "No URL")
            content = result.get("content", "")[:200]
            out.append(f"Title: {title}\nURL: {url_res}\nSnippet: {content}\n")

        return "\n---\n".join(out)
    except Exception as e:
        return f"An error occurred during web search: {str(e)}"


if __name__ == "__main__":
    print(web_search.invoke({"query": "What is the capital of France?"}))


@tool
def scrape_url(url: str = "", query: str = "") -> str:
    """Scrape and return clean text content from a given URL for deeper reading."""
    target_url = url.strip() or query.strip()
    if not target_url or not target_url.startswith("http"):
        return f"Invalid or missing URL: '{target_url}'"
    try:
        resp = requests.get(
            target_url, timeout=8, headers={"User-Agent": "Mozilla/5.0"}
        )
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")

        for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
            tag.decompose()

        return soup.get_text(separator=" ", strip=True)[:1500]
    except Exception as e:
        return f"Could not scrape URL: {str(e)}"


