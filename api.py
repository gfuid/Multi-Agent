import asyncio
import json
import os
import sys
from typing import AsyncGenerator

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from agent import (
    build_reader_agent,
    build_search_agent,
    critic_chain,
    writer_chain,
)

app = FastAPI(
    title="Autonomous Multi-Agent AI Research API",
    description="Backend API powering the 4-step autonomous research & evaluation pipeline",
    version="1.0.0",
)

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ResearchRequest(BaseModel):
    topic: str


@app.get("/api/health")
async def health_check():
    return {
        "status": "online",
        "service": "Multi-Agent AI Research API",
        "tavily_configured": bool(os.getenv("TAVILY_API_KEY")),
        "groq_configured": bool(os.getenv("GROQ_API_KEY")),
    }


async def stream_research_pipeline(topic: str) -> AsyncGenerator[str, None]:
    state = {}

    def format_sse(data: dict) -> str:
        return f"data: {json.dumps(data)}\n\n"

    try:
        # Step 1: Search Agent
        yield format_sse({
            "step": 1,
            "status": "in_progress",
            "name": "Search Agent",
            "message": "Formulating queries and searching the web via Tavily...",
        })

        search_agent = build_search_agent()
        search_results = await asyncio.to_thread(
            search_agent.invoke,
            {
                "messages": [
                    (
                        "user",
                        f"Find recent, relevant and credible information on the topic: {topic}.",
                    )
                ]
            },
        )

        tool_outputs = [
            str(m.content)
            for m in search_results.get("messages", [])
            if getattr(m, "type", "") == "tool" or getattr(m, "content", "")
        ]
        state["search_results"] = "\n\n".join(tool_outputs)

        yield format_sse({
            "step": 1,
            "status": "completed",
            "name": "Search Agent",
            "message": "Authoritative sources and URLs gathered.",
            "data": state["search_results"],
        })

        # Step 2: Reader Agent
        await asyncio.sleep(1.5)
        yield format_sse({
            "step": 2,
            "status": "in_progress",
            "name": "Reader Agent",
            "message": "Selecting the most relevant URL and deep scraping content...",
        })

        reader_agent = build_reader_agent()
        reader_results = await asyncio.to_thread(
            reader_agent.invoke,
            {
                "messages": [
                    (
                        "user",
                        f"Pick the single most relevant URL from these search results and call scrape_url on it:\n\n{state['search_results'][:500]}",
                    )
                ]
            },
        )

        reader_outputs = [
            str(m.content)
            for m in reader_results.get("messages", [])
            if getattr(m, "type", "") == "tool" or getattr(m, "content", "")
        ]
        state["reader_results"] = "\n\n".join(reader_outputs)

        yield format_sse({
            "step": 2,
            "status": "completed",
            "name": "Reader Agent",
            "message": "Target URL scraped and content parsed.",
            "data": state["reader_results"],
        })

        # Small breather to prevent Groq TPM rate limits
        await asyncio.sleep(1.5)

        # Step 3: Writer Chain
        yield format_sse({
            "step": 3,
            "status": "in_progress",
            "name": "Writer Chain",
            "message": "Synthesizing deep research into a structured markdown report...",
        })

        research_combined = (
            f"Search Results:\n{state['search_results'][:500]}\n\n"
            f"Scraped Content:\n{state['reader_results'][:600]}"
        )

        writer_chain_result = await asyncio.to_thread(
            writer_chain.invoke,
            {
                "topic": topic,
                "research": research_combined,
            },
        )
        state["writer_chain_result"] = writer_chain_result

        yield format_sse({
            "step": 3,
            "status": "completed",
            "name": "Writer Chain",
            "message": "Executive research report successfully generated.",
            "data": state["writer_chain_result"],
        })

        # Small breather to prevent Groq TPM rate limits
        await asyncio.sleep(1.0)

        # Step 4: Critic Chain
        yield format_sse({
            "step": 4,
            "status": "in_progress",
            "name": "Critic Chain",
            "message": "Evaluating report structure, citations, and critical risks...",
        })

        critic_chain_result = await asyncio.to_thread(
            critic_chain.invoke,
            {
                "report": state["writer_chain_result"][:1200],
            },
        )
        state["critic_chain_result"] = critic_chain_result

        yield format_sse({
            "step": 4,
            "status": "completed",
            "name": "Critic Chain",
            "message": "Evaluation and rubric grading complete.",
            "data": state["critic_chain_result"],
        })

        # Complete final event
        yield format_sse({
            "step": 5,
            "status": "all_completed",
            "name": "Pipeline",
            "message": "All 4 research pipeline stages finished successfully.",
            "state": state,
        })

    except Exception as e:
        yield format_sse({
            "status": "error",
            "error": str(e),
        })


@app.post("/api/research/stream")
async def research_stream_endpoint(req: ResearchRequest):
    if not req.topic.strip():
        raise HTTPException(status_code=400, detail="Topic cannot be empty")
    return StreamingResponse(
        stream_research_pipeline(req.topic.strip()),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.post("/api/research")
async def research_sync_endpoint(req: ResearchRequest):
    if not req.topic.strip():
        raise HTTPException(status_code=400, detail="Topic cannot be empty")
    
    state = {}
    
    # Run Search
    search_agent = build_search_agent()
    search_results = await asyncio.to_thread(
        search_agent.invoke,
        {"messages": [("user", f"Find recent, relevant and credible information on the topic: {req.topic}.")]},
    )
    tool_outputs = [
        str(m.content)
        for m in search_results.get("messages", [])
        if getattr(m, "type", "") == "tool" or getattr(m, "content", "")
    ]
    state["search_results"] = "\n\n".join(tool_outputs)

    # Run Reader
    reader_agent = build_reader_agent()
    reader_results = await asyncio.to_thread(
        reader_agent.invoke,
        {
            "messages": [
                (
                    "user",
                    f"Based on the following search results about '{req.topic}', "
                    f"pick the most relevant URL and use the scrape_url tool to scrape it for deeper content.\n\n"
                    f"Search Results:\n{state['search_results'][:2000]}",
                )
            ]
        },
    )
    reader_outputs = [
        str(m.content)
        for m in reader_results.get("messages", [])
        if getattr(m, "type", "") == "tool" or getattr(m, "content", "")
    ]
    state["reader_results"] = "\n\n".join(reader_outputs)

    # Run Writer
    research_combined = f"Search Results:\n{state['search_results']}\n\nScraped Content:\n{state['reader_results']}"
    writer_result = await asyncio.to_thread(
        writer_chain.invoke,
        {"topic": req.topic, "research": research_combined},
    )
    state["writer_chain_result"] = writer_result

    # Run Critic
    critic_result = await asyncio.to_thread(
        critic_chain.invoke,
        {"report": state["writer_chain_result"]},
    )
    state["critic_chain_result"] = critic_result

    return state


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
