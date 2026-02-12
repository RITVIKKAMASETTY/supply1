from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
import random
from datetime import datetime, timedelta

from database import get_db
from models import Farmer, Crop, User, Alert
from schemas import (
    FarmerProfileUpdate, FarmerProfileResponse,
    CropCreate, CropUpdate, CropResponse,
)
from auth import get_current_user, require_role
from farmer.ai_advisor import get_ai_recommendation, parse_voice_command, ask_farming_question
from farmer.weather import get_weather_data, search_market_info
from farmer.alerts import categorize_alerts

router = APIRouter(tags=["farmer"])


# ── Helper ──────────────────────────────────────────────────────────────────
def _get_farmer_profile(user: User, db: Session) -> Farmer:
    """Return the Farmer row for the authenticated user, or 404."""
    farmer = db.query(Farmer).filter(Farmer.user_id == user.id).first()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer profile not found")
    return farmer


# ═════════════════════════════════════════════════════════════════════════════
#  PROFILE
# ═════════════════════════════════════════════════════════════════════════════

@router.get("/profile", response_model=FarmerProfileResponse)
def get_profile(
    current_user: User = Depends(require_role("farmer")),
    db: Session = Depends(get_db),
):
    """Get the logged-in farmer's profile."""
    return _get_farmer_profile(current_user, db)


@router.put("/profile", response_model=FarmerProfileResponse)
def update_profile(
    payload: FarmerProfileUpdate,
    current_user: User = Depends(require_role("farmer")),
    db: Session = Depends(get_db),
):
    """Update the farmer's profile (contact, lat/lng, language)."""
    farmer = _get_farmer_profile(current_user, db)

    if payload.contact is not None:
        current_user.contact = payload.contact
    if payload.latitude is not None:
        current_user.latitude = payload.latitude
    if payload.longitude is not None:
        current_user.longitude = payload.longitude
    if payload.language is not None:
        farmer.language = payload.language

    db.commit()
    db.refresh(farmer)
    return farmer


# ═════════════════════════════════════════════════════════════════════════════
#  CROPS  (CRUD)
# ═════════════════════════════════════════════════════════════════════════════

@router.get("/crops", response_model=List[CropResponse])
def list_crops(
    current_user: User = Depends(require_role("farmer")),
    db: Session = Depends(get_db),
):
    """List all crops belonging to the logged-in farmer."""
    farmer = _get_farmer_profile(current_user, db)
    return db.query(Crop).filter(Crop.farmer_id == farmer.id).all()


@router.post("/crops", response_model=CropResponse, status_code=status.HTTP_201_CREATED)
def create_crop(
    payload: CropCreate,
    current_user: User = Depends(require_role("farmer")),
    db: Session = Depends(get_db),
):
    """Add a new crop for the farmer."""
    farmer = _get_farmer_profile(current_user, db)
    crop = Crop(
        farmer_id=farmer.id,
        name=payload.name,
        quantity=payload.quantity,
        planted_date=payload.planted_date,
    )
    db.add(crop)
    db.commit()
    db.refresh(crop)
    return crop


@router.get("/crops/{crop_id}", response_model=CropResponse)
def get_crop(
    crop_id: int,
    current_user: User = Depends(require_role("farmer")),
    db: Session = Depends(get_db),
):
    """Get a single crop by ID."""
    farmer = _get_farmer_profile(current_user, db)
    crop = db.query(Crop).filter(
        Crop.id == crop_id, Crop.farmer_id == farmer.id
    ).first()
    if not crop:
        raise HTTPException(status_code=404, detail="Crop not found")
    return crop


