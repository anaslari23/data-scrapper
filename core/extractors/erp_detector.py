import json
import httpx
import asyncio
from typing import List, Optional, Dict, Any
from dataclasses import dataclass, field
from pydantic import BaseModel, Field
from duckduckgo_search import DDGS
from bs4 import BeautifulSoup

import structlog
from core.config import settings

logger = structlog.get_logger(__name__)

# Free tier heuristics for ERP detection
ERP_SIGNATURES = {
    "SAP": ["sap.com", "/sap/", "sapfiori", "sap-icon", "S/4HANA", 
            "SAP Business One", "SAP B1", "SuccessFactors", "SAP ECC",
            "sap-ui5", "fiori"],
    "Oracle": ["oracle.com", "netsuite", "oracleerp", "JD Edwards", 
               "Oracle Fusion", "Oracle EBS", "peoplesoft"],
    "Microsoft Dynamics": ["dynamics.com", "dynamics365", "ax2012",
                           "Business Central", "Dynamics NAV", "Dynamics AX"],
    "Tally": ["tallysolutions.com", "TallyPrime", "Tally ERP 9", 
              "tally.net", "TDL"],
    "Zoho": ["zoho.com/books", "Zoho Books", "Zoho ERP", "zohocrm"],
    "Odoo": ["odoo.com", "/web#action", "odoo-", "runbot.odoo"],
    "Busy": ["busywin.com", "BUSY Accounting", "BUSY Software"],
    "QuickBooks": ["quickbooks.com", "quickbooks", "QB Online"],
    "Marg": ["margerp.com", "MARG ERP"],
}

class ERPResult(BaseModel):
    name: Optional[str] = None
    confidence: float = 0.0
    detection_method: str = "none"
    evidence_snippets: List[str] = Field(default_factory=list)


class ERPDetector:
    """Detects ERP usage combining static HTML, Job Scrapes, and local LLM."""
    
    @staticmethod
    def _static_keyword_scan(html: str) -> Optional[tuple[str, str]]:
        """Scans raw HTML for exact substring matches of ERP signatures."""
        if not html:
            return None
            
        html_lower = html.lower()
        for erp_name, signatures in ERP_SIGNATURES.items():
            for sig in signatures:
                if sig.lower() in html_lower:
                    logger.debug("ERP Static match found", erp=erp_name, signature=sig)
                    return erp_name, f"Found keyword '{sig}' in page HTML/assets"
                    
        return None

    @staticmethod
    def _job_post_scraping(company_name: str) -> List[str]:
        """Scrapes implicit Naukri/Job links to find ERP usage hints."""
        if not company_name:
            return []
            
        # Clean company name
        c_name = company_name.replace('"', '').strip()
            
        queries = [
            f'"{c_name}" (SAP OR Oracle OR Tally OR ERP) site:naukri.com',
            f'"{c_name}" ERP consultant OR implementation'
        ]
        
        snippets = []
        try:
            with DDGS() as ddgs:
                for q in queries:
                    results = list(ddgs.text(q, max_results=5))
                    for r in results:
                        body = r.get("body", "")
                        if body:
                            snippets.append(body)
        except Exception as e:
            logger.error("Job scraping failed in ERP detect", error=str(e))
            
        # Filter snippets that actually mention an ERP to reduce noise
        relevant_snippets = []
        for snip in snippets:
            snip_lower = snip.lower()
            for erp_name in ERP_SIGNATURES.keys():
                # rough check
                if erp_name.lower() in snip_lower or "erp" in snip_lower:
                    relevant_snippets.append(snip)
                    break 
                    
        return relevant_snippets

    @staticmethod
    async def _local_llm_classification(job_snippets: List[str], company_name: str) -> Optional[dict]:
        """Asks local Ollama to classify job snippets if any exist."""
        if not job_snippets:
            return None
            
        combined_text = "\n---\n".join(job_snippets[:5]) # limit to 5 snippets
        
        prompt = f"""
        From these job posts for '{company_name}', what ERP does this company use?
        Focus on SAP, Oracle, Tally, Zoho, Microsoft Dynamics, Odoo, QuickBooks, Busy, Marg.
        Return JSON only, NO MARKDOWN.
        Schema: {{"erp": "string or null", "confidence": "0.0 to 1.0", "evidence": "string explaining why"}}
        
        Job Posts:
        {combined_text}
        """
        
        payload = {
            "model": settings.OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False,
            "format": "json"
        }
        
        ollama_url = f"{settings.OLLAMA_BASE_URL}/api/generate"
        
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(ollama_url, json=payload)
                response.raise_for_status()
                
                result = response.json()
                generated_text = result.get("response", "")
                
                try:
                    data = json.loads(generated_text)
                    return data
                except json.JSONDecodeError:
                    return None
        except Exception as e:
            logger.error("LLM ERP Classification failed", error=str(e))
            return None

    @classmethod
    async def detect(cls, company_name: str, website_html: str, website_url: str) -> ERPResult:
        """Run all string-matching and LLM approaches to determine ERP."""
        scores: Dict[str, float] = {}
        evidence_store: Dict[str, List[str]] = {}
        
        def add_score(erp: str, points: float, evidence: str):
            scores[erp] = scores.get(erp, 0.0) + points
            if erp not in evidence_store:
                evidence_store[erp] = []
            evidence_store[erp].append(evidence)

        # 1. Static Scan
        static_match = cls._static_keyword_scan(website_html)
        if static_match:
            erp_name, ev = static_match
            add_score(erp_name, 0.4, ev)
            
        # 2. Job Posts (Blocking/Threaded)
        snippets = await asyncio.to_thread(cls._job_post_scraping, company_name)
        
        # Keyword matching on job snippets
        if snippets:
            for snip in snippets:
                snip_lower = snip.lower()
                for erp_name, signatures in ERP_SIGNATURES.items():
                    # Simple check against root name
                    if erp_name.lower() in snip_lower:
                        add_score(erp_name, 0.4, f"Mention in job post snippet: {snip[:50]}...")
                        break
                        
        # 3. LLM Classification on job snippets
        llm_result = await cls._local_llm_classification(snippets, company_name)
        if llm_result and llm_result.get("erp") and llm_result.get("erp").lower() != "null":
            predicted_erp = llm_result.get("erp")
            conf = float(llm_result.get("confidence", 0.0))
            
            # Normalize edge case where LLM gives 2-part name
            normalized_erp = predicted_erp
            for known_erp in ERP_SIGNATURES.keys():
                if known_erp.lower() in predicted_erp.lower():
                    normalized_erp = known_erp
                    break
                    
            add_score(normalized_erp, 0.2 * conf, f"LLM Prediction: {llm_result.get('evidence', '')}")

        # Compute winner
        if not scores:
            return ERPResult()
            
        winning_erp = max(scores.items(), key=lambda x: x[1])
        return ERPResult(
            name=winning_erp[0],
            confidence=min(winning_erp[1], 0.99), # Cap at 0.99
            detection_method="Ensemble (Static, JobScrape, LLM)",
            evidence_snippets=evidence_store.get(winning_erp[0], [])
        )
