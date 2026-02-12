import os
import httpx
from dotenv import load_dotenv

load_dotenv()

TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
TAVILY_URL = "https://api.tavily.com/search"


async def get_weather_data(lat: float, lng: float, location_name: str = ""):
    """
    Uses Tavily search to get current weather and forecast for the farmer's location.
    """
    query = f"current weather forecast {location_name} India temperature rain humidity wind today tomorrow" if location_name else f"weather forecast India latitude {lat} longitude {lng} today tomorrow"
    
    payload = {
        "api_key": TAVILY_API_KEY,
        "query": query,
        "search_depth": "basic",
        "max_results": 5,
        "include_answer": True
    }
    
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(TAVILY_URL, json=payload)
            response.raise_for_status()
            data = response.json()
            
            return {
                "summary": data.get("answer", "Weather data not available"),
                "sources": [
                    {"title": r.get("title", ""), "url": r.get("url", ""), "snippet": r.get("content", "")[:200]}
                    for r in data.get("results", [])[:3]
                ],
                "location": location_name or f"{lat}, {lng}",
                "status": "success"
            }
    except Exception as e:
        return {
            "summary": "Could not fetch weather data",
            "sources": [],
            "location": location_name or f"{lat}, {lng}",
            "status": "error",
            "error": str(e)
        }


async def search_market_info(crop: str, region: str = "India"):
    """
    Uses Tavily to search current market prices and news for a crop.
    """
    query = f"{crop} mandi price today {region} market rate per kg"
    
    payload = {
        "api_key": TAVILY_API_KEY,
        "query": query,
        "search_depth": "basic",
        "max_results": 5,
        "include_answer": True
    }
    
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(TAVILY_URL, json=payload)
            response.raise_for_status()
            data = response.json()
            
            return {
                "summary": data.get("answer", "Market data not available"),
                "sources": [
                    {"title": r.get("title", ""), "url": r.get("url", ""), "snippet": r.get("content", "")[:200]}
                    for r in data.get("results", [])[:3]
                ],
                "crop": crop,
                "region": region,
                "status": "success"
            }
    except Exception as e:
        return {
            "summary": "Could not fetch market data",
            "sources": [],
            "crop": crop,
            "region": region,
            "status": "error",
            "error": str(e)
        }
