from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
import random

from database import get_db
from models import Farmer, Crop, User
from schemas import (
    FarmerProfileUpdate, FarmerProfileResponse,
    CropCreate, CropUpdate, CropResponse,
)
from auth import get_current_user, require_role
from farmer.ai_advisor import get_ai_recommendation, parse_voice_command
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
    """Parse voice command and trigger appropriate action"""
    parsed = await parse_voice_command(cmd.text)
    
    if parsed.get("action") == "sell" and parsed.get("crop") and parsed.get("quantity"):
        # Auto-trigger analysis
        analysis = await analyze_sell(AnalyzeRequest(
            crop=parsed["crop"],
            quantity=parsed["quantity"],
            lat=cmd.lat,
            lng=cmd.lng,
            location=cmd.location
        ))
        return {
            "parsed_command": parsed,
            "analysis": analysis
        }
    elif parsed.get("action") == "check_weather":
        weather = await get_weather_data(cmd.lat, cmd.lng, cmd.location)
        return {"parsed_command": parsed, "weather": weather}
    elif parsed.get("action") == "check_price":
        crop = parsed.get("crop", "tomato")
        mandis = get_mandis_with_prices(cmd.lat, cmd.lng, crop)
        return {"parsed_command": parsed, "mandis": mandis[:5], "crop": crop}
    else:
        return {"parsed_command": parsed, "message": "Command not fully understood. Try: 'sell 100kg tomato' or 'check weather'"}


@router.post("/weather")
async def get_weather(req: WeatherRequest):
    """Get weather for farmer's location"""
    weather = await get_weather_data(req.lat, req.lng, req.location)
    return weather
