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
    import time
    time.sleep(1.5)

    print("\n" + "=" * 50)
    print("step 2 - reader agent is scraping the URLs ...")
    print("=" * 50)

    reader_agent = build_reader_agent()
    reader_results = reader_agent.invoke(
        {
            "messages": [
                (
                    "user",
                    f"Pick the single best URL from these search results and call scrape_url on it:\n\n{state['search_results'][:600]}",
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

    # Step 3: Writer chain
    time.sleep(1.5)

    print("\n" + "=" * 50)
    print("step 3 - writer chain is generating the report ...")
    print("=" * 50)

    research_combined = (
        f"Search Results:\n{state['search_results'][:500]}\n\n"
        f"Scraped Content:\n{state['reader_results'][:600]}"
    )

    writer_chain_result = writer_chain.invoke(
        {
            "topic": topic,
            "research": research_combined,
        }
    )

    state["writer_chain_result"] = writer_chain_result
    print("\nwriter chain result:\n", state["writer_chain_result"])

    # Step 4: Critic chain
    time.sleep(1.5)

    print("\n" + "=" * 50)
    print("step 4 - critic chain is reviewing the report ...")
    print("=" * 50)

    critic_chain_result = critic_chain.invoke(
        {
            "report": state["writer_chain_result"][:1200],
        }
    )

    state["critic_chain_result"] = critic_chain_result
    print("\ncritic chain result:\n", state["critic_chain_result"])

    return state



if __name__ == "__main__":
    topic = input("Enter a research topic: ")
    run_research_pipeline(topic)