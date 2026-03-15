# Production Deployment Guide: bi-scraper

To move this project from a local development environment to a production-ready system, you need to address infrastructure, scaling, security, and reliability.

## 🏗 High-Level Architecture

In production, the system should be decoupled into specific services:

1.  **Load Balancer (Nginx/Traefik)**: Handles SSL (HTTPS) and routes traffic to the Frontend and API.
2.  **Frontend (CDN/Static Hosting)**: The `dist/` folder from the React build should be served via Nginx or a CDN (Cloudflare/AWS S3+CloudFront).
3.  **API Server (FastAPI)**: Runs multiple Gunicorn/Uvicorn workers.
4.  **Task Queue (Celery/RQ)**: For long-running scrapes. FastAPI `BackgroundTasks` are fine for small loads, but production needs a persistent worker process.
5.  **Database (PostgreSQL)**: Managed instance (RDS/Cloud SQL) for persistence and `pgvector` similarity searches.
6.  **Cache/Broker (Redis)**: Handles task queueing and proxy caching.
7.  **LLM Inference (Ollama/Custom)**:
    *   **Option A**: Dedicated GPU instance running Ollama.
    *   **Option B**: Managed LLM endpoint (if switching away from local-only).
8.  **Proxy Layer**: Integration with a residential proxy provider (Bright Data, Oxylabs) for high-success rate scraping.

---

## 🚀 Deployment Strategy

### 1. Containerization (Recommended)
Update the `docker-compose.yml` or move to **Kubernetes (K8s)**.
- **API**: Dockerize with `python:3.12-slim`.
- **Workers**: Separate Docker service scaling independently.
- **Frontend**: Multi-stage build (Node -> Nginx).

### 2. Infrastructure Options
- **IaaS**: AWS (EC2/ECS), GCP (GCE/GKE), or DigitalOcean (Droplets/App Platform).
- **GPU Instances**: For Ollama, you need an instance with an NVIDIA GPU (e.g., AWS `g4dn.xlarge`).

---

## 🛠 Scaling & Performance

- **Horizontal Scaling**: Add more **Worker** containers as demand grows. Since the state is in Redis/Postgres, workers are stateless.
- **Playwright Headless**: Ensure `PLAYWRIGHT_HEADLESS=true`. In production, use **Browserless.io** or a fleet of Chromium containers to offload heavy rendering.
- **Proxy Rotation**: Free proxies are unreliable for high-volume production. Switch to a paid rotating proxy service.
- **LLM Context**: For high-concurrency, use a model server like **vLLM** or **TGI** which supports continuous batching.

---

## 🔒 Security & Reliability

- **API Authentication**: Implement OAuth2/JWT in `api/main.py`. Do not expose the scraper publicly without a key.
- **Environment Variables**: Use **HashiCorp Vault** or **AWS Secrets Manager**. Never commit `.env`.
- **Rate Limiting**: Use the `RATE_LIMIT_PER_DOMAIN` setting to stay within legal/ethical boundaries and avoid IP bans.
- **Monitoring**:
    - **Sentry**: For error tracking in Python and React.
    - **Prometheus/Grafana**: For tracking scraping success rates, memory usage, and LLM latency.
    - **VictoriaMetrics**: Long-term storage for scrape metrics.

---

## 📋 Pre-Production Checklist
- [ ] Connect `api/main.py` to the real `ScrapePipeline` (remove mocks).
- [ ] Set up a managed Postgres instance with `pgvector` extension.
- [ ] Configure a persistent Redis instance.
- [ ] Provision a GPU instance for Ollama.
- [ ] Set up a CI/CD pipeline (GitHub Actions) for automated testing and deployment.
- [ ] Configure a dead-letter queue for failed scrape tasks.
