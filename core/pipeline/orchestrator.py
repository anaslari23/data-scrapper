import asyncio
import httpx
import json
import structlog
from dataclasses import dataclass, field
from typing import List, Optional, Set
import redis.asyncio as redis

from core.config import settings
from core.sources.search_discovery import SearchDiscovery, SearchResult
from core.sources.query_builder import generate_queries
from core.extractors.llm_extractor import CompanyExtractor, CompanyData
from core.extractors.contact_parser import ContactParser
from core.extractors.erp_detector import ERPDetector

logger = structlog.get_logger(__name__)

@dataclass
class ScrapeJob:
    job_id: str
    industry: str
    city: str
    country: str
    
@dataclass
class JobResult:
    job_id: str
    total_discovered: int = 0
    total_crawled: int = 0
    total_extracted: int = 0
    total_stored: int = 0
    errors: List[str] = field(default_factory=list)


class PlaywrightCrawler:
    """Stub for a crawler that fetches homepage and about/contact pages."""
    @staticmethod
    async def crawl_company(url: str) -> List[str]:
        # In a real implementation this would use Playwright to fetch HTML
        # and discover /contact, /about, /team links and return their HTML.
        # Returning a dummy list here to satisfy the type signature.
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(url, follow_redirects=True)
                return [res.text]
        except Exception as e:
            logger.debug(f"Crawler failed to fetch {url}", error=str(e))
            return []


class ScrapePipeline:
    """Main Orchestrator tying Discovery, Crawl, Extract, Enrich, Deduplicate, Store together."""
    
    def __init__(self):
        self.redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
        self.semaphore = asyncio.Semaphore(settings.MAX_CONCURRENT_CRAWLS)
        self.extractor = CompanyExtractor()
        
    async def _update_progress(self, job_id: str, status: dict):
        """Update job status in Redis."""
        await self.redis_client.set(f"job:{job_id}:status", json.dumps(status))
        
    async def _deduplicate_and_store(self, data: CompanyData) -> bool:
        """
        Embeds the data and stores in pgvector.
        Returns True if stored, False if duplicate.
        """
        if not data.company_name and not data.website:
             return False
             
        # Generate embedding via Ollama (nomic-embed-text)
        embed_url = f"{settings.OLLAMA_BASE_URL}/api/embeddings"
        payload = {
            "model": "nomic-embed-text",
            "prompt": f"{data.company_name} {data.industry_type} {data.address}"
        }
        
        # We would typically do this, but skipping the actual HTTP call in this stub 
        # to focus on the pipeline structure.
        # response = await httpx.post(embed_url, json=payload)
        
        # Here we would do a Postgres pgvector similarity search...
        # If distance < threshold, merge.
        # Else, INSERT into raw_companies table
        
        return True # Simulating successful storage

    async def _process_company(self, url: str) -> Optional[CompanyData]:
        """Runs Crawl -> Extract -> Enrich loop for a single company."""
        async with self.semaphore:
            # 2. CRAWL (Fetch homepage + inner pages)
            html_pages = await PlaywrightCrawler.crawl_company(url)
            if not html_pages:
                return None
                
            combined_html = " ".join(html_pages)
                
            # 3. EXTRACT
            # LLM Extraction
            company_data = await self.extractor.extract_from_multiple_pages(html_pages)
            if not company_data.website:
                company_data.website = url
                
            # Regex Fallback Extraction
            regex_contacts = ContactParser.extract_contacts(combined_html)
            # Merge regex contacts if LLM missed them
            existing_emails = {c.email for c in company_data.contacts if c.email}
            existing_phones = {c.phone for c in company_data.contacts if c.phone}
            
            # Simple enrich
            if not existing_emails and regex_contacts["emails"]:
                company_data.contacts.append({"email": regex_contacts["emails"][0]})
            if not existing_phones and regex_contacts["phones"]:
                company_data.contacts.append({"phone": regex_contacts["phones"][0]})
                
            # ERP Detection
            erp_result = await ERPDetector.detect(company_data.company_name or "", combined_html, url)
            if erp_result and erp_result.name:
                company_data.current_erp = erp_result.name
                
            # 4. ENRICH 
            # (DataValidator, AddressParser are stubs for future processing here)
            
            return company_data

    async def run_job(self, job: ScrapeJob) -> JobResult:
        """Executes the full Pipeline."""
        logger.info("Starting Scrape Job", job_id=job.job_id)
        result = JobResult(job_id=job.job_id)
        
        await self._update_progress(job.job_id, {"status": "DISCOVERING"})
        
        # 1. DISCOVER
        queries = generate_queries(job.industry, job.city, job.country)
        seed_urls: Set[str] = set()
        
        for q in queries:
            try:
                search_results = await SearchDiscovery.unified_search(q, max_results=30)
                for sr in search_results:
                    if sr.url:
                        seed_urls.add(sr.url)
            except Exception as e:
                logger.error(f"Discovery phase error for query '{q}'", error=str(e))
                result.errors.append(f"Discovery error: {str(e)}")
                
        # Also could merge B2B directory search results here...
                
        result.total_discovered = len(seed_urls)
        logger.info(f"Discovery complete. Found {result.total_discovered} seed URLs.")
        await self._update_progress(job.job_id, {"status": "CRAWLING", "discovered": result.total_discovered})

        # Process Queue
        completed = 0
        tasks = []
        
        for url in seed_urls:
            # We construct a task for each, letting the semaphore govern concurrency
            tasks.append(asyncio.create_task(self._process_company(url)))
            
        for coro in asyncio.as_completed(tasks):
            try:
                company_data = await coro
                
                if company_data:
                    result.total_extracted += 1
                    
                    # 5 & 6. DEDUPLICATE and STORE
                    stored = await self._deduplicate_and_store(company_data)
                    if stored:
                        result.total_stored += 1
                        
            except Exception as e:
                logger.error("Error processing company in pipeline", error=str(e))
                result.errors.append(str(e))
                
            completed += 1
            if completed % 10 == 0:
                await self._update_progress(job.job_id, {
                    "status": "PROCESSING", 
                    "progress": f"{completed}/{result.total_discovered}",
                    "stored": result.total_stored
                })
                
        logger.info("Pipeline completed", result=result)
        await self._update_progress(job.job_id, {"status": "COMPLETED", "result": result.__dict__})
        
        return result
