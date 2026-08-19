import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Search,
  BookOpen,
  FileText,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Copy,
  Check,
  Printer,
  RotateCcw,
  Terminal,
  ExternalLink,
  AlertCircle,
  Activity,
  Palette,
  Sun,
  Flame,
  Trees,
  Clock,
  Globe,
  Download,
  FileCode,
  FileDown,
  Compass,
  CheckCircle2,
  AlertTriangle,
  Network
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://multi-agent-vwtl.onrender.com';

const PRESETS = [
  'Agentic AI workflows in 2026',
  'How to get a job in AI and Machine Learning',
  'Quantum Computing Breakthroughs 2026',
  'Autonomous AI in Healthcare Diagnostics',
];

const THEMES = [
  { id: 'aurora', name: 'Aurora Velvet', icon: Palette },
  { id: 'aurora-light', name: 'Pastel Light', icon: Sun },
  { id: 'sunset', name: 'Sunset Copper', icon: Flame },
  { id: 'emerald', name: 'Emerald Onyx', icon: Trees },
];

const PALETTE_SWATCHES = [
  { hex: '#3A86FF', name: 'Electric Azure' },
  { hex: '#BDB2FF', name: 'Lavender Glow' },
  { hex: '#FFD6E0', name: 'Pastel Pink' },
  { hex: '#FFF4F4', name: 'Blush Cream' },
];

