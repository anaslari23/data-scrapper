import asyncio
from typing import List, Optional
from bs4 import BeautifulSoup
from playwright.async_api import async_playwright, Page
from urllib.parse import quote_plus
import structlog

from core.sources.base import BaseSource, RawCompanyData

logger = structlog.get_logger(__name__)

class IndiaMartSource(BaseSource):
    """Scraper for IndiaMart (requires JS rendering)."""
    
    SOURCE_NAME = "indiamart"

    async def _get_rendered_html(self, url: str) -> Optional[str]:
        """Uses playwright to load the page and execute JS."""
        html = None
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                # Setting a generic user agent to avoid basic blocks
                context = await browser.new_context(
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                )
                page = await context.new_page()
                
                await page.goto(url, timeout=30000, wait_until="domcontentloaded")
                
                # In IndiaMart, phone numbers are often hidden behind a click.
                # In a full implementation, we'd trigger the click here:
                # try:
                #     await page.click(".show-number-button", timeout=2000)
                #     await page.wait_for_timeout(1000)
                # except Exception:
                #     pass # Button not found or failed
                
                html = await page.content()
                await browser.close()
        except Exception as e:
            logger.error("Playwright rendering failed", url=url, error=str(e))
        return html

    async def search(self, query: str, max_results: int = 10) -> List[RawCompanyData]:
        """Search IndiaMart bypassing their standard search wall."""
        encoded_query = quote_plus(query)
        search_url = f"https://dir.indiamart.com/search.mp?ss={encoded_query}&src=search-btn"
        
        results = []
        html = await self._get_rendered_html(search_url)
        if not html:
            return results
            
        soup = BeautifulSoup(html, "html.parser")
        
        # NOTE: IndiaMart DOM changes frequently. This is a heuristic class structure attempt.
        listings = soup.select(".lst_cl")
        
        for item in listings[:max_results]:
            name_elem = item.select_one(".lcname")
            if not name_elem:
                continue
                
            company_name = name_elem.get_text(strip=True)
            link_elem = item.select_one("a")
            url = link_elem["href"] if link_elem and "href" in link_elem.attrs else None
            
            # Simple parse of listing
            address_elem = item.select_one(".cty-loc")
            
            results.append(RawCompanyData(
                source_engine=self.SOURCE_NAME,
                company_name=company_name,
                url=url,
                address=address_elem.get_text(strip=True) if address_elem else None
            ))
            
        return results

    async def parse_detail(self, url: str) -> Optional[RawCompanyData]:
        """Parse IndiaMart company profile mapping GST, Products, Setup Year."""
        if not url:
            return None
            
        html = await self._get_rendered_html(url)
        if not html:
            return None
            
        soup = BeautifulSoup(html, "html.parser")
        
        data = RawCompanyData(source_engine=self.SOURCE_NAME, url=url)
        
        # Parse Name
        title_elem = soup.select_one("h1.cmp-name")
        if title_elem:
            data.company_name = title_elem.get_text(strip=True)
            
        # Parse complex tables (GST, Nature of Business -> Industry, Year Est)
        # IndiaMart uses a grid/table format on company profiles
        for row in soup.select("table.cmp-dtls tr"):
            th = row.select_one("th")
            td = row.select_one("td")
            
            if th and td:
                header = th.get_text(strip=True).lower()
                val = td.get_text(strip=True)
                
                if "gst" in header:
                    # Storing GST in additional info or address depending on mapping.
                    data.raw_html_snippet = f"GST: {val}"
                elif "nature of business" in header:
                    data.industry_type = val
                elif "year of establishment" in header:
                    data.year_established = val
                elif "number of employees" in header:
                    data.employee_count = val

        # Phone extraction (if exposed)
        phone_elem = soup.select_one(".pns_h")
        if phone_elem:
            data.phone = phone_elem.get_text(strip=True)
            
        return data
