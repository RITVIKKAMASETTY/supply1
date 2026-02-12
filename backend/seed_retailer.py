"""
Seed script — registers a retailer and populates sample items + orders.

Usage (with venv activated, server running on port 8001):
    python seed_retailer.py
"""

import requests
from datetime import datetime, timedelta
import random

BASE_URL = "http://localhost:8001"

# ── 1. Register a retailer ──────────────────────────────────────────────────
print("=== Registering retailer ===")
register_resp = requests.post(f"{BASE_URL}/api/register", json={
    "username": "ritvik1",
    "password": "12345678",
    "role": "retailer",
    "contact": "+919876500001",
    "latitude": 12.9716,
    "longitude": 77.5946,
    "language": "Kannada",
})

if register_resp.status_code == 201:
    print(f"✅ Registered: {register_resp.json()}")
elif "already registered" in register_resp.text.lower():
    print("ℹ️  User already exists, skipping registration.")
else:
    print(f"❌ Registration failed: {register_resp.text}")

# ── 2. Login to get JWT ─────────────────────────────────────────────────────
print("\n=== Logging in ===")
login_resp = requests.post(f"{BASE_URL}/api/login", json={
    "username": "ritvik1",
    "password": "12345678",
})

if login_resp.status_code != 200:
    print(f"❌ Login failed: {login_resp.text}")
    exit(1)

token_data = login_resp.json()
TOKEN = token_data["access_token"]
HEADERS = {"Authorization": f"Bearer {TOKEN}"}
print(f"✅ Logged in as {token_data['username']} (role={token_data['role']}, id={token_data['user_id']})")

# ── 3. Populate retailer items (4 items) ────────────────────────────────────
print("\n=== Creating retailer items ===")
items_to_create = [
    {"name": "Fresh Tomatoes",  "item": "tomato",  "quantity": 150.0},
    {"name": "Onions (Red)",    "item": "onion",   "quantity": 200.0},
    {"name": "Potatoes",        "item": "potato",  "quantity": 300.0},
    {"name": "Basmati Rice",    "item": "rice",    "quantity": 100.0},
]

for item in items_to_create:
    resp = requests.post(f"{BASE_URL}/api/retailer/items", json=item, headers=HEADERS)
    if resp.status_code == 201:
        print(f"  ✅ Created item: {item['name']} ({item['quantity']} kg)")
    else:
        print(f"  ❌ Failed: {item['name']} — {resp.text}")

# ── 4. Populate 3 months of retailer-mandi orders ──────────────────────────
print("\n=== Creating 3 months of orders ===")

ITEMS = ["tomato", "onion", "potato", "rice"]
SOURCES = ["Yeshwanthpur Mandi", "KR Market", "Kalasipalyam Market", "APMC Hubli"]
DESTINATIONS = ["Bengaluru", "Mysuru", "Mangaluru", "Dharwad"]

# Price ranges per item (₹/kg)
PRICE_RANGES = {
    "tomato": (20.0, 80.0),
    "onion":  (15.0, 60.0),
    "potato": (18.0, 45.0),
    "rice":   (40.0, 120.0),
}

TODAY = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
START_DATE = TODAY - timedelta(days=90)  # 3 months back

# Generate 2-4 orders per day for 90 days
orders_to_create = []
current_date = START_DATE
while current_date <= TODAY:
    num_orders = random.randint(2, 4)
    for _ in range(num_orders):
        item = random.choice(ITEMS)
        low, high = PRICE_RANGES[item]
        # Random lat/lng for source (mandi) and destination (retailer)
        # Approx range for Karnataka/Bangalore region:
        # Lat: 12.0 - 14.0, Lng: 76.0 - 78.0
        orders_to_create.append({
            "src_lat": round(random.uniform(12.0, 14.0), 4),
            "src_long": round(random.uniform(76.0, 78.0), 4),
            "dest_lat": round(random.uniform(12.0, 14.0), 4),
            "dest_long": round(random.uniform(76.0, 78.0), 4),
            "item": item,
            "start_time": (current_date + timedelta(hours=random.randint(5, 18), minutes=random.randint(0, 59))).isoformat(),
            "price_per_kg": round(random.uniform(low, high), 2),
            "order_date": current_date.strftime("%Y-%m-%dT00:00:00"),
        })
    current_date += timedelta(days=1)

print(f"  Generating {len(orders_to_create)} orders across 90 days...")

success = 0
failed = 0
for order in orders_to_create:
    resp = requests.post(f"{BASE_URL}/api/retailer/orders", json=order, headers=HEADERS)
    if resp.status_code == 201:
        success += 1
    else:
        failed += 1

print(f"  ✅ Created: {success}  |  ❌ Failed: {failed}")

# ── 5. Verify ───────────────────────────────────────────────────────────────
print("\n=== Verification ===")
items_resp = requests.get(f"{BASE_URL}/api/retailer/items", headers=HEADERS)
orders_resp = requests.get(f"{BASE_URL}/api/retailer/orders", headers=HEADERS)
print(f"Total items  in DB: {len(items_resp.json())}")
print(f"Total orders in DB: {len(orders_resp.json())}")
print("\n🎉 Done! Retailer data seeded successfully.")
