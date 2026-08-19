# 🔄 Deep Dive: `pipeline.py` Explained

This document explains the pipeline orchestrator, state management, message aggregation, and execution flow implemented in [`pipeline.py`](file:///c:/Multi%20Agent%20Ai/pipeline.py).

---

## 🎯 Purpose of `pipeline.py`

`pipeline.py` is the **Orchestrator** of the multi-agent system. It manages:
1. **Shared State**: Passing intermediate data and findings between stages.
2. **Execution Ordering**: Coordinating the 4-step sequence (Search $\to$ Read $\to$ Write $\to$ Critique).
3. **Payload Extraction**: Filtering and preserving tool outputs (URLs, raw text) for downstream agents.
4. **Environment Resiliency**: Handling console encodings and cross-platform execution.

---

## 📄 Complete Source Code Overview

```python
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from agent import (
    build_reader_agent,
    build_search_agent,
    critic_chain,
    writer_chain,
)


def run_research_pipeline(topic: str) -> dict:
    state = {}

    # Step 1: Search agent working
    print("\n" + "=" * 50)
    print("step 1 - search agent is working ...")
    print("=" * 50)

    search_agent = build_search_agent()
    search_results = search_agent.invoke(
        {
            "messages": [
                (
                    "user",
                    f"Find recent, relevant and credible information on the topic: {topic}.",
                )
            ]
        }
    )

    # Extract tool contents (which have raw URLs) plus final AI response
    tool_outputs = [
        str(m.content)
        for m in search_results.get("messages", [])
        if getattr(m, "type", "") == "tool" or getattr(m, "content", "")
    ]
    state["search_results"] = "\n\n".join(tool_outputs)
    print("\nsearch result:\n", state["search_results"])

    # Step 2: Reader agent working
    print("\n" + "=" * 50)
    print("step 2 - reader agent is scraping the URLs ...")
    print("=" * 50)

    reader_agent = build_reader_agent()
    reader_results = reader_agent.invoke(
        {
            "messages": [
                (
                    "user",
                    f"Based on the following search results about '{topic}', "
                    f"pick the most relevant URL and use the scrape_url tool to scrape it for deeper content.\n\n"
                    f"Search Results:\n{state['search_results'][:2000]}",
                )
            ]
        }
    )

    reader_outputs = [
        str(m.content)
        for m in reader_results.get("messages", [])
        if getattr(m, "type", "") == "tool" or getattr(m, "content", "")
    ]
    state["reader_results"] = "\n\n".join(reader_outputs)
    print("\nreader result:\n", state["reader_results"])

    # Step 3: Writer chain is generating the report
    print("\n" + "=" * 50)
    print("step 3 - writer chain is generating the report ...")
    print("=" * 50)

    research_combined = (
        f"Search Results:\n{state['search_results']}\n\n"
        f"Scraped Content:\n{state['reader_results']}"
    )

    writer_chain_result = writer_chain.invoke(
        {
            "topic": topic,
            "research": research_combined,
        }
    )

    state["writer_chain_result"] = writer_chain_result
    print("\nwriter chain result:\n", state["writer_chain_result"])

    # Step 4: Critic chain is reviewing the report
    print("\n" + "=" * 50)
    print("step 4 - critic chain is reviewing the report ...")
    print("=" * 50)

    critic_chain_result = critic_chain.invoke(
        {
            "report": state["writer_chain_result"],
        }
    )

    state["critic_chain_result"] = critic_chain_result
    print("\ncritic chain result:\n", state["critic_chain_result"])

    return state


if __name__ == "__main__":
    topic = input("Enter a research topic: ")
    run_research_pipeline(topic)
```

---

## 🔍 Detailed Line-by-Line Breakdown

### 1. UTF-8 Console Reconfiguration

```python
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
```

#### Why is this necessary?
- On Windows operating systems, the default console encoding is often `cp1252` or `cp437`.
- When LLMs output unicode characters (such as emojis `🤖`, checkmarks `✓`, quotes `“ ”`, or non-Latin alphabets), Python's default Windows console crashes with `UnicodeEncodeError: 'charmap' codec can't encode character`.
- `sys.stdout.reconfigure(encoding="utf-8", errors="replace")` prevents any encoding crashes across all platforms.

---

### 2. The State Dictionary (`state = {}`)

```python
state = {}
```

#### Architectural Pattern: Shared Blackboard
Instead of tightly coupling the agents together, the pipeline uses a shared `state` dictionary:
- `state["search_results"]`: Raw search output + AI summary.
- `state["reader_results"]`: Deep scraped web content.
- `state["writer_chain_result"]`: Draft research report.
- `state["critic_chain_result"]`: Evaluation score, strengths, and critique.

---

### 3. Step 1: Invoking Search & Extracting Tool Payloads

```python
search_agent = build_search_agent()
search_results = search_agent.invoke({
    "messages": [("user", f"Find recent, relevant and credible information on the topic: {topic}.")]
})

tool_outputs = [
    str(m.content)
    for m in search_results.get("messages", [])
    if getattr(m, "type", "") == "tool" or getattr(m, "content", "")
]
state["search_results"] = "\n\n".join(tool_outputs)
```

#### Why do we parse the messages list?
When a LangGraph ReAct agent executes, its `messages` list contains:
1. `HumanMessage`: The user query.
2. `AIMessage`: The model's tool call request.
3. `ToolMessage`: The raw tool response from Tavily (which contains the actual URLs).
4. `AIMessage`: The model's final response.

By capturing `ToolMessage` and non-empty `AIMessage` items, we guarantee the downstream Reader Agent receives the exact URLs to scrape.

---

### 4. Step 2: Deep Reader Agent

```python
reader_agent = build_reader_agent()
reader_results = reader_agent.invoke({
    "messages": [
        (
            "user",
            f"Based on the following search results about '{topic}', "
            f"pick the most relevant URL and use the scrape_url tool to scrape it for deeper content.\n\n"
            f"Search Results:\n{state['search_results'][:2000]}",
        )
    ]
})
```

#### Context Window Management (`[:2000]`):
- The search results are trimmed to the first 2,000 characters to keep the prompt concise and prevent unnecessary token consumption while preserving the top URLs and snippets.

---

### 5. Step 3: Writer Chain Synthesis

```python
research_combined = (
    f"Search Results:\n{state['search_results']}\n\n"
    f"Scraped Content:\n{state['reader_results']}"
)

writer_chain_result = writer_chain.invoke({
    "topic": topic,
    "research": research_combined,
})
state["writer_chain_result"] = writer_chain_result
```

- Synthesizes both high-level search coverage and deep page content into a comprehensive report.

---

### 6. Step 4: Critic Chain Evaluation

```python
critic_chain_result = critic_chain.invoke({
    "report": state["writer_chain_result"],
})
state["critic_chain_result"] = critic_chain_result
```

- Sends the complete generated draft to the Critic Chain for quality evaluation and rubric scoring.
