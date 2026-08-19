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

#writer chain 

    print("\n" + "=" * 50)
    print("step 3 - writer chain is generating the report ...")
    print("=" * 50)

    research_combined=(
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


    # critic chain
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