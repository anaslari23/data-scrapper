import asyncio
import httpx
from abc import ABC, abstractmethod
from typing import List, Optional
from dataclasses import dataclass, field
from urllib.parse import urlparse

import structlog

logger = structlog.get_logger(__name__)

@dataclass
class RawCompanyData:
    """Standardized dataclass that all sources return."""
    source_engine: str
    company_name: Optional[str] = None
    url: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    industry_type: Optional[str] = None
    products: List[str] = field(default_factory=list)
    year_established: Optional[str] = None
    employee_count: Optional[str] = None
    director_names: List[str] = field(default_factory=list)
    paid_up_capital: Optional[str] = None
    rating: Optional[str] = None
    raw_html_snippet: Optional[str] = None

class BaseSource(ABC):
    """Abstract base class for all B2B directory scrapers."""
    
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)
        self.delay_between_requests = 2.0  # seconds

    async def _safe_get(self, url: str, **kwargs) -> Optional[httpx.Response]:
        """Wrapper to add built-in delay and basic retry logic."""
        await asyncio.sleep(self.delay_between_requests)
        
        retries = 3
        for attempt in range(retries):
            try:
                # To be polite, you'd add a robots.txt checker here using urllib.robotparser
                response = await self.client.get(url, **kwargs)
                response.raise_for_status()
                return response
            except httpx.HTTPStatusError as e:
                logger.warning(f"HTTP Error {e.response.status_code} fetching {url}")
                if e.response.status_code in [403, 429]:
                    # Severe blocks
                    break
            except Exception as e:
                logger.warning(f"Fetch attempt {attempt+1} failed for {url}: {e}")
                await asyncio.sleep(2 ** attempt)  # exponential backoff
                
        return None
        
    async def close(self):
        await self.client.aclose()

    @abstractmethod
    async def search(self, query: str, max_results: int = 10) -> List[RawCompanyData]:
        """Search the directory and return normalized results."""
        pass

    @abstractmethod
    async def parse_detail(self, url: str) -> Optional[RawCompanyData]:
        """Fetch and parse a detailed company profile page."""
        pass
