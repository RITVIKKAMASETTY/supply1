from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from database import get_db
from models import MandiOwner, MandiItem, MandiFarmerOrder, User
from schemas import (
    MandiOwnerProfileUpdate, MandiOwnerProfileResponse,
    MandiItemCreate, MandiItemUpdate, MandiItemResponse,
    MandiFarmerOrderCreate, MandiFarmerOrderUpdate, MandiFarmerOrderResponse,
)
from auth import get_current_user, require_role

router = APIRouter(prefix="/api/mandi", tags=["Mandi"])


# ── Helper ──────────────────────────────────────────────────────────────────
def _get_mandi_profile(user: User, db: Session) -> MandiOwner:
    """Return the MandiOwner row for the authenticated user, or 404."""
    mandi = db.query(MandiOwner).filter(MandiOwner.user_id == user.id).first()
    if not mandi:
        raise HTTPException(status_code=404, detail="Mandi owner profile not found")
    return mandi


# ═════════════════════════════════════════════════════════════════════════════
#  PROFILE
# ═════════════════════════════════════════════════════════════════════════════

@router.get("/profile", response_model=MandiOwnerProfileResponse)
def get_profile(
    current_user: User = Depends(require_role("mandi_owner")),
    db: Session = Depends(get_db),
):
    """Get the logged-in mandi owner's profile."""
    mandi = _get_mandi_profile(current_user, db)
    return mandi


@router.put("/profile", response_model=MandiOwnerProfileResponse)
def update_profile(
    payload: MandiOwnerProfileUpdate,
    current_user: User = Depends(require_role("mandi_owner")),
    db: Session = Depends(get_db),
):
    """Update the mandi owner's profile (contact, lat/lng, language)."""
    mandi = _get_mandi_profile(current_user, db)

    if payload.contact is not None:
        current_user.contact = payload.contact
    if payload.latitude is not None:
        current_user.latitude = payload.latitude
    if payload.longitude is not None:
        current_user.longitude = payload.longitude
    if payload.language is not None:
        mandi.language = payload.language

    db.commit()
    db.refresh(mandi)
    return mandi


# ═════════════════════════════════════════════════════════════════════════════
#  MANDI ITEMS  (CRUD)
# ═════════════════════════════════════════════════════════════════════════════

@router.get("/items", response_model=List[MandiItemResponse])
def list_items(
    current_user: User = Depends(require_role("mandi_owner")),
    db: Session = Depends(get_db),
):
    """List all items belonging to the logged-in mandi owner."""
    mandi = _get_mandi_profile(current_user, db)
    return db.query(MandiItem).filter(MandiItem.mandi_owner_id == mandi.id).all()


