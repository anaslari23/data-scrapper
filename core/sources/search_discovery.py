import asyncio
import httpx
from bs4 import BeautifulSoup
from duckduckgo_search import DDGS
from dataclasses import dataclass
from typing import List, Set

import structlog
from core.config import settings

logger = structlog.get_logger(__name__)

@dataclass
class SearchResult:
    title: str
    url: str
    snippet: str
    source_engine: str


class SearchDiscovery:
    """Provides free search discovery using DuckDuckGo, Bing scrape, and Google CSE."""

    @staticmethod
    def duckduckgo_search(query: str, max_results: int = 50) -> List[SearchResult]:
        """Search using DuckDuckGo (Free, 1 req/2sec rate limit expected)."""
        results = []
        try:
            # Using the duckduckgo_search python wrapper
            with DDGS() as ddgs:
                ddg_results = list(ddgs.text(query, max_results=max_results))
                for r in ddg_results:
                    results.append(SearchResult(
                        title=r.get("title", ""),
                        url=r.get("href", ""),
                        snippet=r.get("body", ""),
                        source_engine="duckduckgo"
                    ))
        except Exception as e:
            logger.error("DuckDuckGo search failed", query=query, error=str(e))
        return results

    @staticmethod
    async def google_cse_search(query: str, max_results: int = 100) -> List[SearchResult]:
        """Search using Google Custom Search JSON API (Free tier: 100/day)."""
        if not settings.GOOGLE_CSE_API_KEY or not settings.GOOGLE_CSE_ID:
            logger.debug("Google CSE not configured, skipping")
            return []

        # Google CSE only returns 10 results per page, max 100
        api_key = settings.GOOGLE_CSE_API_KEY
        cse_id = settings.GOOGLE_CSE_ID
        results = []
        
        # Determine exact iterations required (up to 10 pages)
        pages = min((max_results + 9) // 10, 10)
        
        url = "https://www.googleapis.com/customsearch/v1"
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                for i in range(pages):
                    start_index = (i * 10) + 1
                    params = {
                        "key": api_key,
                        "cx": cse_id,
                        "q": query,
                        "start": start_index
                    }
                    response = await client.get(url, params=params)
                    if response.status_code == 429:
                        logger.warning("Google CSE exhausted daily quota")
                        break
                    response.raise_for_status()
                    
                    data = response.json()
                    items = data.get("items", [])
                    
                    if not items:
                        break # No more results
                        
                    for item in items:
                        results.append(SearchResult(
                            title=item.get("title", ""),
                            url=item.get("link", ""),
                            snippet=item.get("snippet", ""),
                            source_engine="google_cse"
                        ))
                        
                    if len(results) >= max_results:
                        break
        except Exception as e:
            logger.error("Google CSE search failed", query=query, error=str(e))
            
        return results[:max_results]

    @staticmethod
    async def bing_scrape(query: str, max_results: int = 50) -> List[SearchResult]:
        """Scrape Bing HTML directly. No API key needed."""
        url = "https://www.bing.com/search"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        
        results = []
        try:
            async with httpx.AsyncClient(headers=headers, timeout=15.0) as client:
                # To get max_results, we might need pagination. We just do 1 page for simplicity,
                # Bing usually returns ~10-15 per page. We limit to generic implementation.
                response = await client.get(url, params={"q": query})
                response.raise_for_status()
                
                soup = BeautifulSoup(response.text, "html.parser")
                
                # Bing results are typically li tags with class b_algo
                for item in soup.find_all("li", class_="b_algo"):
                    title_elem = item.find("h2")
                    if not title_elem:
                        continue
                        
                    link_elem = title_elem.find("a")
                    if not link_elem or "href" not in link_elem.attrs:
                        continue
                        
                    snippet_elem = item.find("div", class_="b_caption")
                    # some bing snipes are nested differently
                    snippet_text = snippet_elem.get_text(strip=True) if snippet_elem else ""
                    
                    results.append(SearchResult(
                        title=title_elem.get_text(strip=True),
                        url=link_elem["href"],
                        snippet=snippet_text,
                        source_engine="bing_scrape"
                    ))
                    
                    if len(results) >= max_results:
                        break
        except Exception as e:
            logger.error("Bing scrape failed", query=query, error=str(e))
            
        return results

    @classmethod
    async def unified_search(cls, query: str, max_results: int = 100) -> List[SearchResult]:
        """Runs searches and unifies/deduplicates results across engines."""
        
        # To respect DDG rate limit nicely we'd queue these differently in production, 
        # but for unified we string them together.
        
        # 1. DuckDuckGo (sync block conceptually, we run it in thread to not block event loop)
        ddg_results = await asyncio.to_thread(cls.duckduckgo_search, query, max_results)
        
        # 2. Bing (async)
        bing_results = await cls.bing_scrape(query, max_results=30)
        
        # 3. Google CSE (async)
        google_results = await cls.google_cse_search(query, max_results=30)
        
        all_results = ddg_results + bing_results + google_results
        
        # Deduplicate
        seen_urls: Set[str] = set()
        unique_results = []
        
        for r in all_results:
            normalized_url = r.url.lower().rstrip('/')
            if normalized_url not in seen_urls:
                seen_urls.add(normalized_url)
                unique_results.append(r)
                
            if len(unique_results) >= max_results:
                break
                
        return unique_results
