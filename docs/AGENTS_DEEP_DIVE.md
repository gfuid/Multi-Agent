# 🧠 Deep Dive: `agent.py` Explained

This document explains the agentic architecture, LLM configurations, prompt engineering strategies, and LangChain Expression Language (LCEL) chains defined in [`agent.py`](file:///c:/Multi%20Agent%20Ai/agent.py).

---

## 🎯 Purpose of `agent.py`

`agent.py` contains the brain of our system:
1. **The LLM Client**: High-throughput inference configuration.
2. **Autonomous ReAct Agents**: The **Search Agent** and **Reader Agent** built with LangGraph.
3. **Structured LCEL Chains**: The **Writer Chain** and **Critic Chain** implementing the Evaluator-Optimizer pattern.

---

## 📄 Complete Code Overview

```python
import os
from dotenv import load_dotenv
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from tools import scrape_url, web_search
from langgraph.prebuilt import create_react_agent

load_dotenv()

# Free LLM setup using Groq
llm = ChatOpenAI(
    model="qwen/qwen3.6-27b",
    base_url="https://api.groq.com/openai/v1",
    api_key=os.getenv("GROQ_API_KEY"),
    temperature=0,
    max_tokens=4096,
)

# Tools list for the agents
tools = [web_search, scrape_url]

# 1st agent: Autonomous Search Agent
def build_search_agent():
    return create_react_agent(
        model=llm,
        tools=[web_search],
    )  

# 2nd agent: Autonomous Reader Agent
def build_reader_agent():
    return create_react_agent(
        model=llm,
        tools=[scrape_url],
    )

# 3rd component: Report Writer Chain
writer_prompt = ChatPromptTemplate.from_messages(
    [
        ("system", "You are an expert research writer. Write clear, structured and insightful reports."),
        ("human", """Write a detailed research report on the topic below.

Topic: {topic}

Research Gathered:
{research}

Structure the report as:
- Introduction
- Key Findings (minimum 3 well-explained points)
- Conclusion
- Sources (list all URLs found in the research)

Be detailed, factual and professional."""),
    ]
)

writer_chain = writer_prompt | llm | StrOutputParser()

# 4th component: Critic Evaluation Chain
critic_prompt = ChatPromptTemplate.from_messages(
    [
        ("system", "You are a sharp and constructive research critic. Be honest and specific."),
        ("human", """Review the research report below and evaluate it strictly.

Report:
{report}

Respond in this exact format:

Score: X/10

Strengths:
- ...
- ...

Areas for Improvement:
- ...
- ...

One Line Verdict: [Approved / Needs Revision]"""),
    ]
)

critic_chain = critic_prompt | llm | StrOutputParser()
```

---

## 🔍 Detailed Line-by-Line Breakdown

### 1. LLM Setup (Groq OpenAI-Compatible Client)

```python
llm = ChatOpenAI(
    model="qwen/qwen3.6-27b",
    base_url="https://api.groq.com/openai/v1",
    api_key=os.getenv("GROQ_API_KEY"),
    temperature=0,
    max_tokens=4096,
)
```

| Parameter | Value | Why It Was Configured This Way |
| :--- | :--- | :--- |
| `model` | `"qwen/qwen3.6-27b"` | A state-of-the-art open-weights model hosted on Groq LPU hardware offering near-instant token generation and strong reasoning. |
| `base_url` | `"https://api.groq.com/openai/v1"` | Groq supports the standard OpenAI API specification. By setting `base_url`, `ChatOpenAI` connects directly to Groq with zero third-party wrappers. |
| `api_key` | `os.getenv("GROQ_API_KEY")` | Reads your free Groq API key securely from `.env`. |
| `temperature` | `0` | **Deterministic Output**: Ensures factual consistency, suppresses hallucinations, and produces objective evaluations. |
| `max_tokens` | `4096` | Prevents the LLM from truncating long research reports mid-sentence. |

---

### 2. Autonomous Agents (`create_react_agent`)

```python
def build_search_agent():
    return create_react_agent(
        model=llm,
        tools=[web_search],
    )

def build_reader_agent():
    return create_react_agent(
        model=llm,
        tools=[scrape_url],
    )
```

#### What is the ReAct Framework?
**ReAct** stands for **Reasoning + Acting**. Instead of generating an answer in one shot, the agent operates in an iterative loop:
1. **Thought**: "I need to find recent information about Topic X."
2. **Action**: Call `web_search(query="Topic X 2026")`.
3. **Observation**: Read search results and URLs.
4. **Thought**: "I have the results, let me summarize them."
5. **Final Output**: Output the synthesized findings.

#### Why Separate Search Agent and Reader Agent?
- **Single Responsibility Principle**: Specializing each agent with only the tool it needs reduces tool hallucination and prompt confusion.
- **Modularity**: The search agent focuses purely on discovering high-credibility sources; the reader agent focuses purely on deep extraction.

---

### 3. The Writer Chain (`writer_chain`)

```python
writer_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are an expert research writer. Write clear, structured and insightful reports."),
    ("human", """Write a detailed research report on the topic below...""")
])

writer_chain = writer_prompt | llm | StrOutputParser()
```

#### Why LCEL (LangChain Expression Language)?
The pipe operator `|` chains components together seamlessly:
$$\text{Input Dictionary} \longrightarrow \text{Prompt Formatting} \longrightarrow \text{LLM Call} \longrightarrow \text{String Parser} \longrightarrow \text{Final Markdown}$$

- **Streaming & Async Ready**: LCEL components natively support `.stream()`, `.astream()`, and `.ainvoke()`.
- **Lightweight**: No legacy boilerplate or wrapper classes.

#### Prompt Engineering Features:
- **Explicit Output Structure**: Mandates Introduction, Key Findings (minimum 3 points), Conclusion, and Sources.
- **Source Verification**: Explicitly requires listing all URLs discovered during research to ensure verifiable citations.

---

### 4. The Critic Chain (`critic_chain`)

```python
critic_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a sharp and constructive research critic. Be honest and specific."),
    ("human", """Review the research report below and evaluate it strictly...""")
])

critic_chain = critic_prompt | llm | StrOutputParser()
```

#### The Evaluator-Optimizer Pattern
In production AI engineering, never trust raw LLM output blindly. The Critic Chain acts as an automated quality gate:
- **Strict Scoring**: Assigns an objective score ($X/10$).
- **Identifies Blind Spots**: Highlights missing citations, superficial risk analysis, or ungrounded claims.
- **Definitive Verdict**: Issues an actionable verdict (`[Approved / Needs Revision]`).
