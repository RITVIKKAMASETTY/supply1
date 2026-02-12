import os
import json
import httpx
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

async def get_ai_recommendation(crop: str, quantity: float, lat: float, lng: float, weather_data: dict = None, mandi_data: list = None):
    """
    Uses Groq LLM to analyze market conditions and recommend best sell strategy.
    Returns trade-off analysis with multiple scenarios.
    """
    context = f"""You are an expert agricultural market advisor in India. A farmer wants to sell {quantity} kg of {crop}.
    
Farm Location: lat {lat}, lng {lng}

Weather Data: {json.dumps(weather_data) if weather_data else 'Not available'}

Nearby Mandi Prices: {json.dumps(mandi_data) if mandi_data else 'Not available'}

Analyze and provide a JSON response with this exact structure:
{{
    "recommendation": "SELL_NOW" or "WAIT",
    "best_mandi": {{
        "name": "mandi name",
        "price_per_kg": number,
        "distance_km": number,
        "reason": "why this mandi"
    }},
    "scenarios": [
        {{
            "action": "Sell Now at [Mandi]",
            "expected_revenue": number,
            "transport_cost": number,
            "net_profit": number,
            "risk_level": "LOW/MEDIUM/HIGH",
            "factors": ["factor1", "factor2"]
        }}
    ],
    "weather_impact": "brief weather assessment",
    "price_trend": "UP/DOWN/STABLE with explanation",
    "urgent_alerts": ["any urgent issues"],
    "spoken_summary": "A simple 2-sentence summary in Hindi that can be read aloud to the farmer"
}}"""

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": "You are an Indian agricultural market expert. Always respond with valid JSON only. No markdown."},
            {"role": "user", "content": context}
        ],
        "temperature": 0.3,
        "max_tokens": 2000
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(GROQ_URL, headers=headers, json=payload)
        response.raise_for_status()
        result = response.json()
        content = result["choices"][0]["message"]["content"]
        
        # Try to parse JSON
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            # Try to extract JSON from the response
            start = content.find('{')
            end = content.rfind('}') + 1
            if start != -1 and end > start:
                return json.loads(content[start:end])
            return {"error": "Could not parse AI response", "raw": content}


async def parse_voice_command(text: str):
    """
    Uses Groq to parse farmer's voice command into structured data.
    Handles: sell, grow/plant, harvest advice, price check, weather, general farming questions.
    """
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": """You parse farmer voice commands into structured JSON.
Supported actions:
  "sell"   — farmer wants to sell a crop (e.g. "sell 250kg tomato", "I want to sell onion")
  "grow"   — farmer is growing / planted a crop (e.g. "I grow tomato", "I planted carrot", "main tamatar ugata hoon")
  "harvest_advice" — farmer asks about harvesting (e.g. "should I cut tomato, 3 months old", "is my wheat ready?")
  "check_price"    — farmer asks about prices (e.g. "what is price of onion", "tomato rate today")
  "check_weather"  — farmer asks about weather
  "farming_advice" — farmer asks a farming question (e.g. "how to protect from pests", "when to add fertilizer")
  "general"        — anything else farming-related

Extract: action, crop (if any), quantity (if any), age_months (if mentioned), details (extra context).
Parse Hindi/Hinglish correctly.
Always respond with valid JSON only:
{"action": "sell", "crop": "tomato", "quantity": 250, "unit": "kg"}
{"action": "grow", "crop": "carrot", "quantity": null}
{"action": "harvest_advice", "crop": "tomato", "age_months": 3, "details": "farmer asking if ready to harvest"}
{"action": "farming_advice", "crop": "wheat", "details": "asking about pest protection"}
{"action": "general", "details": "the question text"}"""},
            {"role": "user", "content": text}
        ],
        "temperature": 0.1,
        "max_tokens": 200
    }
    
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(GROQ_URL, headers=headers, json=payload)
        response.raise_for_status()
        result = response.json()
        content = result["choices"][0]["message"]["content"]
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            start = content.find('{')
            end = content.rfind('}') + 1
            if start != -1 and end > start:
                return json.loads(content[start:end])
            return {"action": "unknown", "original_text": text}


async def ask_farming_question(question: str, crop: str = "", context: str = ""):
    """
    Uses Groq to answer any farming question and return structured UI data.
    Returns title, advice cards, steps, and a spoken summary.
    """
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    
    prompt = f"""You are an expert Indian agricultural advisor. A farmer is asking:
Question: {question}
{f"Crop: {crop}" if crop else ""}
{f"Context: {context}" if context else ""}

Provide a JSON response with this structure:
{{
    "title": "Short title for the advice (e.g. 'Tomato Harvest Guide')",
    "recommendation": "MAIN advice in 1 sentence",
    "sections": [
        {{
            "icon": "emoji icon",
            "heading": "Section title",
            "content": "2-3 sentence explanation"
        }}
    ],
    "steps": [
        "Step 1: specific action",
        "Step 2: specific action"
    ],
    "timing": "When to do this (e.g. 'Harvest in 2 weeks', 'Apply fertilizer now')",
    "risk_factors": ["risk 1", "risk 2"],
    "spoken_summary": "Simple 2-sentence summary in Hindi for text-to-speech"
}}

Keep advice practical, specific to Indian farming conditions. Max 4 sections, 4 steps."""

    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": "You are an Indian agricultural expert. Always respond with valid JSON only. No markdown."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.3,
        "max_tokens": 1500
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(GROQ_URL, headers=headers, json=payload)
        response.raise_for_status()
        result = response.json()
        content = result["choices"][0]["message"]["content"]
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            start = content.find('{')
            end = content.rfind('}') + 1
            if start != -1 and end > start:
                return json.loads(content[start:end])
            return {"title": "Advice", "recommendation": content[:300], "sections": [], "steps": [], "spoken_summary": content[:100]}