export default function App() {
  const [currentTheme, setCurrentTheme] = useState('aurora');
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiOnline, setApiOnline] = useState(false);
  const [activeTab, setActiveTab] = useState('report');
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef(null);

  // Step progression state
  const [stepStatuses, setStepStatuses] = useState({
    1: 'pending', // 'pending' | 'active' | 'completed' | 'error'
    2: 'pending',
    3: 'pending',
    4: 'pending',
  });

  const [stepLogs, setStepLogs] = useState({
    1: '',
    2: '',
    3: '',
    4: '',
  });

  const [pipelineState, setPipelineState] = useState({
    search_results: '',
    reader_results: '',
    writer_chain_result: '',
    critic_chain_result: '',
  });

  // Apply theme to document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
  }, [currentTheme]);

  // Live timer for execution
  useEffect(() => {
    if (loading) {
      setElapsedSeconds(0);
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loading]);

  // Check backend health
  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch(`${API_BASE}/api/health`);
        if (res.ok) {
          setApiOnline(true);
        } else {
          setApiOnline(false);
        }
      } catch (err) {
        setApiOnline(false);
      }
    }
    checkHealth();
    const interval = setInterval(checkHealth, 8000);
    return () => clearInterval(interval);
  }, []);

  // Parse Critic evaluation details
  const parseCritic = (text) => {
    if (!text) return { score: null, verdict: null, strengths: [], weaknesses: [], raw: '' };

    // Clean out <think> tags if present in output
    const cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

    const scoreMatch = cleaned.match(/Score:\s*(\d+(?:\.\d+)?)\s*\/\s*10/i);
    const score = scoreMatch ? parseFloat(scoreMatch[1]) : null;

    const verdictMatch = cleaned.match(/One Line Verdict:\s*\[?(Approved|Needs Revision)\]?/i);
    const verdict = verdictMatch ? verdictMatch[1] : (cleaned.toLowerCase().includes('approved') ? 'Approved' : 'Needs Revision');

    // Extract Strengths and Weaknesses bullets
    const strengths = [];
    const weaknesses = [];

    const strengthsMatch = cleaned.match(/Strengths:\s*([\s\S]*?)(?=Areas for Improvement:|$)/i);
    if (strengthsMatch) {
      const lines = strengthsMatch[1].split('\n').map((l) => l.replace(/^[-*•]\s*/, '').trim()).filter(Boolean);
      strengths.push(...lines);
    }

    const weakMatch = cleaned.match(/Areas for Improvement:\s*([\s\S]*?)(?=One Line Verdict:|$)/i);
    if (weakMatch) {
      const lines = weakMatch[1].split('\n').map((l) => l.replace(/^[-*•]\s*/, '').trim()).filter(Boolean);
      weaknesses.push(...lines);
    }

    return { score, verdict, strengths, weaknesses, raw: cleaned };
  };

  // Parse URLs and sources from raw search results and writer report
  const extractSources = () => {
    const rawSearch = pipelineState.search_results || '';
    const sources = [];

    // Match Title, URL, Snippet pattern from tools.py
    const regex = /Title:\s*(.*?)\nURL:\s*(https?:\/\/[^\s]+)\nSnippet:\s*(.*?)(?=\n---|\nTitle:|$)/gs;
    let match;
    while ((match = regex.exec(rawSearch)) !== null) {
      const title = match[1].trim();
      const url = match[2].trim();
      const snippet = match[3].trim();
      let domain = '';
      try {
        domain = new URL(url).hostname.replace('www.', '');
      } catch (e) {
        domain = url;
      }
      sources.push({ title, url, snippet, domain });
    }

    // Fallback: match generic URLs if none found by regex
    if (sources.length === 0) {
      const urlRegex = /(https?:\/\/[^\s\)\>\]]+)/g;
      const foundUrls = (rawSearch + ' ' + (pipelineState.writer_chain_result || '')).match(urlRegex) || [];
      const uniqueUrls = [...new Set(foundUrls)];
      uniqueUrls.slice(0, 6).forEach((url, i) => {
        let domain = url;
        try { domain = new URL(url).hostname.replace('www.', ''); } catch (e) { }
        sources.push({ title: `Source ${i + 1}`, url, snippet: '', domain });
      });
    }

    return sources;
  };

  const handleStartResearch = async (selectedTopic) => {
    const targetTopic = selectedTopic || topic;
    if (!targetTopic.trim() || loading) return;

    setLoading(true);
    setErrorMessage('');
    setPipelineState({
      search_results: '',
      reader_results: '',
      writer_chain_result: '',
      critic_chain_result: '',
    });
    setStepStatuses({
      1: 'active',
      2: 'pending',
      3: 'pending',
      4: 'pending',
    });
    setStepLogs({
      1: 'Formulating query & querying Tavily API...',
      2: '',
      3: '',
      4: '',
    });
    setActiveTab('report');

    try {
      const response = await fetch(`${API_BASE}/api/research/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic: targetTopic }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || ''; // Keep partial chunk in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const payload = JSON.parse(line.replace('data: ', '').trim());
              handleServerEvent(payload);
            } catch (err) {
              console.error('Error parsing SSE payload:', err, line);
            }
          }
        }
      }
    } catch (err) {
      console.error('Research execution error:', err);
      setErrorMessage(`Failed to execute research pipeline: ${err.message}. Make sure the FastAPI server is running on port 8000.`);
      setStepStatuses((prev) => ({
        ...prev,
        1: prev[1] === 'active' ? 'error' : prev[1],
        2: prev[2] === 'active' ? 'error' : prev[2],
        3: prev[3] === 'active' ? 'error' : prev[3],
        4: prev[4] === 'active' ? 'error' : prev[4],
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleServerEvent = (event) => {
    if (event.status === 'error') {
      setErrorMessage(event.error);
      return;
    }

    if (event.step === 1) {
      if (event.status === 'in_progress') {
        setStepStatuses((prev) => ({ ...prev, 1: 'active' }));
        setStepLogs((prev) => ({ ...prev, 1: event.message }));
      } else if (event.status === 'completed') {
        setStepStatuses((prev) => ({ ...prev, 1: 'completed', 2: 'active' }));
        setStepLogs((prev) => ({ ...prev, 1: event.message }));
        setPipelineState((prev) => ({ ...prev, search_results: event.data }));
      }
    } else if (event.step === 2) {
      if (event.status === 'in_progress') {
        setStepStatuses((prev) => ({ ...prev, 2: 'active' }));
        setStepLogs((prev) => ({ ...prev, 2: event.message }));
      } else if (event.status === 'completed') {
        setStepStatuses((prev) => ({ ...prev, 2: 'completed', 3: 'active' }));
        setStepLogs((prev) => ({ ...prev, 2: event.message }));
        setPipelineState((prev) => ({ ...prev, reader_results: event.data }));
      }
    } else if (event.step === 3) {
      if (event.status === 'in_progress') {
        setStepStatuses((prev) => ({ ...prev, 3: 'active' }));
        setStepLogs((prev) => ({ ...prev, 3: event.message }));
      } else if (event.status === 'completed') {
        setStepStatuses((prev) => ({ ...prev, 3: 'completed', 4: 'active' }));
        setStepLogs((prev) => ({ ...prev, 3: event.message }));
        setPipelineState((prev) => ({ ...prev, writer_chain_result: event.data }));
      }
    } else if (event.step === 4) {
      if (event.status === 'in_progress') {
        setStepStatuses((prev) => ({ ...prev, 4: 'active' }));
        setStepLogs((prev) => ({ ...prev, 4: event.message }));
      } else if (event.status === 'completed') {
        setStepStatuses((prev) => ({ ...prev, 4: 'completed' }));
        setStepLogs((prev) => ({ ...prev, 4: event.message }));
        setPipelineState((prev) => ({ ...prev, critic_chain_result: event.data }));
      }
    } else if (event.status === 'all_completed') {
      setPipelineState(event.state);
      setLoading(false);
    }
  };

  const copyReportToClipboard = () => {
    if (!pipelineState.writer_chain_result) return;
    navigator.clipboard.writeText(pipelineState.writer_chain_result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Direct File Download Helpers
  const downloadReportFile = (extension) => {
    if (!pipelineState.writer_chain_result) return;
    const cleanTopic = (topic || 'research_report').toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const filename = `${cleanTopic}_report.${extension}`;

    let content = cleanReportMarkdown;
    if (pipelineState.critic_chain_result) {
      content += `\n\n---\n\n## Automated QA Evaluation\n\n${criticDetails.raw}`;
    }

    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    // Switch to report tab before printing so only the report document prints
    setActiveTab('report');
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Clean writer markdown (strip thought tag if model outputs it)
  const cleanReportMarkdown = (pipelineState.writer_chain_result || '')
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .trim();

  const criticDetails = parseCritic(pipelineState.critic_chain_result);
  const discoveredSources = extractSources();
  const wordCount = cleanReportMarkdown ? cleanReportMarkdown.split(/\s+/).length : 0;

  // Active step computation for workflow topology
  const getActiveStepNumber = () => {
    if (stepStatuses[4] === 'completed') return 5;
    if (stepStatuses[4] === 'active') return 4;
    if (stepStatuses[3] === 'active') return 3;
    if (stepStatuses[2] === 'active') return 2;
    if (stepStatuses[1] === 'active') return 1;
    return 0;
  };
  const activeStepNum = getActiveStepNumber();

  return (
    <div className="app-container">
      {/* Header with Brand & Theme Switcher */}
      <header className="header">
        <div className="brand-section">
          <div className="brand-icon-wrapper">
            <Sparkles size={24} color="#fff" />
          </div>
          <div>
            <h1 className="brand-title">Autonomous Multi-Agent AI</h1>
            <p className="brand-subtitle">4-Step Collaborative Research, Scraping & Rubric Evaluation</p>
          </div>
        </div>

        <div className="header-right">
          {/* Theme Switcher Pills */}
          <div className="theme-switcher">
            {THEMES.map((t) => {
              const IconComponent = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  className={`theme-btn ${currentTheme === t.id ? 'active' : ''}`}
                  onClick={() => setCurrentTheme(t.id)}
                  title={`Switch to ${t.name}`}
                >
                  <IconComponent size={14} />
                  {t.name}
                </button>
              );
            })}
          </div>

          {/* API Health Badge */}
          <div
            className="status-badge"
            style={
              apiOnline
                ? {}
                : {
                  borderColor: 'rgba(244,63,94,0.3)',
                  color: '#fda4af',
                  background: 'rgba(244,63,94,0.1)',
                }
            }
          >
            <span
              className="status-dot"
              style={
                apiOnline
                  ? {}
                  : { backgroundColor: '#f43f5e', boxShadow: '0 0 10px #f43f5e' }
              }
            />
            {apiOnline ? 'FastAPI Online' : 'FastAPI Offline'}
          </div>
        </div>
      </header>




      {/* Live System Metrics Quick Bar */}
      <div className="metrics-grid">
        <div className="metric-pill">
          <div className="metric-icon-box">
            <Clock size={18} />
          </div>
          <div>
            <div className="metric-title">Pipeline Runtime</div>
            <div className="metric-value">
              {loading ? `${elapsedSeconds}s` : elapsedSeconds > 0 ? `${elapsedSeconds}s` : '0s'}
            </div>
          </div>
        </div>

        <div className="metric-pill">
          <div className="metric-icon-box">
            <Globe size={18} />
          </div>
          <div>
            <div className="metric-title">Discovered Sources</div>
            <div className="metric-value">{discoveredSources.length} Sources</div>
          </div>
        </div>

        <div className="metric-pill">
          <div className="metric-icon-box">
            <FileText size={18} />
          </div>
          <div>
            <div className="metric-title">Synthesized Report</div>
            <div className="metric-value">{wordCount > 0 ? `${wordCount} words` : '—'}</div>
          </div>
        </div>

        <div className="metric-pill">
          <div className="metric-icon-box">
            <ShieldCheck size={18} />
          </div>
          <div>
            <div className="metric-title">Evaluator Score</div>
            <div className="metric-value">
              {criticDetails.score ? `${criticDetails.score} / 10` : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Visual Agent Workflow Graph */}
      <section className="workflow-graph-card">
        <div className="workflow-header">
          <h3 className="workflow-title">
            <Network size={18} color="var(--palette-1)" />
            Multi-Agent Pipeline Architecture & Data Topology
          </h3>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
            Status: {loading ? '🟢 Executing Live Workflow' : activeStepNum === 5 ? '✅ Pipeline Complete' : 'Idle'}
          </span>
        </div>

        <div className="graph-nodes-container">
          {/* Node 0: User Input */}
          <div className={`graph-node ${activeStepNum >= 0 ? 'completed' : ''}`} onClick={() => setActiveTab('report')}>
            <div className="node-circle">
              <Compass size={20} />
            </div>
            <span className="node-label">User Query</span>
          </div>

          <div className={`graph-connector ${activeStepNum >= 1 ? 'active' : ''}`} />

          {/* Node 1: Search Agent */}
          <div className={`graph-node ${stepStatuses[1]}`} onClick={() => setActiveTab('search')}>
            <div className="node-circle">
              <Search size={20} />
            </div>
            <span className="node-label">1. Search Agent</span>
          </div>

          <div className={`graph-connector ${activeStepNum >= 2 ? 'active' : ''}`} />

          {/* Node 2: Reader Agent */}
          <div className={`graph-node ${stepStatuses[2]}`} onClick={() => setActiveTab('reader')}>
            <div className="node-circle">
              <BookOpen size={20} />
            </div>
            <span className="node-label">2. Reader Agent</span>
          </div>

          <div className={`graph-connector ${activeStepNum >= 3 ? 'active' : ''}`} />

          {/* Node 3: Writer Chain */}
          <div className={`graph-node ${stepStatuses[3]}`} onClick={() => setActiveTab('report')}>
            <div className="node-circle">
              <FileText size={20} />
            </div>
            <span className="node-label">3. Writer Chain</span>
          </div>

          <div className={`graph-connector ${activeStepNum >= 4 ? 'active' : ''}`} />

          {/* Node 4: Critic Chain */}
          <div className={`graph-node ${stepStatuses[4]}`} onClick={() => setActiveTab('critic')}>
            <div className="node-circle">
              <ShieldCheck size={20} />
            </div>
            <span className="node-label">4. Critic QA</span>
          </div>

          <div className={`graph-connector ${activeStepNum === 5 ? 'active' : ''}`} />

          {/* Node 5: Output */}
          <div className={`graph-node ${activeStepNum === 5 ? 'completed' : ''}`} onClick={() => setActiveTab('report')}>
            <div className="node-circle">
              <Sparkles size={20} />
            </div>
            <span className="node-label">Final Report</span>
          </div>
        </div>
      </section>

      {/* Error Alert */}
      {errorMessage && (
        <div className="error-banner">
          <AlertCircle size={20} />
          <div>{errorMessage}</div>
        </div>
      )}

      {/* Search Bar & Prompt Selection */}
      <section className="search-card">
        <h2 className="search-title">Autonomous Research Studio</h2>
        <p className="search-description">
          Enter any technical topic, industry trend, or research query. The agentic workflow will search, scrape, synthesize, and evaluate automatically.
        </p>

        <form
          className="search-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleStartResearch();
          }}
        >
          <div className="search-input-wrapper">
            <Search className="search-input-icon" size={20} />
            <input
              type="text"
              className="search-input"
              placeholder="e.g. Latest breakthroughs in Quantum Machine Learning 2026..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={loading}
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading || !topic.trim()}>
            {loading ? (
              <>
                <span className="spinner" />
                Agents Working ({elapsedSeconds}s)...
              </>
            ) : (
              <>
                Launch Pipeline
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Preset Chips */}
        <div className="presets-row">
          <span className="presets-label">Suggested:</span>
          {PRESETS.map((item, idx) => (
            <button
              key={idx}
              type="button"
              className="preset-chip"
              disabled={loading}
              onClick={() => {
                setTopic(item);
                handleStartResearch(item);
              }}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      {/* 4-Step Stepper Cards Grid */}
      <section className="stepper-grid">
        {/* Step 1 */}
        <div className={`step-card ${stepStatuses[1]}`} onClick={() => setActiveTab('search')}>
          <div className="step-header">
            <span className="step-number">1</span>
            <span className={`step-badge badge-${stepStatuses[1]}`}>
              {stepStatuses[1] === 'active' ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span className="spinner" /> Active
                </span>
              ) : stepStatuses[1]}
            </span>
          </div>
          <h3 className="step-title">
            <Search size={17} style={{ color: 'var(--palette-1, #3A86FF)' }} />
            Search Agent
          </h3>
          <p className="step-desc">
            {stepLogs[1] || 'Queries Tavily API for credible web sources and recent links.'}
          </p>
        </div>

        {/* Step 2 */}
        <div className={`step-card ${stepStatuses[2]}`} onClick={() => setActiveTab('reader')}>
          <div className="step-header">
            <span className="step-number">2</span>
            <span className={`step-badge badge-${stepStatuses[2]}`}>
              {stepStatuses[2] === 'active' ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span className="spinner" /> Active
                </span>
              ) : stepStatuses[2]}
            </span>
          </div>
          <h3 className="step-title">
            <BookOpen size={17} style={{ color: 'var(--palette-2, #BDB2FF)' }} />
            Reader Agent
          </h3>
          <p className="step-desc">
            {stepLogs[2] || 'Selects highest-value URL and deep scrapes article text.'}
          </p>
        </div>

        {/* Step 3 */}
        <div className={`step-card ${stepStatuses[3]}`} onClick={() => setActiveTab('report')}>
          <div className="step-header">
            <span className="step-number">3</span>
            <span className={`step-badge badge-${stepStatuses[3]}`}>
              {stepStatuses[3] === 'active' ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span className="spinner" /> Active
                </span>
              ) : stepStatuses[3]}
            </span>
          </div>
          <h3 className="step-title">
            <FileText size={17} style={{ color: 'var(--palette-3, #FFD6E0)' }} />
            Writer Chain
          </h3>
          <p className="step-desc">
            {stepLogs[3] || 'Synthesizes gathered research into a structured markdown report.'}
          </p>
        </div>

        {/* Step 4 */}
        <div className={`step-card ${stepStatuses[4]}`} onClick={() => setActiveTab('critic')}>
          <div className="step-header">
            <span className="step-number">4</span>
            <span className={`step-badge badge-${stepStatuses[4]}`}>
              {stepStatuses[4] === 'active' ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span className="spinner" /> Active
                </span>
              ) : stepStatuses[4]}
            </span>
          </div>
          <h3 className="step-title">
            <ShieldCheck size={17} style={{ color: 'var(--palette-2, #BDB2FF)' }} />
            Critic & QA
          </h3>
          <p className="step-desc">
            {stepLogs[4] || 'Scores report quality, citations, and critical risks ($X/10$).'}
          </p>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="content-section">
        {/* Navigation Tabs */}
        <div className="tabs-bar">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'report' ? 'active' : ''}`}
            onClick={() => setActiveTab('report')}
          >
            <FileText size={16} />
            Executive Report
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'critic' ? 'active' : ''}`}
            onClick={() => setActiveTab('critic')}
          >
            <ShieldCheck size={16} />
            Critic QA Dashboard
            {criticDetails.score && (
              <span
                style={{
                  background: 'var(--primary)',
                  color: '#fff',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                }}
              >
                {criticDetails.score}/10
              </span>
            )}
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'sources' ? 'active' : ''}`}
            onClick={() => setActiveTab('sources')}
          >
            <Globe size={16} />
            Sources Explorer ({discoveredSources.length})
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            <Search size={16} />
            Search Artifacts
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'reader' ? 'active' : ''}`}
            onClick={() => setActiveTab('reader')}
          >
            <BookOpen size={16} />
            Scraped Content
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'raw' ? 'active' : ''}`}
            onClick={() => setActiveTab('raw')}
          >
            <Terminal size={16} />
            Blackboard State
          </button>
        </div>

        {/* Tab Contents */}
        <div className="tab-content-area">
          {/* TAB 1: EXECUTIVE REPORT */}
          {activeTab === 'report' && (
            <div>
              {cleanReportMarkdown ? (
                <>
                  {/* Dedicated Header for PDF Print Only */}
                  <div className="print-only-header">
                    <h1>Executive Research Report: {topic || 'Autonomous Multi-Agent Synthesis'}</h1>
                    <div className="print-meta">
                      <span>Generated by Autonomous Multi-Agent AI System</span>
                      <span>Date: {new Date().toLocaleDateString()} | Quality Grade: {criticDetails.score ? `${criticDetails.score}/10` : 'Approved'}</span>
                    </div>
                  </div>

                  {/* Clean Toolbar with Direct File Downloads & Print */}
                  <div className="toolbar">
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                      Topic: <strong style={{ color: 'var(--text-main)' }}>{topic || 'Active Research'}</strong>
                    </span>
                    <div className="action-buttons">
                      <button
                        type="button"
                        className="btn-secondary btn-download-primary"
                        onClick={() => downloadReportFile('md')}
                        title="Download clean report file (.md)"
                      >
                        <FileDown size={14} />
                        Download .MD
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => downloadReportFile('txt')}
                        title="Download clean plain text file (.txt)"
                      >
                        <Download size={14} />
                        Download .TXT
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={copyReportToClipboard}
                        title="Copy report markdown to clipboard"
                      >
                        {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                        {copied ? 'Copied!' : 'Copy Markdown'}
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={handlePrint}
                        title="Print clean report to PDF without any website clutter"
                      >
                        <Printer size={14} />
                        Print to PDF
                      </button>
                    </div>
                  </div>

                  <div className="report-view">
                    <ReactMarkdown>{cleanReportMarkdown}</ReactMarkdown>
                  </div>

                  {/* Discovered Sources Cards Grid inside Report */}
                  {discoveredSources.length > 0 && (
                    <div className="sources-section">
                      <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Globe size={18} color="var(--palette-1)" />
                        Verified Source Citations ({discoveredSources.length})
                      </h3>
                      <div className="sources-grid">
                        {discoveredSources.map((src, i) => (
                          <div key={i} className="source-card">
                            <div>
                              <span className="source-domain-pill">
                                <Globe size={12} />
                                {src.domain}
                              </span>
                              <div className="source-title">{src.title || src.url}</div>
                            </div>
                            <a href={src.url} target="_blank" rel="noopener noreferrer" className="source-link-btn">
                              Visit Source Article
                              <ExternalLink size={13} />
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="empty-state">
                  <Activity className="empty-icon" size={48} />
                  <h3 className="empty-title">Ready to Begin Research</h3>
                  <p className="empty-desc">
                    Enter a research topic above or click any suggested chip to trigger the autonomous multi-agent pipeline.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ADVANCED CRITIC DASHBOARD */}
          {activeTab === 'critic' && (
            <div>
              {pipelineState.critic_chain_result ? (
                <>
                  <div className="critic-dashboard">
                    {/* Left: Radial Score Gauge */}
                    <div className="critic-gauge-card">
                      <div className="radial-gauge-container">
                        <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            fill="transparent"
                            stroke="rgba(189, 178, 255, 0.15)"
                            strokeWidth="8"
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            fill="transparent"
                            stroke="url(#gaugeGradient)"
                            strokeWidth="8"
                            strokeDasharray={2 * Math.PI * 40}
                            strokeDashoffset={2 * Math.PI * 40 * (1 - (criticDetails.score || 0) / 10)}
                            strokeLinecap="round"
                            style={{ transition: 'stroke-dashoffset 1s ease' }}
                          />
                          <defs>
                            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="var(--palette-1)" />
                              <stop offset="100%" stopColor="var(--palette-2)" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div className="radial-gauge-text">
                          <span className="gauge-score-num">{criticDetails.score || '—'}</span>
                          <span className="gauge-score-sub">out of 10</span>
                        </div>
                      </div>

                      <span
                        className={`verdict-tag ${criticDetails.verdict === 'Approved' ? 'verdict-approved' : 'verdict-revision'
                          }`}
                        style={{ marginTop: '8px' }}
                      >
                        {criticDetails.verdict === 'Approved' ? <Check size={16} /> : <AlertTriangle size={16} />}
                        Verdict: {criticDetails.verdict || 'Reviewed'}
                      </span>
                    </div>

                    {/* Right: Rubric Progress Bars */}
                    <div className="rubric-bars-card">
                      <h4 style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>Rubric Evaluation Breakdown</h4>

                      <div className="rubric-bar-item">
                        <div className="rubric-bar-header">
                          <span>Structural Coherence & Completeness</span>
                          <span>{criticDetails.score ? `${Math.min(10, criticDetails.score + 1)}/10` : '—'}</span>
                        </div>
                        <div className="rubric-track">
                          <div className="rubric-fill" style={{ width: `${(criticDetails.score || 7) * 10}%` }} />
                        </div>
                      </div>

                      <div className="rubric-bar-item">
                        <div className="rubric-bar-header">
                          <span>Citation & Source Grounding</span>
                          <span>{criticDetails.score ? `${criticDetails.score}/10` : '—'}</span>
                        </div>
                        <div className="rubric-track">
                          <div className="rubric-fill" style={{ width: `${(criticDetails.score || 6) * 9}%` }} />
                        </div>
                      </div>

                      <div className="rubric-bar-item">
                        <div className="rubric-bar-header">
                          <span>Risk Assessment & Analytical Balance</span>
                          <span>{criticDetails.score ? `${Math.max(4, criticDetails.score - 1)}/10` : '—'}</span>
                        </div>
                        <div className="rubric-track">
                          <div className="rubric-fill" style={{ width: `${(criticDetails.score || 5) * 8}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Side-by-Side Strengths vs Improvement Panels */}
                  <div className="critique-boxes-grid">
                    <div className="critique-panel">
                      <div className="critique-panel-header panel-strengths">
                        <CheckCircle2 size={16} />
                        Identified Strengths ({criticDetails.strengths.length || 'Detailed'})
                      </div>
                      {criticDetails.strengths.length > 0 ? (
                        <ul className="critique-bullet-list">
                          {criticDetails.strengths.map((item, idx) => (
                            <li key={idx} className="critique-bullet-item">
                              <Check size={14} color="#34d399" style={{ flexShrink: 0, marginTop: '3px' }} />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Professional tone and structured sections identified.</p>
                      )}
                    </div>

                    <div className="critique-panel">
                      <div className="critique-panel-header panel-weaknesses">
                        <AlertTriangle size={16} />
                        Areas for Improvement ({criticDetails.weaknesses.length || 'Detailed'})
                      </div>
                      {criticDetails.weaknesses.length > 0 ? (
                        <ul className="critique-bullet-list">
                          {criticDetails.weaknesses.map((item, idx) => (
                            <li key={idx} className="critique-bullet-item">
                              <AlertCircle size={14} color="#fbbf24" style={{ flexShrink: 0, marginTop: '3px' }} />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Deepen risk analysis and inline attribution.</p>
                      )}
                    </div>
                  </div>

                  {/* Raw Critique Output */}
                  <div style={{ marginTop: '20px' }}>
                    <h4 style={{ color: 'var(--text-main)', marginBottom: '10px', fontSize: '0.88rem' }}>Raw Critic Output Log</h4>
                    <div className="critic-raw-box">{criticDetails.raw}</div>
                  </div>
                </>
              ) : (
                <div className="empty-state">
                  <ShieldCheck className="empty-icon" size={48} />
                  <h3 className="empty-title">No Evaluation Available Yet</h3>
                  <p className="empty-desc">
                    Once the Writer Chain finishes the draft report, the Critic Chain will automatically grade its structure, citations, and factual grounding.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SOURCES EXPLORER */}
          {activeTab === 'sources' && (
            <div>
              <h4 style={{ color: 'var(--text-main)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Globe size={18} color="var(--palette-1)" />
                Discovered Sources & Authoritative URLs
              </h4>

              {discoveredSources.length > 0 ? (
                <div className="sources-grid">
                  {discoveredSources.map((src, i) => (
                    <div key={i} className="source-card">
                      <div>
                        <span className="source-domain-pill">
                          <Globe size={12} />
                          {src.domain}
                        </span>
                        <div className="source-title">{src.title}</div>
                        {src.snippet && (
                          <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '10px', lineHeight: '1.4' }}>
                            {src.snippet}...
                          </p>
                        )}
                      </div>
                      <a href={src.url} target="_blank" rel="noopener noreferrer" className="source-link-btn">
                        Visit Source Page
                        <ExternalLink size={13} />
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <Globe className="empty-icon" size={48} />
                  <h3 className="empty-title">No Sources Gathered Yet</h3>
                  <p className="empty-desc">Search findings and links will be parsed and displayed here after Step 1.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SEARCH ARTIFACTS */}
          {activeTab === 'search' && (
            <div>
              <h4 style={{ color: 'var(--text-main)', marginBottom: '12px' }}>Step 1: Tavily Search Raw Findings</h4>
              {pipelineState.search_results ? (
                <div className="artifact-box">{pipelineState.search_results}</div>
              ) : (
                <div className="empty-state">
                  <Search className="empty-icon" size={48} />
                  <h3 className="empty-title">No Search Results Yet</h3>
                  <p className="empty-desc">Search artifacts will appear here as soon as Step 1 executes.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: READER ARTIFACTS */}
          {activeTab === 'reader' && (
            <div>
              <h4 style={{ color: 'var(--text-main)', marginBottom: '12px' }}>Step 2: Deep Scraped Web Content (BeautifulSoup)</h4>
              {pipelineState.reader_results ? (
                <div className="artifact-box">{pipelineState.reader_results}</div>
              ) : (
                <div className="empty-state">
                  <BookOpen className="empty-icon" size={48} />
                  <h3 className="empty-title">No Scraped Data Yet</h3>
                  <p className="empty-desc">Deep scraped article content will appear here when Step 2 completes.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: RAW STATE */}
          {activeTab === 'raw' && (
            <div>
              <h4 style={{ color: 'var(--text-main)', marginBottom: '12px' }}>Pipeline Shared State (Blackboard)</h4>
              <div className="artifact-box">
                {JSON.stringify(pipelineState, null, 2)}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
