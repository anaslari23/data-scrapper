# bi-scraper

A production-grade, entirely free-and-open-source B2B web scraping and data extraction pipeline. This project uses AI (Ollama) to extract structured business data from the web without any paid API keys.

## 🚀 Features

- **LLM-Powered Extraction**: Uses Ollama (Llama 3.1) to transform messy HTML into clean, structured JSON.
- **Search Discovery**: Unified search across DuckDuckGo, Bing (scraping), and Google CSE (free tier).
- **Directory Scrapers**: Custom scrapers for IndiaMart, JustDial (base64 decoder included), Zaubacorp, and ExportersIndia.
- **Ensemble ERP Detector**: Identifies company ERP systems (SAP, Oracle, etc.) using static analysis, job port scraping, and LLM classification.
- **Anonymity & Scaling**: Built-in free proxy manager with validation and Tor circuit rotation support.
- **Modern Dashboard**: React 18 + Vite dashboard with real-time job monitoring, advanced filtering, and CSV/XLSX exports.
- **Deduplication**: Potential for embedding-based deduplication using `pgvector`.

## 🛠 Tech Stack

### Backend
- **Core**: Python 3.12, FastAPI, Pydantic v2, SQLAlchemy
- **Crawler**: Playwright (Async), HTTPX, BeautifulSoup4
- **Services**: PostgreSQL (with pgvector), Redis, Ollama
- **Storage**: SQLAlchemy + Asyncpg

### Frontend
- **Framework**: React 18 (Vite), TypeScript
- **State Management**: TanStack Query v5
- **UI Components**: shadcn/ui (Tailwind CSS v3)
- **Data Table**: TanStack Table v8 (Virtualized)
- **Visuals**: Recharts

## 📦 Project Structure

```text
├── core/                   # Backend core logic
│   ├── crawler/            # Proxy management and crawlers
│   ├── extractors/         # LLM & Regex data extractors
│   ├── pipeline/           # Orchestration logic
│   └── sources/            # B2B directory scrapers & search
├── api/                    # FastAPI backend implementation
├── frontend/               # React dashboard (Vite + TS)
├── db/                     # Database migrations/schema (scaffold)
├── workers/                # Background worker logic (scaffold)
└── tests/                  # Pytest suite
```

## 🛠 Setup & Installation

### Prerequisites
- Python 3.12+
- Node.js 18+
- Docker & Docker Desktop (for Postgres/Redis/Ollama)
- [Ollama](https://ollama.com/) (installed locally or via Docker)

### Backend Setup
1. Clone the repo
2. Create and activate a virtual environment:
   ```bash
   uv venv
   source .venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   uv sync
   ```
4. Copy `.env.example` to `.env` and fill in your details.
5. Pull the Ollama model:
   ```bash
   ollama pull llama3.1
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```

### Running with Docker
```bash
docker-compose up -d
```

## 🚦 Usage
Once both the backend (FastAPI) and frontend (Vite) are running:
1. Open [http://localhost:5173](http://localhost:5173).
2. Go to the "Scrape Jobs" tab to configure a new search.
3. Monitor real-time extraction progress on the Dashboard.
4. Export your leads via the "Export" page.

## 📄 License
MIT License - Free and open utility for lead generation.
