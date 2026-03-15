import asyncio
import time
import json
import httpx
from bs4 import BeautifulSoup
from dataclasses import dataclass, asdict
from enum import Enum
from typing import List, Optional

import structlog
import redis.asyncio as redis
from stem import Signal
from stem.control import Controller

from core.config import settings

logger = structlog.get_logger(__name__)

class ProxyStrategy(str, Enum):
    NONE = "NONE"
    FREE_LIST = "FREE_LIST"
    TOR = "TOR"
    ROTATING_FREE = "ROTATING_FREE"

@dataclass
class Proxy:
    ip: str
    port: str
    country: str
    https: bool
    response_time: float = 0.0
    failures: int = 0
    
    @property
    def url(self) -> str:
        protocol = "https" if self.https else "http"
        return f"{protocol}://{self.ip}:{self.port}"


class FreeProxyManager:
    """Manages free proxies and Tor configurations."""
    
    def __init__(self):
        self.redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
        self.validated_proxies: List[Proxy] = []
        self._proxy_index = 0
        self._tor_request_count = 0
        
    async def fetch_free_proxies(self) -> List[Proxy]:
        """Scrape free proxies and cache them in Redis for 1hr."""
        cached_proxies = await self.redis_client.get("bi_scraper_proxies")
        if cached_proxies:
            logger.info("Loaded proxies from Redis cache")
            proxy_dicts = json.loads(cached_proxies)
            self.validated_proxies = [Proxy(**p) for p in proxy_dicts]
            return self.validated_proxies

        logger.info("Fetching fresh proxies from public lists...")
        sources = [
            "https://free-proxy-list.net/",
            "https://www.sslproxies.org/",
            "https://www.us-proxy.org/"
        ]
        
        raw_proxies = []
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            for url in sources:
                try:
                    response = await client.get(url)
                    response.raise_for_status()
                    soup = BeautifulSoup(response.text, "html.parser")
                    
                    table = soup.find("table", class_="table")
                    if not table:
                        continue
                        
                    tbody = table.find("tbody")
                    for row in tbody.find_all("tr"):
                        cols = row.find_all("td")
                        if len(cols) >= 7:
                            ip = cols[0].text.strip()
                            port = cols[1].text.strip()
                            country = cols[3].text.strip()
                            # Column 6 is usually "yes/no" for HTTPS
                            is_https = (cols[6].text.strip().lower() == "yes")
                            
                            raw_proxies.append(Proxy(
                                ip=ip, port=port, country=country, https=is_https
                            ))
                except Exception as e:
                    logger.warning(f"Failed to fetch proxies from {url}", error=str(e))
                    
        # Dedup raw proxies
        unique_proxies = {p.ip: p for p in raw_proxies}.values()
        
        # Concurrently validate 10 at a time
        semaphore = asyncio.Semaphore(10)
        
        async def bounded_validate(p: Proxy):
            async with semaphore:
                return await self.validate_proxy(p)
                
        tasks = [bounded_validate(p) for p in unique_proxies]
        validated_proxy_results = await asyncio.gather(*tasks, return_exceptions=True)
        
        working_proxies = [p for p in validated_proxy_results if isinstance(p, Proxy)]
        
        logger.info(f"Validated {len(working_proxies)} working proxies out of {len(raw_proxies)}")
        self.validated_proxies = working_proxies
        
        if working_proxies:
            # Save to redis, TTL 3600s
            proxy_dicts = [asdict(p) for p in working_proxies]
            await self.redis_client.setex("bi_scraper_proxies", 3600, json.dumps(proxy_dicts))
            
        return working_proxies

    async def validate_proxy(self, proxy: Proxy) -> Optional[Proxy]:
        """Test proxy by making request to httpbin.org/ip."""
        start_time = time.time()
        
        # For httpx, proxy dict structure expects keys like "http://", "https://"
        proxies = {
            "all://": proxy.url
        }
        
        try:
            async with httpx.AsyncClient(proxies=proxies, timeout=5.0) as client:
                res = await client.get("https://httpbin.org/ip")
                res.raise_for_status()
                
                response_time = time.time() - start_time
                if response_time < 3.0:
                    proxy.response_time = response_time
                    return proxy
        except Exception:
            pass
            
        return None

    async def get_working_proxy(self) -> Optional[Proxy]:
        """Round-robin through validated proxies. Track failures."""
        if not self.validated_proxies:
            await self.fetch_free_proxies()
            
        if not self.validated_proxies:
            logger.warning("No working proxies available. Falling back to direct connection.")
            return None
            
        # Round robin
        proxy = self.validated_proxies[self._proxy_index % len(self.validated_proxies)]
        self._proxy_index += 1
        
        return proxy
        
    def report_proxy_failure(self, proxy: Proxy):
        """Removes a proxy after 3 failures."""
        proxy.failures += 1
        if proxy.failures >= 3:
            logger.info("Removing stale proxy", proxy=proxy.ip, failures=proxy.failures)
            if proxy in self.validated_proxies:
                self.validated_proxies.remove(proxy)
                
    def get_tor_proxy_url(self) -> str:
        """Returns local SOCKS5 tor proxy URL."""
        return "socks5://127.0.0.1:9050"
        
    def renew_tor_connection(self):
        """Forces Tor to build a new circuit using stem."""
        try:
            with Controller.from_port(port=9051) as controller:
                controller.authenticate()  # expects passwordless or cookie auth
                controller.signal(Signal.NEWNYM)
                logger.info("Renewed Tor circuit")
        except Exception as e:
            logger.error("Failed to renew Tor circuit", error=str(e))
            
    def get_proxy_stats(self) -> dict:
        """Proxy health dashboard method."""
        return {
            "total_validated": len(self.validated_proxies),
            "strategy": "TOR" if settings.USE_TOR_PROXY else ("FREE_PROXY" if settings.FREE_PROXY_ENABLED else "NONE"),
            "redis_cache": True if len(self.validated_proxies) > 0 else False
        }