@router.put("/crops/{crop_id}", response_model=CropResponse)
def update_crop(
    crop_id: int,
    payload: CropUpdate,
    current_user: User = Depends(require_role("farmer")),
    db: Session = Depends(get_db),
):
    """Update an existing crop."""
    farmer = _get_farmer_profile(current_user, db)
    crop = db.query(Crop).filter(
        Crop.id == crop_id, Crop.farmer_id == farmer.id
    ).first()
    if not crop:
        raise HTTPException(status_code=404, detail="Crop not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(crop, key, value)

    db.commit()
    db.refresh(crop)
    return crop


@router.delete("/crops/{crop_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_crop(
    crop_id: int,
    current_user: User = Depends(require_role("farmer")),
    db: Session = Depends(get_db),
):
    """Delete a crop."""
    farmer = _get_farmer_profile(current_user, db)
    crop = db.query(Crop).filter(
        Crop.id == crop_id, Crop.farmer_id == farmer.id
    ).first()
    if not crop:
        raise HTTPException(status_code=404, detail="Crop not found")
    db.delete(crop)
    db.commit()


# ─── Request / Response Models ───
class FarmSetup(BaseModel):
    location: str = ""
    lat: float
    lng: float
    hectares: float = 1.0
    crop: str = "tomato"

class VoiceCommand(BaseModel):
    text: str
    lat: float = 12.97
    lng: float = 77.59
    location: str = ""

class AnalyzeRequest(BaseModel):
    crop: str
    quantity: float
    lat: float
    lng: float
    location: str = ""

class WeatherRequest(BaseModel):
    lat: float
    lng: float
    location: str = ""


# ─── Mock Mandi Data ───
MOCK_MANDIS = [
    {"id": 1, "name": "APMC Yeshwanthpur", "lat": 13.0220, "lng": 77.5513, "district": "Bangalore Urban"},
    {"id": 2, "name": "KR Market", "lat": 12.9634, "lng": 77.5779, "district": "Bangalore Urban"},
    {"id": 3, "name": "Bangalore APMC Binny Mill", "lat": 12.9780, "lng": 77.5726, "district": "Bangalore Urban"},
    {"id": 4, "name": "Chikkaballapur Mandi", "lat": 13.4355, "lng": 77.7270, "district": "Chikkaballapur"},
    {"id": 5, "name": "Kolar Mandi", "lat": 13.1362, "lng": 78.1296, "district": "Kolar"},
    {"id": 6, "name": "Tumkur APMC", "lat": 13.3392, "lng": 77.1010, "district": "Tumkur"},
    {"id": 7, "name": "Mysore Mandi", "lat": 12.3051, "lng": 76.6551, "district": "Mysore"},
    {"id": 8, "name": "Mandya APMC", "lat": 12.5218, "lng": 76.8951, "district": "Mandya"},
]

CROP_PRICE_RANGES = {
    "tomato": (15, 55), "onion": (20, 60), "potato": (18, 40),
    "wheat": (22, 35), "rice": (30, 50), "chilli": (80, 200),
    "carrot": (25, 50), "brinjal": (20, 45), "cabbage": (12, 30),
    "cauliflower": (25, 60), "banana": (20, 45), "mango": (40, 120),
    "grape": (50, 150), "apple": (80, 200), "sugarcane": (3, 5),
}

import math

def haversine_distance(lat1, lng1, lat2, lng2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def get_mandis_with_prices(lat: float, lng: float, crop: str):
    """Returns mandis sorted by distance with simulated prices"""
    price_range = CROP_PRICE_RANGES.get(crop.lower(), (20, 50))
    
    mandis = []
    for m in MOCK_MANDIS:
        dist = haversine_distance(lat, lng, m["lat"], m["lng"])
        price = round(random.uniform(*price_range), 2)
        transport_cost = round(dist * 2.5 + random.uniform(100, 500), 2)  # ₹/trip
        mandis.append({
            **m,
            "distance_km": round(dist, 1),
            "price_per_kg": price,
            "transport_cost": transport_cost,
            "travel_time_min": round(dist * 1.8 + random.uniform(10, 30)),
        })
    
    mandis.sort(key=lambda x: x["distance_km"])
    return mandis


# ─── Endpoints ───

@router.get("/mandis")
async def get_nearby_mandis(lat: float = 12.97, lng: float = 77.59, crop: str = "tomato"):
    """Get nearby mandis with current prices for a crop"""
    mandis = get_mandis_with_prices(lat, lng, crop)
    return {"mandis": mandis, "crop": crop, "total": len(mandis)}


@router.post("/analyze")
async def analyze_sell(req: AnalyzeRequest):
    """AI-powered analysis: when & where to sell for best profit"""
    # Get mandi prices
    mandis = get_mandis_with_prices(req.lat, req.lng, req.crop)
    mandi_data = [{"name": m["name"], "price_per_kg": m["price_per_kg"], "distance_km": m["distance_km"], "transport_cost": m["transport_cost"]} for m in mandis[:5]]
    
    # Get weather
    weather = await get_weather_data(req.lat, req.lng, req.location)
    
    # Get market info from Tavily
    market_info = await search_market_info(req.crop, req.location or "Karnataka")
    
    # Get AI recommendation
    ai_result = await get_ai_recommendation(
        crop=req.crop,
        quantity=req.quantity,
        lat=req.lat,
        lng=req.lng,
        weather_data=weather,
        mandi_data=mandi_data
    )
    
    # Generate alerts
    alerts = categorize_alerts(ai_result) if isinstance(ai_result, dict) else []
    
    return {
        "ai_recommendation": ai_result,
        "mandis": mandis[:5],
        "weather": weather,
        "market_info": market_info,
        "alerts": alerts,
        "request": {"crop": req.crop, "quantity": req.quantity}
    }


@router.post("/voice")
async def process_voice(cmd: VoiceCommand):
    """Parse voice command and trigger appropriate action — handles ALL farmer intents"""
    parsed = await parse_voice_command(cmd.text)
    action = parsed.get("action", "unknown")

    # ── SELL ──
    if action == "sell" and parsed.get("crop"):
        qty = parsed.get("quantity") or 100
        crop = parsed["crop"]
        analysis = await analyze_sell(AnalyzeRequest(
            crop=crop, quantity=qty,
            lat=cmd.lat, lng=cmd.lng, location=cmd.location
        ))
        # Enrich with timing factors
        factors = []
        if analysis.get("weather"):
            w = analysis["weather"]
            if isinstance(w, dict):
                summary = w.get("summary", "")
                if "rain" in summary.lower():
                    factors.append({"icon": "🌧️", "factor": "Rain expected", "impact": "Prices may rise — transport harder", "suggestion": "wait"})
                else:
                    factors.append({"icon": "☀️", "factor": "Clear weather", "impact": "Good transport conditions", "suggestion": "sell"})
        factors.append({"icon": "📈", "factor": "Market trend", "impact": "Prices trending based on recent data", "suggestion": "check chart"})
        analysis["timing_factors"] = factors

        # ── Price Forecast (7-day prediction) ──
        price_range = CROP_PRICE_RANGES.get(crop.lower(), (20, 50))
        base = (price_range[0] + price_range[1]) / 2
        today = datetime.utcnow().date()
        rng = random.Random(hash(crop) + today.toordinal())

        # Simulate last 5 days of prices for the best mandi
        best_mandi_name = (analysis.get("mandis") or [{}])[0].get("name", "APMC Yeshwanthpur")
        prices_last5 = []
        p = base + rng.uniform(-3, 3)
        for _ in range(30):
            p += rng.uniform(-2, 2.3)
            p = max(price_range[0] * 0.7, min(price_range[1] * 1.3, p))
            prices_last5.append(round(p, 2))
        prices_last5 = prices_last5[-5:]  # last 5 days

        # Calculate trend and project 7 days
        avg_change = (prices_last5[-1] - prices_last5[0]) / len(prices_last5) if len(prices_last5) > 1 else 0
        last_price = prices_last5[-1]
        forecast = []
        for i in range(7):
            day_date = today + timedelta(days=i + 1)
            predicted = round(max(price_range[0] * 0.7, last_price + avg_change * (i + 1) + random.uniform(-0.5, 0.5)), 2)
            forecast.append({
                "date": day_date.isoformat(),
                "day_label": day_date.strftime("%a %d %b"),
                "predicted_price": predicted,
                "revenue": round(qty * predicted),
            })

        # Sell timing recommendation
        today_price = last_price
        max_forecast = max(forecast, key=lambda x: x["predicted_price"])
        max_idx = forecast.index(max_forecast)

        if max_forecast["predicted_price"] > today_price * 1.03:
            # Price will rise >3% — wait
            if max_idx <= 1:
                sell_timing = {"action": "WAIT_2_DAYS", "reason": f"Price expected to rise to ₹{max_forecast['predicted_price']}/kg by {max_forecast['day_label']}", "best_day": max_forecast["day_label"], "best_price": max_forecast["predicted_price"]}
            else:
                sell_timing = {"action": "WAIT_WEEK", "reason": f"Price rising trend — peak ₹{max_forecast['predicted_price']}/kg expected on {max_forecast['day_label']}", "best_day": max_forecast["day_label"], "best_price": max_forecast["predicted_price"]}
        else:
            sell_timing = {"action": "SELL_TODAY", "reason": "Prices are stable or declining — selling today gives you the best return", "best_day": "Today", "best_price": today_price}

        analysis["price_forecast"] = forecast
        analysis["sell_timing"] = sell_timing
        analysis["today_price"] = today_price

        return {"parsed_command": parsed, "response_type": "sell_analysis", "analysis": analysis}

    # ── GROW / PLANT ──
    elif action == "grow" and parsed.get("crop"):
        crop = parsed["crop"]
        return {
            "parsed_command": parsed,
            "response_type": "grow_confirm",
            "crop": crop,
            "message": f"Great! You're growing {crop}. I'll track prices for you.",
            "spoken_summary": f"बहुत अच्छा! आप {crop} उगा रहे हैं। मैं आपके लिए कीमतें ट्रैक करूँगा।"
        }

    # ── HARVEST ADVICE ──
    elif action == "harvest_advice":
        crop = parsed.get("crop", "")
        age = parsed.get("age_months", "")
        details = parsed.get("details", cmd.text)
        question = f"Should I harvest {crop}?" + (f" It's {age} months old." if age else "") + f" {details}"
        advice = await ask_farming_question(question, crop=crop, context=f"Age: {age} months" if age else "")
        return {"parsed_command": parsed, "response_type": "advice_card", "advice": advice}

    # ── FARMING ADVICE ──
    elif action == "farming_advice":
        crop = parsed.get("crop", "")
        details = parsed.get("details", cmd.text)
        advice = await ask_farming_question(details or cmd.text, crop=crop)
        return {"parsed_command": parsed, "response_type": "advice_card", "advice": advice}

    # ── GENERAL QUESTION ──
    elif action == "general":
        details = parsed.get("details", cmd.text)
        advice = await ask_farming_question(details or cmd.text)
        return {"parsed_command": parsed, "response_type": "advice_card", "advice": advice}

    # ── CHECK WEATHER ──
    elif action == "check_weather":
        weather = await get_weather_data(cmd.lat, cmd.lng, cmd.location)
        return {"parsed_command": parsed, "response_type": "weather", "weather": weather}

    # ── CHECK PRICE ──
    elif action == "check_price":
        crop = parsed.get("crop", "tomato")
        mandis = get_mandis_with_prices(cmd.lat, cmd.lng, crop)
        return {"parsed_command": parsed, "response_type": "price_check", "mandis": mandis[:5], "crop": crop}

    # ── UNKNOWN — try as general question ──
    else:
        try:
            advice = await ask_farming_question(cmd.text)
            return {"parsed_command": parsed, "response_type": "advice_card", "advice": advice}
        except:
            return {"parsed_command": parsed, "response_type": "error", "message": "Sorry, I didn't understand. Try: 'sell 100kg tomato' or 'I grow wheat'"}


@router.post("/ask")
async def ask_question(cmd: VoiceCommand):
    """General farming question endpoint — returns structured UI advice card"""
    advice = await ask_farming_question(cmd.text, crop="", context=f"Location: {cmd.lat},{cmd.lng}")
    return {"response_type": "advice_card", "advice": advice}


@router.post("/weather")
async def get_weather(req: WeatherRequest):
    """Get weather for farmer's location"""
    weather = await get_weather_data(req.lat, req.lng, req.location)
    return weather


# ═════════════════════════════════════════════════════════════════════════════
#  PRICE HISTORY  (simulated 30-day time-series)
# ═════════════════════════════════════════════════════════════════════════════

@router.get("/price-history")
async def get_price_history(crop: str = "tomato", days: int = 30):
    """Returns simulated daily price history for a crop across mandis.
    Uses random-walk seeded by crop name for deterministic-ish data."""
    price_range = CROP_PRICE_RANGES.get(crop.lower(), (20, 50))
    base_price = (price_range[0] + price_range[1]) / 2
    mandi_names = [m["name"] for m in MOCK_MANDIS[:5]]
    today = datetime.utcnow().date()

    # Seed by crop so same crop returns consistent data within a session
    rng = random.Random(hash(crop) + today.toordinal())

    history = []
    for mandi_name in mandi_names:
        price = base_price + rng.uniform(-5, 5)
        for d in range(days):
            date_str = (today - timedelta(days=days - 1 - d)).isoformat()
            # Random walk with mean reversion
            price += rng.uniform(-2, 2.3)  # slight upward bias
            price = max(price_range[0] * 0.7, min(price_range[1] * 1.3, price))
            history.append({
                "date": date_str,
                "mandi_name": mandi_name,
                "price_per_kg": round(price, 2)
            })

    return {"crop": crop, "days": days, "history": history}


# ═════════════════════════════════════════════════════════════════════════════
#  ALERTS  (from agent-generated DB alerts)
# ═════════════════════════════════════════════════════════════════════════════

@router.get("/alerts")
def get_farmer_alerts(
    current_user: User = Depends(require_role("farmer")),
    db: Session = Depends(get_db),
):
    """Get all alerts for the logged-in farmer, newest first."""
    alerts = (
        db.query(Alert)
        .filter(Alert.user_id == current_user.id)
        .order_by(Alert.created_at.desc())
        .limit(20)
        .all()
    )
    return [
        {
            "id": a.id,
            "message": a.message,
            "seen": a.seen,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in alerts
    ]


# ═════════════════════════════════════════════════════════════════════════════
#  SETUP  (one-step farm onboarding)
# ═════════════════════════════════════════════════════════════════════════════

class FarmSetupRequest(BaseModel):
    location_name: str = ""
    lat: Optional[float] = None
    lng: Optional[float] = None
    crop: str = "tomato"
    hectares: Optional[float] = None

@router.put("/setup")
def setup_farm(
    payload: FarmSetupRequest,
    current_user: User = Depends(require_role("farmer")),
    db: Session = Depends(get_db),
):
    """One-step farm setup: updates location, creates initial crop."""
    farmer = _get_farmer_profile(current_user, db)

    # Update location if provided
    if payload.lat is not None:
        current_user.latitude = payload.lat
    if payload.lng is not None:
        current_user.longitude = payload.lng

    db.commit()

    # Create initial crop if farmer has no crops yet
    existing_crops = db.query(Crop).filter(Crop.farmer_id == farmer.id).all()
    crop_created = None
    if not existing_crops:
        crop = Crop(
            farmer_id=farmer.id,
            name=payload.crop,
            quantity=0,
            planted_date=datetime.utcnow().date(),
        )
        db.add(crop)
        db.commit()
        db.refresh(crop)
        crop_created = {"id": crop.id, "name": crop.name}

    db.refresh(farmer)
    return {
        "status": "ok",
        "lat": float(current_user.latitude) if current_user.latitude else None,
        "lng": float(current_user.longitude) if current_user.longitude else None,
        "location_name": payload.location_name,
        "crop_created": crop_created,
        "total_crops": len(existing_crops) + (1 if crop_created else 0),
    }
