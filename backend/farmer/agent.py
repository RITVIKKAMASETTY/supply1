"""
Farmer advisory agent — helps farmers with crop pricing and market intelligence.

Uses `create_agent` with ChatGroq LLM.

Flow:
  1. Query the DB for farmer crops and recent mandi-farmer orders.
  2. Fetch distinct farmer locations (latitude/longitude).
  3. Use Tavily to search for crop price trends and weather news.
  4. LLM generates actionable alerts for farmers.
  5. Persist alerts into the `alerts` table with severity.
"""

import json
import logging
from datetime import datetime, timedelta

from sqlalchemy.orm import Session
from sqlalchemy import func as sa_func

from langchain.agents import create_agent
from langchain_core.tools import tool
from langchain_groq import ChatGroq

from config import settings
from database import SessionLocal
from models import Farmer, Crop, MandiFarmerOrder, User, Alert

logger = logging.getLogger("farmer_agent")


# ── Custom DB tools ─────────────────────────────────────────────────────────
@tool
def get_farmer_crops(dummy: str = "") -> str:
    """
    Return a JSON list of all crops being grown by farmers.
    Each entry has {farmer_id, username, crop_name, quantity, planted_date}.
    """
    db: Session = SessionLocal()
    try:
        rows = (
            db.query(
                Crop.farmer_id,
                User.username,
                Crop.name.label("crop_name"),
                Crop.quantity,
                Crop.planted_date,
            )
            .join(Farmer, Farmer.id == Crop.farmer_id)
            .join(User, User.id == Farmer.user_id)
            .all()
        )
        results = [
            {
                "farmer_id": r.farmer_id,
                "username": r.username,
                "crop_name": r.crop_name,
                "quantity": float(r.quantity) if r.quantity else None,
                "planted_date": str(r.planted_date) if r.planted_date else None,
            }
            for r in rows
        ]
        if not results:
            return "No crops found in the database."
        return json.dumps(results, indent=2)
    finally:
        db.close()


@tool
def get_recent_mandi_prices(dummy: str = "") -> str:
    """
    Fetch mandi-farmer orders from the past 7 days to understand current
    market prices. Returns {item, avg_price, min_price, max_price, total_orders}.
    """
    db: Session = SessionLocal()
    try:
        week_ago = datetime.utcnow() - timedelta(days=7)
        rows = (
            db.query(
                MandiFarmerOrder.item,
                sa_func.avg(MandiFarmerOrder.price_per_kg).label("avg_price"),
                sa_func.min(MandiFarmerOrder.price_per_kg).label("min_price"),
                sa_func.max(MandiFarmerOrder.price_per_kg).label("max_price"),
                sa_func.count(MandiFarmerOrder.id).label("total_orders"),
            )
            .filter(MandiFarmerOrder.order_date >= week_ago.date())
            .group_by(MandiFarmerOrder.item)
            .all()
        )
        results = [
            {
                "item": r.item,
                "avg_price": round(float(r.avg_price), 2) if r.avg_price else 0,
                "min_price": float(r.min_price) if r.min_price else 0,
                "max_price": float(r.max_price) if r.max_price else 0,
                "total_orders": r.total_orders,
            }
            for r in rows
        ]
        if not results:
            return "No mandi orders found in the past 7 days."
        return json.dumps(results, indent=2)
    finally:
        db.close()


@tool
def get_farmer_locations(dummy: str = "") -> str:
    """
    Return a JSON list of distinct farmer locations (latitude, longitude)
    from the database. Used to make Tavily searches location-aware.
    """
    db: Session = SessionLocal()
    try:
        rows = (
            db.query(User.latitude, User.longitude)
            .join(Farmer, Farmer.user_id == User.id)
            .filter(User.latitude.isnot(None), User.longitude.isnot(None))
            .distinct()
            .all()
        )
        locations = [
            {"latitude": float(r.latitude), "longitude": float(r.longitude)}
            for r in rows
        ]
        if not locations:
            return "No farmer locations found in the database."
        return json.dumps(locations)
    finally:
        db.close()


