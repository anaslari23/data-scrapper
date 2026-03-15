import base64
from typing import List, Optional
from bs4 import BeautifulSoup

import structlog

from core.sources.base import BaseSource, RawCompanyData

logger = structlog.get_logger(__name__)

class JustDialSource(BaseSource):
    """Scraper for JustDial decoding phone obfuscation."""
    
    SOURCE_NAME = "justdial"

    @staticmethod
    def decode_justdial_phone(encoded: str) -> str:
        """Decode JustDial's specific phone masking (Base64 + Rot13 variants)."""
        if not encoded:
            return ""
            
        try:
            # Common JD strategy: data attributes hold base-64 encoded reversed rot-13 strings
            # Or simplified: reversed base64
            
            # Step 1: Decode Base64 (pads with == if needed)
            padding = len(encoded) % 4
            if padding:
                encoded += "=" * (4 - padding)
                
            decoded_bytes = base64.b64decode(encoded)
            decoded_str = decoded_bytes.decode('utf-8')
            
            # Step 2: Reverse the string
            # Some variants use simple reversal
            phone = decoded_str[::-1]
            return phone
            
        except Exception as e:
            logger.debug(f"Failed to decode JD phone: {encoded} -> {str(e)}")
            return ""

    async def search(self, query: str, max_results: int = 10) -> List[RawCompanyData]:
        """Search JustDial for city+industry."""
        # Note: Justdial requires city context, so query should be formatted like "mumbai/software-companies"
        # We assume `query` is already formed as `{city}/{industry}`
        
        search_url = f"https://www.justdial.com/{query.replace(' ', '-')}"
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
        }
        
        results = []
        response = await self._safe_get(search_url, headers=headers)
        if not response:
            return results
            
        soup = BeautifulSoup(response.text, "html.parser")
        
        # JD listings are typically marked with 'li' or 'div' with class 'store-details'
        listings = soup.select(".store-details")
        
        for item in listings[:max_results]:
            name_elem = item.select_one("h2")
            company_name = name_elem.get_text(strip=True) if name_elem else None
            
            address_elem = item.select_one(".address-info")
            address = address_elem.get_text(strip=True) if address_elem else None
            
            rating_elem = item.select_one(".green-box")
            rating = rating_elem.get_text(strip=True) if rating_elem else None
            
            category_elem = item.select_one(".search-tag")
            industry = category_elem.get_text(strip=True) if category_elem else None
            
            # Extract encoded phone (often inside span with distinct structure)
            phone_elem = item.select_one(".callnow")
            encoded_phone = phone_elem.get("data-value") if phone_elem else None
            decoded_phone = self.decode_justdial_phone(encoded_phone) if encoded_phone else None
            
            link_elem = item.select_one("a.jd-biz-link")
            url = link_elem["href"] if link_elem and "href" in link_elem.attrs else None
            
            results.append(RawCompanyData(
                source_engine=self.SOURCE_NAME,
                company_name=company_name,
                url=url,
                address=address,
                phone=decoded_phone,
                industry_type=industry,
                rating=rating
            ))
            
        return results

    async def parse_detail(self, url: str) -> Optional[RawCompanyData]:
        """Justdial details page usually has similar structure to the listing container."""
        # For simplicity, similar extracting strategy
        if not url:
            return None
            
        response = await self._safe_get(url)
        if not response:
            return None
            
        soup = BeautifulSoup(response.text, "html.parser")
        
        data = RawCompanyData(source_engine=self.SOURCE_NAME, url=url)
        
        name_elem = soup.select_one("h1")
        if name_elem:
            data.company_name = name_elem.get_text(strip=True)
            
        address_elem = soup.select_one(".address-info")
        if address_elem:
            data.address = address_elem.get_text(strip=True)
            
        # Optional external website
        website_elem = soup.select_one("a.website-link")
        if website_elem and "href" in website_elem.attrs:
            data.website = website_elem["href"]
            
        return data
