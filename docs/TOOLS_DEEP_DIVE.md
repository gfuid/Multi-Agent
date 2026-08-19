# 🛠️ Deep Dive: `tools.py` Explained

This document explains every line, function, decision, and design pattern implemented in [`tools.py`](file:///c:/Multi%20Agent%20Ai/tools.py).

---

## 🎯 Purpose of `tools.py`

In an Agentic AI architecture, Language Models (LLMs) cannot browse the live internet or read arbitrary web URLs on their own. `tools.py` defines **executable functions** exposed to our AI agents as **Tools** using LangChain's `@tool` decorator.

---

## 📄 Complete Source Code Overview

```python
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
```

---

## 🔍 Detailed Line-by-Line Breakdown

### 1. Imports and Initialization

```python
import os
from dotenv import load_dotenv
from langchain_core.tools import tool
from rich import print
from tavily import TavilyClient
import requests
from bs4 import BeautifulSoup
```

| Import / Statement | Purpose & Why It Was Used |
| :--- | :--- |
| `import os` | Used to access operating system environment variables (specifically API keys). |
| `from dotenv import load_dotenv` | Reads key-value pairs from a `.env` file and sets them into `os.environ`. Keeps sensitive API keys out of source control. |
| `from langchain_core.tools import tool` | The core decorator that converts standard Python functions into LangChain/LangGraph-compatible tools with automatic schema generation. |
| `from tavily import TavilyClient` | The official SDK for Tavily AI, a search engine built specifically for AI agents and LLMs. |
| `import requests` | Standard HTTP library used to send GET requests to web pages. |
| `from bs4 import BeautifulSoup` | HTML parser used to traverse the DOM, remove unwanted elements, and extract human-readable text. |

---

### 2. Tool 1: `web_search`

```python
@tool
def web_search(query: str) -> str:
    """Search the web for the given query and return the results."""
```

#### Why the `@tool` Decorator and Docstring Matter:
- **Automatic Schema Generation**: LangChain inspects the function name (`web_search`), type hints (`query: str -> str`), and docstring (`"""Search the web..."""`).
- **Tool Description for LLM**: When the LLM decides which tool to call, it reads this docstring to understand *when* and *how* to use the tool.

#### The Implementation:
```python
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
```

#### Key Engineering Decisions:
1. **`max_results=5`**: Restricts the search to the top 5 most relevant results to avoid context window explosion.
2. **`content[:200]`**: Truncates initial search snippets to 200 characters. The search agent only needs high-level snippets and URLs to decide what to research deeper.
3. **Structured Output Format**: Formatting results with explicit `Title:`, `URL:`, and `Snippet:` tags makes it easy for downstream agents to parse and select URLs.
4. **Resilient Error Handling**: Returning `f"An error occurred..."` as a string instead of throwing an unhandled exception ensures the agent can read the error and try an alternative query without crashing the entire pipeline.

---

### 3. Tool 2: `scrape_url`

```python
@tool
def scrape_url(url: str) -> str:
    """Scrape and return clean text content from a given URL for deeper reading."""
```

#### The Implementation:
```python
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
```

#### Key Engineering Decisions:
1. **`headers={"User-Agent": "Mozilla/5.0"}`**: Many websites block standard Python `requests` (User-Agent: `python-requests/2.x`). Adding a browser-like User-Agent header bypasses basic anti-bot filters.
2. **`timeout=8`**: Prevents the agent from hanging indefinitely if an external server is slow or unresponsive.
3. **`resp.raise_for_status()`**: Instantly raises an HTTPError for 4xx or 5xx status codes (e.g. 404 Not Found, 403 Forbidden).
4. **`tag.decompose()` on `script`, `style`, `nav`, `footer`**: Strips out JavaScript, CSS, navigation menus, and footers. This dramatically reduces token consumption and eliminates noise.
5. **`soup.get_text(separator=" ", strip=True)[:3000]`**:
   - `separator=" "`: Prevents words from running together across HTML tags.
   - `strip=True`: Removes excess whitespace and blank lines.
   - `[:3000]`: Caps extracted article content at 3,000 characters (approx. 600-750 tokens), maintaining a strict token budget for the LLM.

---

## ❓ Why Did We Choose These Technologies?

### Why Tavily over SerpAPI or Google Search API?
- **Optimized for LLM RAG**: Tavily extracts clean, relevant text content and removes advertising noise before returning results.
- **Speed & Latency**: Built for AI agent workflows with lower response latencies.
- **Direct Search & Answer**: Provides pre-filtered high-credibility domains.

### Why BeautifulSoup over Playwright or Selenium?
- **Lightweight & Fast**: Pure HTTP GET + DOM parsing takes ~200ms vs ~2-5s for headless browser automation.
- **Resource Footprint**: Minimal memory and CPU usage, easily deployable in lightweight serverless containers.
