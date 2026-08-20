import os
from dotenv import load_dotenv
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from tools import scrape_url, web_search
from langgraph.prebuilt import create_react_agent

load_dotenv()

# High-speed LLM setup using Groq (Configured with auto-retry and safe token limits)
llm = ChatOpenAI(
    model=os.getenv("GROQ_MODEL", "openai/gpt-oss-20b"),
    base_url="https://api.groq.com/openai/v1",
    api_key=os.getenv("GROQ_API_KEY"),
    temperature=0,
    max_tokens=1000,
    max_retries=5,
    timeout=30,
)

# Tools list for the agents
tools = [web_search, scrape_url]


# 1st agent: Fast Search Agent
def build_search_agent():
    return create_react_agent(
        model=llm,
        tools=[web_search],
        prompt="You are an autonomous search agent. Use the web_search tool with a query parameter to search for credible web information.",
    )  


# 2nd agent: Deep Reader Agent
def build_reader_agent():
    return create_react_agent(
        model=llm,
        tools=[scrape_url],
        prompt="You are a reader agent. Use the scrape_url tool with a url parameter to extract full article text.",
    )


#writer chain

writer_prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You are an expert research writer. Write clear, structured and insightful reports.",
        ),
        (
            "human",
            """Write a detailed research report on the topic below.

Topic: {topic}

Research Gathered:
{research}

Structure the report as:
- Introduction
- Key Findings (minimum 3 well-explained points)
- Conclusion
- Sources (list all URLs found in the research)

Be detailed, factual and professional.""",
        ),
    ]
)


writer_chain = writer_prompt | llm | StrOutputParser()




# critic_chain

critic_prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You are a sharp and constructive research critic. Be honest and specific.",
        ),
        (
            "human",
            """Review the research report below and evaluate it strictly.

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

One Line Verdict: [Approved / Needs Revision]""",
        ),
    ]
)




critic_chain = critic_prompt | llm | StrOutputParser()