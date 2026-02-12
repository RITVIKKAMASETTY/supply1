from database import engine
from sqlalchemy import text

def reset_orders_tables():
    with engine.connect() as conn:
        print("Dropping retailer_mandi_order table...")
        conn.execute(text("DROP TABLE IF EXISTS retailer_mandi_order CASCADE"))
        print("Dropping mandi_farmer_orders table...")
        conn.execute(text("DROP TABLE IF EXISTS mandi_farmer_orders CASCADE"))
        conn.commit()
    print("Tables dropped. Restart the server to recreate them with new schema.")

if __name__ == "__main__":
    reset_orders_tables()
