"""
Supply-chain agent for mandi owners.

Uses `create_agent` with ChatGroq LLM.

Flow:
  1. Query the DB for past-7-day mandi-farmer orders (procurement data).
  2. Fetch distinct mandi owner locations (latitude/longitude).
  3. Use Tavily to search for agricultural supply news near those locations.
  4. LLM decides whether to create alerts for mandi owners.
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
from models import MandiFarmerOrder, MandiOwner, User, Alert

logger = logging.getLogger("mandi_agent")


# ── Custom DB tools ─────────────────────────────────────────────────────────
@tool
def get_past_week_procurement(dummy: str = "") -> str:
    """
    Fetch mandi-farmer orders from the past 7 days.
    Returns a JSON list of {item, total_orders, total_price, avg_price_per_kg,
    earliest_order, latest_order} grouped by item.
    """
    db: Session = SessionLocal()
    try:
        week_ago = datetime.utcnow() - timedelta(days=7)
        rows = (
            db.query(
                MandiFarmerOrder.item,
                sa_func.count(MandiFarmerOrder.id).label("total_orders"),
                sa_func.sum(MandiFarmerOrder.price_per_kg).label("total_price"),
                sa_func.avg(MandiFarmerOrder.price_per_kg).label("avg_price_per_kg"),
                sa_func.min(MandiFarmerOrder.order_date).label("earliest_order"),
                sa_func.max(MandiFarmerOrder.order_date).label("latest_order"),
            )
            .filter(MandiFarmerOrder.order_date >= week_ago.date())
            .group_by(MandiFarmerOrder.item)
            .all()
        )
        results = [
            {
                "item": r.item,
                "total_orders": r.total_orders,
                "total_price": float(r.total_price) if r.total_price else 0,
                "avg_price_per_kg": round(float(r.avg_price_per_kg), 2) if r.avg_price_per_kg else 0,
                "earliest_order": str(r.earliest_order) if r.earliest_order else None,
                "latest_order": str(r.latest_order) if r.latest_order else None,
            }
            for r in rows
        ]
        if not results:
            return "No mandi-farmer orders found in the past 7 days."
        return json.dumps(results, indent=2)
    finally:
        db.close()


@tool
def get_mandi_locations(dummy: str = "") -> str:
    """
    Return a JSON list of distinct mandi owner locations (latitude, longitude)
    from the database. Used to make Tavily searches location-aware.
    """
    db: Session = SessionLocal()
    try:
        rows = (
            db.query(User.latitude, User.longitude)
            .join(MandiOwner, MandiOwner.user_id == User.id)
            .filter(User.latitude.isnot(None), User.longitude.isnot(None))
            .distinct()
            .all()
        )
        locations = [
            {"latitude": float(r.latitude), "longitude": float(r.longitude)}
            for r in rows
        ]
        if not locations:
            return "No mandi owner locations found in the database."
        return json.dumps(locations)
    finally:
        db.close()


@tool
def save_mandi_alert(alert_json: str) -> str:
    """
    Save a supply alert to the database for a mandi owner.
    Input must be a JSON string with keys:
      - user_id  (int)  — the mandi owner's user ID to notify
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
def get_all_mandi_owner_user_ids(dummy: str = "") -> str:
    """
    Return a JSON list of {user_id, username, latitude, longitude} for every
    mandi owner. Use this to know which user_ids to send alerts to.
    """
    db: Session = SessionLocal()
    try:
        rows = (
            db.query(User.id, User.username, User.latitude, User.longitude)
            .join(MandiOwner, MandiOwner.user_id == User.id)
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
            return "No mandi owners found."
        return json.dumps(results, indent=2)
    finally:
        db.close()


# ── System prompt ────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are a supply-chain intelligence assistant for mandi (wholesale market) owners.
Your job is to help mandi owners anticipate supply trends and price fluctuations.

INSTRUCTIONS:
1. First, call `get_past_week_procurement` to see what items farmers have been
   supplying to mandis recently.
2. Call `get_mandi_locations` to know where the mandi owners are located.
3. Call `get_all_mandi_owner_user_ids` to get the list of mandi owners and their user IDs.
4. Use `tavily_search_results_json` to search for recent news about
   "crop harvest season India", "agricultural supply shortage",
   "farmer produce prices", "mandi wholesale market trends", or similar
   queries relevant to the items and locations.
5. Analyse the procurement trends and news together.
6. For each significant insight, call `save_mandi_alert` with a JSON containing:
   - user_id: the mandi owner's user ID (send to ALL mandi owners)
   - message: a clear, actionable alert about supply or pricing changes
   - severity: "low" | "medium" | "high" | "critical"
7. If there is no actionable insight, save one alert with severity "low" saying
   "No significant supply changes expected this week."
8. Return a summary of all alerts generated."""


# ── Build & run ──────────────────────────────────────────────────────────────
def run_mandi_agent() -> str:
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
        get_past_week_procurement,
        get_mandi_locations,
        get_all_mandi_owner_user_ids,
        tavily_search,
        save_mandi_alert,
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
             f"Today is {today}. Analyse past week procurement data and current "
             f"market news to generate supply alerts for mandi owners.")
        ]
    })

    messages = result.get("messages", [])
    if messages:
        return messages[-1].content
    return "Agent completed without output."