@router.post("/items", response_model=MandiItemResponse, status_code=status.HTTP_201_CREATED)
def create_item(
    payload: MandiItemCreate,
    current_user: User = Depends(require_role("mandi_owner")),
    db: Session = Depends(get_db),
):
    """Add a new item to the mandi's inventory."""
    mandi = _get_mandi_profile(current_user, db)
    item = MandiItem(
        mandi_owner_id=mandi.id,
        item_name=payload.item_name,
        current_qty=payload.current_qty,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/items/{item_id}", response_model=MandiItemResponse)
def get_item(
    item_id: int,
    current_user: User = Depends(require_role("mandi_owner")),
    db: Session = Depends(get_db),
):
    """Get a single mandi item by ID."""
    mandi = _get_mandi_profile(current_user, db)
    item = db.query(MandiItem).filter(
        MandiItem.id == item_id, MandiItem.mandi_owner_id == mandi.id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


@router.put("/items/{item_id}", response_model=MandiItemResponse)
def update_item(
    item_id: int,
    payload: MandiItemUpdate,
    current_user: User = Depends(require_role("mandi_owner")),
    db: Session = Depends(get_db),
):
    """Update an existing mandi item."""
    mandi = _get_mandi_profile(current_user, db)
    item = db.query(MandiItem).filter(
        MandiItem.id == item_id, MandiItem.mandi_owner_id == mandi.id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(item, key, value)

    db.commit()
    db.refresh(item)
    return item


@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(
    item_id: int,
    current_user: User = Depends(require_role("mandi_owner")),
    db: Session = Depends(get_db),
):
    """Delete a mandi item."""
    mandi = _get_mandi_profile(current_user, db)
    item = db.query(MandiItem).filter(
        MandiItem.id == item_id, MandiItem.mandi_owner_id == mandi.id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    db.delete(item)
    db.commit()


# ═════════════════════════════════════════════════════════════════════════════
#  MANDI ↔ FARMER ORDERS  (CRUD)
# ═════════════════════════════════════════════════════════════════════════════

@router.get("/orders", response_model=List[MandiFarmerOrderResponse])
def list_orders(
    current_user: User = Depends(require_role("mandi_owner")),
    db: Session = Depends(get_db),
):
    """List all mandi-farmer orders."""
    return db.query(MandiFarmerOrder).all()


@router.post("/orders", response_model=MandiFarmerOrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(
    payload: MandiFarmerOrderCreate,
    current_user: User = Depends(require_role("mandi_owner")),
    db: Session = Depends(get_db),
):
    """Create a new mandi-farmer order."""
    order = MandiFarmerOrder(**payload.model_dump())
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


@router.get("/orders/{order_id}", response_model=MandiFarmerOrderResponse)
def get_order(
    order_id: int,
    current_user: User = Depends(require_role("mandi_owner")),
    db: Session = Depends(get_db),
):
    """Get a single order by ID."""
    order = db.query(MandiFarmerOrder).filter(MandiFarmerOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.put("/orders/{order_id}", response_model=MandiFarmerOrderResponse)
def update_order(
    order_id: int,
    payload: MandiFarmerOrderUpdate,
    current_user: User = Depends(require_role("mandi_owner")),
    db: Session = Depends(get_db),
):
    """Update an existing mandi-farmer order."""
    order = db.query(MandiFarmerOrder).filter(MandiFarmerOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(order, key, value)

    db.commit()
    db.refresh(order)
    return order


@router.delete("/orders/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_order(
    order_id: int,
    current_user: User = Depends(require_role("mandi_owner")),
    db: Session = Depends(get_db),
):
    """Delete a mandi-farmer order."""
    order = db.query(MandiFarmerOrder).filter(MandiFarmerOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    db.delete(order)
    db.commit()


# ═════════════════════════════════════════════════════════════════════════════
#  SUPPLY CHAIN INTELLIGENCE
# ═════════════════════════════════════════════════════════════════════════════

from mandi.supply_chain import (
    get_supply_overview, detect_stress_signals, forecast_prices,
    get_truck_fleet, get_interventions, run_scenario,
)


class ScenarioRequest(BaseModel):
    rain_days: int = 0
    demand_surge_pct: int = 0
    transport_delay_pct: int = 0


@router.get("/supply-chain/overview")
def supply_overview():
    return get_supply_overview()


@router.get("/supply-chain/stress")
def supply_stress():
    return detect_stress_signals()


@router.get("/supply-chain/forecast")
def supply_forecast(days: int = 7):
    return forecast_prices(days)


@router.get("/supply-chain/trucks")
def supply_trucks():
    return get_truck_fleet()


@router.get("/supply-chain/interventions")
def supply_interventions():
    return get_interventions()


@router.post("/supply-chain/scenario")
def supply_scenario(req: ScenarioRequest):
    return run_scenario(req.rain_days, req.demand_surge_pct, req.transport_delay_pct)


# ═════════════════════════════════════════════════════════════════════════════
#  STRESS ALERT SIMULATION (Twilio SMS + Calls)
# ═════════════════════════════════════════════════════════════════════════════

import os
from twilio.rest import Client as TwilioClient

ALERT_NUMBERS = ["+919620146061", "+919108208731"]

TWILIO_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_FROM = os.getenv("TWILIO_PHONE_NUMBER")


class AlertSimRequest(BaseModel):
    risk_level: str  # "low", "moderate", "high", "critical"
    risk_score: int = 50
    message: str = ""
    signals: list = []


@router.post("/supply-chain/alert-simulate")
def alert_simulate(req: AlertSimRequest):
    """
    Simulate stress alert based on risk level:
    - Low/Moderate: in-app notification only
    - High: send SMS to all numbers
    - Critical: make phone call to all numbers
    """
    level = req.risk_level.lower()
    msg = req.message or f"⚠️ FoodChain Mandi Alert — Risk Level: {level.upper()} (Score: {req.risk_score}/100)"
    if req.signals:
        msg += " | Signals: " + "; ".join(s if isinstance(s, str) else s.get("title", "") for s in req.signals[:3])

    result = {
        "risk_level": level,
        "risk_score": req.risk_score,
        "actions_taken": [],
        "numbers_contacted": [],
        "errors": [],
    }

    # Always do in-app notification
    result["actions_taken"].append({
        "type": "notification",
        "status": "sent",
        "detail": f"In-app alert dispatched: {level.upper()} risk detected",
    })

    if level in ("low", "moderate"):
        # Just notification, no external action
        result["actions_taken"].append({
            "type": "info",
            "status": "skipped",
            "detail": f"External alerts not triggered for {level} risk level",
        })
        return result

    # High risk → SMS
    if level == "high":
        if not all([TWILIO_SID, TWILIO_TOKEN, TWILIO_FROM]):
            result["errors"].append("Twilio credentials not configured")
            return result

        client = TwilioClient(TWILIO_SID, TWILIO_TOKEN)
        for number in ALERT_NUMBERS:
            try:
                sms = client.messages.create(
                    body=msg,
                    from_=TWILIO_FROM,
                    to=number,
                )
                result["actions_taken"].append({
                    "type": "sms",
                    "status": "sent",
                    "detail": f"SMS sent to {number}",
                    "sid": sms.sid,
                })
                result["numbers_contacted"].append(number)
            except Exception as e:
                result["errors"].append(f"SMS to {number} failed: {str(e)}")
        return result

    # Critical → Phone call
    if level == "critical":
        if not all([TWILIO_SID, TWILIO_TOKEN, TWILIO_FROM]):
            result["errors"].append("Twilio credentials not configured")
            return result

        client = TwilioClient(TWILIO_SID, TWILIO_TOKEN)
        twiml_msg = f"<Response><Say voice='alice'>URGENT. FoodChain Mandi Critical Alert. Risk score {req.risk_score} out of 100. Immediate action required. Please check your dashboard for details.</Say><Pause length='1'/><Say voice='alice'>Repeating. Critical supply chain disruption detected. Log in to your FoodChain dashboard immediately.</Say></Response>"

        for number in ALERT_NUMBERS:
            try:
                call = client.calls.create(
                    twiml=twiml_msg,
                    from_=TWILIO_FROM,
                    to=number,
                )
                result["actions_taken"].append({
                    "type": "call",
                    "status": "initiated",
                    "detail": f"Phone call to {number}",
                    "sid": call.sid,
                })
                result["numbers_contacted"].append(number)
            except Exception as e:
                result["errors"].append(f"Call to {number} failed: {str(e)}")

        # Also send SMS for critical
        for number in ALERT_NUMBERS:
            try:
                sms = client.messages.create(
                    body=f"🚨 CRITICAL: {msg}",
                    from_=TWILIO_FROM,
                    to=number,
                )
                result["actions_taken"].append({
                    "type": "sms",
                    "status": "sent",
                    "detail": f"Backup SMS to {number}",
                    "sid": sms.sid,
                })
            except Exception as e:
                result["errors"].append(f"Backup SMS to {number} failed: {str(e)}")

        return result

    return result