@tool
def save_farmer_alert(alert_json: str) -> str:
    """
    Save an advisory alert to the database for a farmer.
    Input must be a JSON string with keys:
      - user_id  (int)  — the farmer's user ID to notify
      - message  (str)  — the alert text
      - severity (str)  — one of: low, medium, high, critical
    Returns a confirmation message.
    """
    db: Session = SessionLocal()
    try:
        data = json.loads(alert_json)
        alert = Alert(
            user_id=data["user_id"],
            message=data["message"],
            severity=data.get("severity", "medium"),
        )
        db.add(alert)
        db.commit()
        db.refresh(alert)
        return f"Alert #{alert.id} saved for user {alert.user_id} (severity={alert.severity})."
    except Exception as e:
        db.rollback()
        return f"Failed to save alert: {e}"
    finally:
        db.close()


@tool
def get_all_farmer_user_ids(dummy: str = "") -> str:
    """
    Return a JSON list of {user_id, username, latitude, longitude} for every
    farmer. Use this to know which user_ids to send alerts to.
    """
    db: Session = SessionLocal()
    try:
        rows = (
            db.query(User.id, User.username, User.latitude, User.longitude)
            .join(Farmer, Farmer.user_id == User.id)
            .all()
        )
        results = [
            {
                "user_id": r.id,
                "username": r.username,
                "latitude": float(r.latitude) if r.latitude else None,
                "longitude": float(r.longitude) if r.longitude else None,
            }
            for r in rows
        ]
        if not results:
            return "No farmers found."
        return json.dumps(results, indent=2)
    finally:
        db.close()


# ── System prompt ────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are an agricultural advisory assistant for farmers.
Your job is to help farmers get the best prices for their crops and prepare
for weather or market changes.

INSTRUCTIONS:
1. First, call `get_farmer_crops` to see what crops farmers are currently growing.
2. Call `get_recent_mandi_prices` to see current market prices at mandis.
3. Call `get_farmer_locations` to know where the farmers are located.
4. Call `get_all_farmer_user_ids` to get the list of farmers and their user IDs.
5. Use `tavily_search_results_json` to search for recent news about
   "crop prices India", "agricultural weather forecast",
   "harvest season update", "MSP price changes", or similar queries
   relevant to the crops and locations.
6. Analyse the crop data, market prices, and news together.
7. For each significant insight, call `save_farmer_alert` with a JSON containing:
   - user_id: the farmer's user ID (send to ALL farmers)
   - message: a clear, actionable advisory (e.g. best time to sell, price trends)
   - severity: "low" | "medium" | "high" | "critical"
8. If there is no actionable insight, save one alert with severity "low" saying
   "No significant market changes expected this week. Current prices are stable."
9. Return a summary of all alerts generated."""


# ── Build & run ──────────────────────────────────────────────────────────────
def run_farmer_agent() -> str:
    """Build the agent, invoke it, return the final answer string."""
    from langchain_community.tools.tavily_search import TavilySearchResults

    tavily_search = TavilySearchResults(
        max_results=5,
        api_key=settings.TAVILY_API_KEY,
    )

    llm = ChatGroq(
        model="gpt-oss-120b",
        api_key=settings.GROQ_API_KEY,
    )

    tools = [
        get_farmer_crops,
        get_recent_mandi_prices,
        get_farmer_locations,
        get_all_farmer_user_ids,
        tavily_search,
        save_farmer_alert,
    ]

    agent = create_agent(
        llm,
        tools=tools,
        prompt=SYSTEM_PROMPT,
    )

    today = datetime.utcnow().strftime("%Y-%m-%d")
    result = agent.invoke({
        "messages": [
            ("user",
             f"Today is {today}. Analyse current crop data, mandi prices, and "
             f"market news to generate advisory alerts for farmers.")
        ]
    })

    messages = result.get("messages", [])
    if messages:
        return messages[-1].content
    return "Agent completed without output."
