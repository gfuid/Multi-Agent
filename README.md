# 🤖 Autonomous Multi-Agent AI Research & Evaluation System

An end-to-end full-stack autonomous research platform powered by **LangGraph**, **LangChain**, **FastAPI**, **React (Vite)**, **Groq**, and **Tavily**. The system decomposes a user's research topic into a collaborative 4-step pipeline combining autonomous ReAct agents, deep web scraping, and specialized evaluation chains.

---

## 🏗️ Full-Stack System Architecture

```mermaid
flowchart TD
    User([👤 User / Web UI]) -->|Enter Topic & Click Launch| Frontend[⚛️ React + Vite Frontend]
    Frontend -->|POST /api/research/stream| API[🚀 FastAPI Backend - SSE Stream]
    
    subgraph MultiAgentCore [Autonomous 4-Step Pipeline]
        Step1[🔍 Step 1: Search Agent\n- LangGraph ReAct Agent\n- Tavily Search Tool]
        Step2[📖 Step 2: Deep Reader Agent\n- LangGraph ReAct Agent\n- BeautifulSoup Web Scraper]
        Step3[✍️ Step 3: Report Writer Chain\n- LCEL Pipeline\n- Qwen 27B / Groq LLM]
        Step4[⚖️ Step 4: Critic & Evaluator Chain\n- Rubric Grading (Score X/10, Strengths, Weaknesses)]
    end
    
    API --> Step1
    Step1 -->|Search Results & URLs| Step2
    Step2 -->|Scraped Content + Search Findings| Step3
    Step3 -->|Structured Markdown Draft| Step4
    
    Step1 -.->|SSE Live Progress| Frontend
    Step2 -.->|SSE Live Progress| Frontend
    Step3 -.->|SSE Live Progress| Frontend
    Step4 -.->|SSE Live Progress| Frontend
    
    Step4 -->|Final Report & Score Badge| Frontend
```

---

## ⚡ The 4-Step Pipeline Explained

| Step | Component | Technology | Role |
| :--- | :--- | :--- | :--- |
| **1** | **Search Agent** | LangGraph `create_react_agent` + `tavily` | Autonomously formulates search queries, retrieves recent and authoritative web results with URLs and snippets. |
| **2** | **Reader Agent** | LangGraph `create_react_agent` + `scrape_url` | Inspects the search findings, selects the highest-value URL, fetches raw HTML, cleans boilerplate (navs, scripts, footers), and extracts deep article content. |
| **3** | **Writer Chain** | LCEL (`Prompt \| LLM \| StrOutputParser`) | Synthesizes search summaries and deep-scraped content into a structured, executive-grade research report with citations. |
| **4** | **Critic Chain** | LCEL (`Prompt \| LLM \| StrOutputParser`) | Evaluates the draft report strictly against criteria (completeness, accuracy, citations, risk analysis) and outputs a numeric score and revision verdict. |

---

## 🚀 How to Run Locally

### 1. Prerequisites & Environment
Ensure you have Python 3.10+ and Node.js v18+ installed.

Configure your `.env` file in the root directory:
```env
TAVILY_API_KEY=tvly-...
GROQ_API_KEY=gsk_...
```

---

### 2. Start the Backend (FastAPI)

Open a terminal in the root directory:
```powershell
.\.venv\Scripts\python.exe -m uvicorn api:app --reload --port 8000
```
- **Backend API**: `http://127.0.0.1:8000`
- **Swagger Documentation**: `http://127.0.0.1:8000/docs`

---

### 3. Start the Frontend (React + Vite)

Open a second terminal:
```powershell
cd frontend
npm run dev
```
- **Web Application**: `http://localhost:5173`

---

## 📂 Project Structure & Documentation

```
Multi Agent Ai/
│
├── api.py                    # FastAPI server with Server-Sent Events (SSE) streaming
├── pipeline.py               # CLI pipeline orchestrator and state coordinator
├── agent.py                  # Agent definitions and LCEL prompt chains
├── tools.py                  # Web search (Tavily) and web scraping (BeautifulSoup) tools
├── requirements.txt          # Python dependencies
│
├── frontend/                 # Modern React + Vite Web Application
│   ├── src/
│   │   ├── App.jsx           # Main UI with Live Stepper, Tabs, and Report Viewer
│   │   └── index.css         # Dark theme & glassmorphism design system
│   └── package.json
│
└── docs/                     # Comprehensive Deep-Dive Documentation Suite
    ├── FULLSTACK_EXPLANATION.md       # Full-Stack, SSE streaming, and deployment guide
    ├── TOOLS_DEEP_DIVE.md             # Line-by-line breakdown of tools.py
    ├── AGENTS_DEEP_DIVE.md            # Architecture breakdown of agent.py
    ├── PIPELINE_DEEP_DIVE.md          # Architecture breakdown of pipeline.py
    └── INTERVIEW_QNA_GUIDE.md         # 25+ interview questions and model answers
```

---

## 📚 Direct Documentation Links

- **[Full-Stack Architecture Guide](file:///c:/Multi%20Agent%20Ai/docs/FULLSTACK_EXPLANATION.md)**: Details on SSE streaming, async thread offloading, and cloud deployment.
- **[Tools Deep Dive](file:///c:/Multi%20Agent%20Ai/docs/TOOLS_DEEP_DIVE.md)**: Line-by-line explanation of web searching and web scraping tools.
- **[Agents Deep Dive](file:///c:/Multi%20Agent%20Ai/docs/AGENTS_DEEP_DIVE.md)**: Explanation of ReAct agents, LCEL chains, and prompt strategies.
- **[Pipeline Deep Dive](file:///c:/Multi%20Agent%20Ai/docs/PIPELINE_DEEP_DIVE.md)**: Explanation of state management, message passing, and orchestration.
- **[Interview Q&A Guide](file:///c:/Multi%20Agent%20Ai/docs/INTERVIEW_QNA_GUIDE.md)**: 25+ interview questions with model answers.
