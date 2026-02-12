"""
Demand-alert agent — runs on a cron schedule (or manually via API).

Uses `from langchain.agents import create_agent` with Groq LLM.

Flow:
  1. Query the DB for past-7-day retailer-mandi orders (sales data).
  2. Fetch distinct retailer locations (latitude/longitude).
  3. Use Tavily to search for market / demand news near those locations.
  4. LLM decides whether to create alerts.
  5. Persist alerts into the `alerts` table with severity.
"""

import os
import json
import logging
from datetime import datetime, timedelta

from dotenv import load_dotenv
from sqlalchemy.orm import Session
from sqlalchemy import func as sa_func

from langchain.agents import create_agent
from langchain_core.tools import tool
from langchain_community.tools.tavily_search import TavilySearchResults

from database import SessionLocal
from models import RetailerMandiOrder, Retailer, User, Alert

load_dotenv()

logger = logging.getLogger("demand_agent")

# ── Tavily search tool ──────────────────────────────────────────────────────
tavily_search = TavilySearchResults(
    max_results=5,
    api_key=os.getenv("TAVILY_API_KEY"),
)


# ── Custom DB tools ─────────────────────────────────────────────────────────
@tool
def get_past_week_sales(dummy: str = "") -> str:
    """
    Fetch retailer-mandi orders from the past 7 days.
    Returns a JSON list of {item, total_orders, total_price, avg_price_per_kg,
    earliest_order, latest_order} grouped by item.
    """
    db: Session = SessionLocal()
    try:
        week_ago = datetime.utcnow() - timedelta(days=7)
        rows = (
            db.query(
                RetailerMandiOrder.item,
                sa_func.count(RetailerMandiOrder.id).label("total_orders"),
                sa_func.sum(RetailerMandiOrder.price_per_kg).label("total_price"),
                sa_func.avg(RetailerMandiOrder.price_per_kg).label("avg_price_per_kg"),
                sa_func.min(RetailerMandiOrder.order_date).label("earliest_order"),
                sa_func.max(RetailerMandiOrder.order_date).label("latest_order"),
            )
            .filter(RetailerMandiOrder.order_date >= week_ago.date())
            .group_by(RetailerMandiOrder.item)
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
            return "No orders found in the past 7 days."
        return json.dumps(results, indent=2)
    finally:
        db.close()


@tool
def get_retailer_locations(dummy: str = "") -> str:
    """
    Return a JSON list of distinct retailer locations (latitude, longitude)
    from the database. Used to make Tavily searches location-aware.
    """
    db: Session = SessionLocal()
    try:
        rows = (
            db.query(User.latitude, User.longitude)
            .join(Retailer, Retailer.user_id == User.id)
            .filter(User.latitude.isnot(None), User.longitude.isnot(None))
            .distinct()
            .all()
        )
        locations = [
            {"latitude": float(r.latitude), "longitude": float(r.longitude)}
            for r in rows
        ]
        if not locations:
            return "No retailer locations found in the database."
        return json.dumps(locations)
    finally:
        db.close()


@tool
def save_alert(alert_json: str) -> str:
    """
    Save a demand alert to the database.
    Input must be a JSON string with keys:
      - user_id  (int)  — the retailer's user ID to notify
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
def get_all_retailer_user_ids(dummy: str = "") -> str:
    """
    Return a JSON list of {user_id, username, latitude, longitude} for every
    retailer. Use this to know which user_ids to send alerts to.
    """
    db: Session = SessionLocal()
    try:
        rows = (
            db.query(User.id, User.username, User.latitude, User.longitude)
            .join(Retailer, Retailer.user_id == User.id)
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
            return "No retailers found."
        return json.dumps(results, indent=2)
    finally:
        db.close()


# ── System prompt ────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are a demand-forecasting assistant for a supply-chain platform.
Your job is to help retailers prepare for upcoming demand surges.

INSTRUCTIONS:
1. First, call `get_past_week_sales` to see what items retailers ordered recently.
2. Call `get_retailer_locations` to know where the retailers are located.
3. Call `get_all_retailer_user_ids` to get the list of retailers and their user IDs.
4. Use `tavily_search_results_json` to search for recent news about
   "agricultural produce demand increase", "vegetable price rise",
   "fruit market surge", or similar queries relevant to the items and locations.
5. Analyse the sales trends and news together.
6. For each significant insight, call `save_alert` with a JSON containing:
   - user_id: the retailer's user ID (send to ALL retailers)
   - message: a clear, actionable alert
   - severity: "low" | "medium" | "high" | "critical"
7. If there is no actionable insight, save one alert with severity "low" saying
   "No significant demand changes expected this week."
8. Return a summary of all alerts generated."""


# ── Build & run ──────────────────────────────────────────────────────────────
def run_demand_agent() -> str:
    """Build the agent, invoke it, return the final answer string."""
    tools = [
        get_past_week_sales,
        get_retailer_locations,
        get_all_retailer_user_ids,
        tavily_search,
        save_alert,
    ]

    agent = create_agent(
        "groq:gpt-oss-120b",
        tools=tools,
        prompt=SYSTEM_PROMPT,
    )

    today = datetime.utcnow().strftime("%Y-%m-%d")
    result = agent.invoke({
        "messages": [
            ("user",
             f"Today is {today}. Analyse past week sales data and current "
             f"market news to generate demand alerts for retailers.")
        ]
    })

    # Extract the final AI message content
    messages = result.get("messages", [])
    if messages:
        return messages[-1].content
    return "Agent completed without output."
