import json
import httpx
import structlog
from typing import List, Optional, Any
from pydantic import BaseModel, Field
from bs4 import BeautifulSoup

from core.config import settings

logger = structlog.get_logger(__name__)

class ContactInfo(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None

class CompanyData(BaseModel):
    company_name: Optional[str] = None
    website: Optional[str] = None
    contacts: List[ContactInfo] = Field(default_factory=list)
    address: Optional[str] = None
    industry_type: Optional[str] = None
    employee_count: Optional[str] = None
    branch_count: Optional[int] = None
    annual_turnover: Optional[str] = None
    current_erp: Optional[str] = None
    additional_info: Optional[str] = None


class CompanyExtractor:
    
    PROMPT_TEMPLATE = """
    Extract business information from the following webpage text.
    Return ONLY a valid JSON object. No explanation. No markdown. 
    Use null for missing fields.
    
    Schema:
    {
      "company_name": string or null,
      "website": string or null,
      "contacts": [{"name": string, "role": string, "phone": string, "email": string}],
      "address": string or null,
      "industry_type": string or null,
      "employee_count": string or null,
      "branch_count": integer or null,
      "annual_turnover": string or null,
      "current_erp": string or null,
      "additional_info": string or null
    }
    
    Webpage content:
    {content}
    """

    @staticmethod
    def _clean_html(html: str) -> str:
        """Strip scripts/styles/nav/footer boilerplate."""
        soup = BeautifulSoup(html, "html.parser")
        
        # Remove unwanted tags
        for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
            tag.decompose()
            
        text = soup.get_text(separator=" ", strip=True)
        return text

    async def extract(self, html: str, url: str) -> CompanyData:
        """Extracts company data from a single HTML page."""
        cleaned_text = self._clean_html(html)
        # Truncate to 3000 chars
        truncated_text = cleaned_text[:3000]
        
        prompt = self.PROMPT_TEMPLATE.replace("{content}", truncated_text)
        
        payload = {
            "model": settings.OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False,
            "format": "json" # Force JSON schema generation with Ollama if supported, else relies on prompt
        }
        
        ollama_url = f"{settings.OLLAMA_BASE_URL}/api/generate"
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(ollama_url, json=payload)
                response.raise_for_status()
                
                result = response.json()
                generated_text = result.get("response", "")
                
                # Try parsing JSON
                try:
                    # Clean up markdown code blocks if the model ignored instruction
                    if generated_text.startswith("```json"):
                        generated_text = generated_text[7:-3]
                    elif generated_text.startswith("```"):
                        generated_text = generated_text[3:-3]
                        
                    data_dict = json.loads(generated_text)
                    return CompanyData(**data_dict)
                except json.JSONDecodeError as je:
                    logger.error("Failed to parse JSON from Ollama", error=str(je), text=generated_text)
                    # Return empty default struct
                    return CompanyData(website=url)
                    
        except Exception as e:
            logger.error("Error communicating with Ollama", error=str(e), url=url)
            return CompanyData(website=url)

    async def extract_from_multiple_pages(self, pages: List[str]) -> CompanyData:
        """
        Call extract() on each page.
        Merge results: later pages fill nulls from earlier pages.
        """
        merged_data = None
        
        for idx, html in enumerate(pages):
            url = f"page_{idx}"
            
            page_data = await self.extract(html, url)
            
            if merged_data is None:
                merged_data = page_data
            else:
                self._merge_company_data(merged_data, page_data)
                
        return merged_data or CompanyData()

    def _merge_company_data(self, target: CompanyData, source: CompanyData):
        """Merges `source` into `target`, filling None values."""
        target_dict = target.model_dump()
        source_dict = source.model_dump()
        
        for key, value in source_dict.items():
            if key == "contacts":
                # simplistic merge for contacts: just extend
                target.contacts.extend(source.contacts)
            else:
                # Fill string/int fields if target is None and source has value
                if target_dict.get(key) is None and value is not None:
                    setattr(target, key, value)
