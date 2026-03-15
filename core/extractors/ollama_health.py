import asyncio
import httpx
import structlog
from typing import List, Optional
from core.config import settings

logger = structlog.get_logger()

async def check_ollama_health() -> bool:
    """Checks if Ollama is running at the configured endpoint."""
    url = f"{settings.OLLAMA_BASE_URL}/api/tags"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            logger.info("Ollama is running", url=settings.OLLAMA_BASE_URL)
            return True
    except httpx.RequestError as e:
        logger.error("Failed to connect to Ollama", error=str(e), url=url)
        return False
    except httpx.HTTPStatusError as e:
        logger.error("Ollama returned an error status", status_code=e.response.status_code)
        return False

async def list_available_models() -> List[str]:
    """Retrieves a list of available models from Ollama."""
    url = f"{settings.OLLAMA_BASE_URL}/api/tags"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()
            models = [model.get("name") for model in data.get("models", [])]
            return models
    except Exception as e:
        logger.warning("Could not list Ollama models", error=str(e))
        return []

async def verify_recommended_model() -> bool:
    """Warns if the recommended model is not pulled in Ollama."""
    models = await list_available_models()
    
    # Check if the exact model or any tag of it is present
    target_model = settings.OLLAMA_MODEL
    
    is_present = False
    for m in models:
        # e.g. "llama3.1:latest" vs "llama3.1"
        if m == target_model or m.startswith(f"{target_model}:"):
            is_present = True
            break
            
    if is_present:
        logger.info("Recommended model found in Ollama", model=target_model)
        return True
    else:
        logger.warning(
            f"Recommended model '{target_model}' not found in Ollama.",
            suggestion=f"Please run: docker exec biscraper_ollama ollama run {target_model}"
        )
        return False

async def get_ollama_status() -> dict:
    """Returns full health status dictionary."""
    is_running = await check_ollama_health()
    if not is_running:
        return {"status": "offline", "models": [], "recommended_model_present": False}
        
    models = await list_available_models()
    model_present = await verify_recommended_model()
    
    return {
        "status": "online",
        "models": models,
        "recommended_model_present": model_present
    }
