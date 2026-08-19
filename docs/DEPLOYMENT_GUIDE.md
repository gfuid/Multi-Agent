# 🚀 Full-Stack Deployment Guide

This guide explains **exactly which files to deploy**, **how to keep your secret API keys safe**, and **how to deploy the Frontend on Vercel and Backend on Render (100% Free)**.

---

## 1. 📂 Which Files Are Backend vs Frontend?

Your project is a **Full-Stack Multi-Agent AI System** composed of two parts:

```
Multi Agent Ai/
│
├── 🐍 BACKEND (Python FastAPI)
│   ├── api.py               <-- FastAPI Server & SSE streaming endpoint
│   ├── agent.py             <-- ReAct Agents & LangChain Chains (Groq LLM)
│   ├── tools.py             <-- Tavily Search & BeautifulSoup Scraper
│   ├── pipeline.py          <-- Console orchestrator & shared state
│   ├── requirements.txt     <-- Python packages to install
│   ├── Procfile             <-- Start command for cloud hosting
│   └── Dockerfile           <-- (Optional) Container build file
│
├── ⚛️ FRONTEND (React + Vite)
│   ├── frontend/
│   │   ├── src/             <-- React components & CSS design system
│   │   ├── index.html       <-- HTML template & Google Fonts
│   │   ├── package.json     <-- Node dependencies
│   │   ├── vite.config.js   <-- Vite builder config
│   │   └── vercel.json      <-- Vercel SPA routing rewrites
│
└── 🔒 SECURITY
    ├── .gitignore           <-- Prevents .env & .venv from leaking to GitHub
    └── .env.example         <-- Template of required environment variables
```

---

## 2. 🛡️ Secret Protection (Never Push `.env` to GitHub)

We have created `.gitignore` at the project root. This ensures that:
- `.env` (your actual secret Groq & Tavily API keys) will **never** be committed to GitHub.
- `.venv/` (your local python packages) and `node_modules/` will **never** be committed.

---

## 3. 🌐 Step-by-Step Deployment (Free Tier)

### 🟢 STEP 1: Push Your Code to GitHub

1. Initialize and commit your code to Git:
```bash
git add .
git commit -m "Ready for production deployment"
```
2. Create a new repository on [GitHub](https://github.com/new) (e.g. `multi-agent-ai`).
3. Push your repository:
```bash
git remote add origin https://github.com/YOUR_USERNAME/multi-agent-ai.git
git branch -M main
git push -u origin main
```

---

### 🟣 STEP 2: Deploy the Backend on Render.com (Free)

FastAPI requires a Python runtime to execute agentic loops and LangGraph. **Render** provides free web services for Python:

1. Sign up for free at [render.com](https://render.com).
2. Click **New +** $\rightarrow$ **Web Service**.
3. Connect your GitHub repository (`multi-agent-ai`).
4. Configure the service:
   - **Name**: `multi-agent-ai-api`
   - **Language**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn api:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: `Free`
5. **Add Environment Variables** (under the "Environment" tab):
   - `GROQ_API_KEY`: *(paste your Groq API key)*
   - `TAVILY_API_KEY`: *(paste your Tavily API key)*
6. Click **Deploy Web Service**.
7. Once deployed, Render will provide your public Backend URL:
   `https://multi-agent-ai-api.onrender.com`

*(Test it by visiting `https://multi-agent-ai-api.onrender.com/api/health` in your browser. It will return `{"status":"online"}`).*

---

### 🔺 STEP 3: Deploy the Frontend on Vercel

Vercel provides ultra-fast global hosting for React & Vite:

1. Go to [vercel.com](https://vercel.com) and click **Add New...** $\rightarrow$ **Project**.
2. Import your GitHub repository (`multi-agent-ai`).
3. In the project configuration:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click **Edit** and choose `frontend` *(CRITICAL STEP!)*.
4. Expand **Environment Variables** and add:
   - **Key**: `VITE_API_BASE_URL`
   - **Value**: `https://multi-agent-ai-api.onrender.com` *(Your Render backend URL from Step 2)*
5. Click **Deploy**.

---

## 4. 🎉 Verification & Testing

Once Vercel finishes building (usually 30 seconds), your live multi-agent app will be online at:
`https://your-project.vercel.app`

### Checklist:
- [x] Top header shows **"FastAPI Online"** with a green glowing status dot.
- [x] Searching a topic live triggers the **Search Agent $\to$ Reader Agent $\to$ Writer Chain $\to$ Critic QA**.
- [x] Clicking **Download .MD** or **Print to PDF** exports a clean executive report.
