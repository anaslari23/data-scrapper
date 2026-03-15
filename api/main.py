from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uuid
import datetime
import asyncio

# Import existing modules
# Note: In a real scenario, we'd use core.pipeline.orchestrator.ScrapePipeline
# Here we'll mock the data for now to ensure the frontend "runs" immediately 
# while still providing a scaffold for real integration.

import httpx
from sqlalchemy.ext.asyncio import create_async_engine
from core.config import settings

app = FastAPI(title="bi-scraper API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mock in-memory stores
jobs_db = {}
companies_db = [
    {
        "id": "1",
        "company_name": "TechFlow Solutions",
        "industry_type": "IT Services",
        "city": "Bangalore",
        "state": "Karnataka",
        "country": "India",
        "website": "https://techflow.io",
        "current_erp": "SAP S/4HANA",
        "employee_count": "100-500",
        "quality_score": 0.92,
        "phone_numbers": ["+91 98765 43210"],
        "email_addresses": ["info@techflow.io"],
        "extracted_at": datetime.datetime.now().isoformat()
    },
    {
        "id": "2",
        "company_name": "Modern Manufacturing Co.",
        "industry_type": "Manufacturing",
        "city": "Pune",
        "state": "Maharashtra",
        "country": "India",
        "website": "http://modernmfg.com",
        "current_erp": "Microsoft Dynamics Business Central",
        "employee_count": "500-1000",
        "quality_score": 0.85,
        "phone_numbers": ["+91 22 1234 5678"],
        "email_addresses": ["sales@modernmfg.com"],
        "extracted_at": datetime.datetime.now().isoformat()
    }
]

class JobCreate(BaseModel):
    industry: str
    cities: List[str]
    country: str
    sources: List[str]
    max_companies: int

@app.get("/api/v1/health")
async def health():
    ollama_status = "offline"
    db_status = "offline"
    
    # Check Ollama
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            resp = await client.get(f"{settings.OLLAMA_BASE_URL}/api/tags")
            if resp.status_code == 200:
                ollama_status = "online"
    except Exception:
        pass

    # Check DB
    try:
        engine = create_async_engine(settings.DATABASE_URL)
        async with engine.connect() as conn:
            await conn.execute("SELECT 1")
            db_status = "online"
        await engine.dispose()
    except Exception:
        pass

    return {
        "status": "ok",
        "ollama": ollama_status,
        "db": db_status
    }

@app.get("/api/v1/health/ollama")
async def health_ollama():
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            resp = await client.get(f"{settings.OLLAMA_BASE_URL}/api/tags")
            if resp.status_code == 200:
                return {"status": "online", "models": resp.json().get("models", [])}
    except Exception as e:
        return {"status": "offline", "error": str(e)}
    return {"status": "offline"}

@app.get("/api/v1/companies")
async def list_companies(
    page: int = 1,
    page_size: int = 25,
    q: Optional[str] = None,
    industry: Optional[str] = None,
    city: Optional[str] = None
):
    filt = companies_db
    if q:
        filt = [c for c in filt if q.lower() in c["company_name"].lower()]
    if industry:
        filt = [c for c in filt if c["industry_type"] == industry]
    if city:
        filt = [c for c in filt if c["city"] == city]
    
    start = (page - 1) * page_size
    end = start + page_size
    return {
        "items": filt[start:end],
        "total": len(filt),
        "page": page,
        "page_size": page_size
    }

@app.get("/api/v1/companies/stats")
async def get_stats():
    return {
        "total_companies": len(companies_db),
        "jobs_running": len([j for j in jobs_db.values() if j["status"] == "running"]),
        "avg_quality": 0.88,
        "scraped_today": 12
    }

@app.post("/api/v1/jobs")
async def create_job(job_in: JobCreate, background_tasks: BackgroundTasks):
    job_id = str(uuid.uuid4())
    job = {
        "id": job_id,
        "target_query": f"{job_in.industry} in {', '.join(job_in.cities)}",
        "status": "pending",
        "progress_percent": 0,
        "total_found": 0,
        "processed": 0,
        "failed_count": 0,
        "started_at": datetime.datetime.now().isoformat(),
        "eta_seconds": None,
        "current_company": None
    }
    jobs_db[job_id] = job
    
    # In a real app, we'd trigger ScrapePipeline.run_job here
    background_tasks.add_task(dummy_job_runner, job_id)
    
    return job

async def dummy_job_runner(job_id: str):
    job = jobs_db[job_id]
    job["status"] = "running"
    for i in range(1, 11):
        await asyncio.sleep(2)
        job["progress_percent"] = i * 10
        job["processed"] = i * 5
        job["total_found"] = 50
        job["current_company"] = f"Company {i}"
    job["status"] = "done"
    job["current_company"] = None

@app.get("/api/v1/jobs")
async def list_jobs():
    return sorted(jobs_db.values(), key=lambda x: x["started_at"], reverse=True)

@app.get("/api/v1/jobs/{job_id}")
async def get_job(job_id: str):
    if job_id not in jobs_db:
        raise HTTPException(status_code=404, detail="Job not found")
    return jobs_db[job_id]

@app.get("/api/v1/jobs/{job_id}/logs")
async def get_job_logs(job_id: str):
    return [
        {"type": "info", "message": "Search initiated..."},
        {"type": "success", "message": "Found 50 seed URLs"},
        {"type": "info", "message": "Starting extraction loop"}
    ]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
