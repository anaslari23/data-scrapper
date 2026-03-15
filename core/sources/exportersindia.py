from typing import List, Optional
from bs4 import BeautifulSoup

import structlog

from core.sources.base import BaseSource, RawCompanyData

logger = structlog.get_logger(__name__)

class ExportersIndiaSource(BaseSource):
    """Scraper for ExportersIndia (B2B suppliers)."""
    
    SOURCE_NAME = "exportersindia"

    async def search(self, query: str, max_results: int = 10) -> List[RawCompanyData]:
        """Search ExportersIndia by category."""
        # Typically formatted as `https://www.exportersindia.com/{category}/`
        # We assume `query` is passed as a hyphenated category string like `software-development-services`
        
        search_url = f"https://www.exportersindia.com/{query.replace(' ', '-')}/"
        
        results = []
        response = await self._safe_get(search_url)
        if not response:
            return results
            
        soup = BeautifulSoup(response.text, "html.parser")
        
        # ExportersIndia listings often wrap in a div with a generic class like 'company-content' or similar list item
        listings = soup.select(".company-name") # Very simplistic selector, assumes structural classes
        
        # Real-world HTML parsing often requires robust fallbacks.
        # This is a generic blueprint for standard ExportersIndia format.
        for item in listings[:max_results]:
            name_elem = item.find("a")
            if not name_elem:
                continue
                
            company_name = name_elem.get_text(strip=True)
            url = name_elem["href"] if "href" in name_elem.attrs else None
            
            # Navigate to parent or sibling to find details
            parent_div = item.find_parent("div", class_="listing-box") # hypothetical container
            
            address, phone = None, None
            if parent_div:
                address_elem = parent_div.select_one(".location")
                address = address_elem.get_text(strip=True) if address_elem else None
                
                phone_elem = parent_div.select_one(".call-now")
                phone = phone_elem.get_text(strip=True) if phone_elem else None
                
            results.append(RawCompanyData(
                source_engine=self.SOURCE_NAME,
                company_name=company_name,
                url=url,
                address=address,
                phone=phone
            ))
            
        return results

    async def parse_detail(self, url: str) -> Optional[RawCompanyData]:
        """Parse ExportersIndia company detail page."""
        if not url:
            return None
            
        response = await self._safe_get(url)
        if not response:
            return None
            
        soup = BeautifulSoup(response.text, "html.parser")
        
        data = RawCompanyData(source_engine=self.SOURCE_NAME, url=url)
        
        # Company Name
        title_elem = soup.select_one("h1")
        if title_elem:
            data.company_name = title_elem.get_text(strip=True)
            
        # Address Area
        contact_div = soup.select_one(".address-box")
        if contact_div:
            data.address = contact_div.get_text(separator=", ", strip=True)
            
        # Nature of Business / Products
        biz_box = soup.select_one(".business-type")
        if biz_box:
            data.industry_type = biz_box.get_text(strip=True)
            
        # Extract product list items
        product_ul = soup.select_one(".product-list")
        if product_ul:
            for li in product_ul.find_all("li"):
                data.products.append(li.get_text(strip=True))
                
        # Primary Contact Number parsing (Often requires interaction/JS in real app, assumes static here)
        phone_elem = soup.select_one(".phone-val")
        if phone_elem:
            data.phone = phone_elem.get_text(strip=True)

        return data
