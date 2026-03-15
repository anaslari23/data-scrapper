from typing import List, Optional
from bs4 import BeautifulSoup
from urllib.parse import quote_plus
import re
import structlog

from core.sources.base import BaseSource, RawCompanyData

logger = structlog.get_logger(__name__)

class ZaubaCorpSource(BaseSource):
    """Scraper for ZaubaCorp (MCA free company registry)."""
    
    SOURCE_NAME = "zaubacorp"

    async def search(self, query: str, max_results: int = 10) -> List[RawCompanyData]:
        """Search ZaubaCorp directory."""
        encoded_query = quote_plus(query)
        # Assuming Zauba search routing `company-search/{name}` or using internal API wrapper
        search_url = f"https://www.zaubacorp.com/company-search/{encoded_query}"
        
        results = []
        response = await self._safe_get(search_url)
        if not response:
            return results
            
        soup = BeautifulSoup(response.text, "html.parser")
        
        # Assume table of results with class `table-striped`
        table = soup.select_one("table.table-striped")
        if not table:
            return results
            
        tbody = table.select_one("tbody")
        if not tbody:
            return results
            
        for row in tbody.select("tr")[:max_results]:
            cols = row.select("td")
            if len(cols) >= 3:
                # Col 0: CIN
                # Col 1: Name link
                # Col 2: ROC/Location
                
                cin = cols[0].get_text(strip=True)
                link_elem = cols[1].select_one("a")
                
                company_name = link_elem.get_text(strip=True) if link_elem else cols[1].get_text(strip=True)
                url = link_elem["href"] if link_elem and "href" in link_elem.attrs else None
                
                location = cols[2].get_text(strip=True)
                
                results.append(RawCompanyData(
                    source_engine=self.SOURCE_NAME,
                    company_name=company_name,
                    url=url,
                    address=location,
                    raw_html_snippet=f"CIN: {cin}"
                ))
                
        return results

    async def parse_detail(self, url: str) -> Optional[RawCompanyData]:
        """Parse ZaubaCorp company detail page extracting Capital and Directors."""
        if not url:
            return None
            
        response = await self._safe_get(url)
        if not response:
            return None
            
        soup = BeautifulSoup(response.text, "html.parser")
        
        data = RawCompanyData(source_engine=self.SOURCE_NAME, url=url)
        
        # Parse Name
        title_elem = soup.select_one("h1")
        if title_elem:
            data.company_name = title_elem.get_text(strip=True)
            
        # Parse Info Table
        info_table = soup.select("table.table-striped")[0] if soup.select("table.table-striped") else None
        if info_table:
            for row in info_table.select("tr"):
                header = row.select_one("td")
                value = row.select("td")[1] if len(row.select("td")) > 1 else None
                
                if header and value:
                    h_text = header.get_text(strip=True).lower()
                    v_text = value.get_text(strip=True)
                    
                    if "incorporation date" in h_text:
                        data.year_established = v_text
                    elif "address" in h_text:
                        data.address = v_text
                    elif "paid-up capital" in h_text:
                        data.paid_up_capital = v_text
                        
        # Directors Table
        director_div = soup.select_one("#director-table")
        if director_div:
            for row in director_div.select("tbody tr"):
                cols = row.select("td")
                if len(cols) >= 2:
                    # Usually Col 0 is DIN, Col 1 is Name
                    d_name = cols[1].get_text(strip=True)
                    # Clean out trailing whitespace/titles 
                    clean_name = re.sub(r'\s+', ' ', d_name)
                    if clean_name:
                        data.director_names.append(clean_name)
                        
        return data
