import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import Optional
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from database import get_db, init_db, engine
from models import User, Farmer, MandiOwner, Retailer, RetailerItem, RetailerMandiOrder, Base
from retailer.routes import router as retailer_router
from schemas import UserRegister, UserLogin, Token, UserResponse
from auth import verify_password, get_password_hash, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from farmer.routes import router as farmer_router
from retailer.agent import run_demand_agent
from mandi.routes import router as mandi_router
from mandi.agent import run_mandi_agent
from farmer.agent import run_farmer_agent

logger = logging.getLogger("server")

# ── Scheduler ────────────────────────────────────────────────────────────────
scheduler = BackgroundScheduler()


def _scheduled_agent_job():
    """Wrapper called by APScheduler — runs both agents."""
    logger.info("⏰ Cron triggered: running demand agent...")
    try:
        result = run_demand_agent()
        logger.info(f"Retailer agent finished: {result[:200]}")
    except Exception as e:
        logger.error(f"Retailer agent failed: {e}", exc_info=True)

    logger.info("⏰ Cron triggered: running mandi agent...")
    try:
        result = run_mandi_agent()
        logger.info(f"Mandi agent finished: {result[:200]}")
    except Exception as e:
        logger.error(f"Mandi agent failed: {e}", exc_info=True)

    logger.info("⏰ Cron triggered: running farmer agent...")
    try:
        result = run_farmer_agent()
        logger.info(f"Farmer agent finished: {result[:200]}")
    except Exception as e:
        logger.error(f"Farmer agent failed: {e}", exc_info=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: schedule the agent to run daily at 06:00 UTC
    scheduler.add_job(
        _scheduled_agent_job,
        trigger=CronTrigger(hour=6, minute=0),
        id="demand_alert_agent",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("✅ APScheduler started — demand agent runs daily at 06:00 UTC")
    yield
    # Shutdown
    scheduler.shutdown(wait=False)
    logger.info("🛑 APScheduler shut down")


app = FastAPI(title="Supply Chain Management API", lifespan=lifespan)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# # Initialize database tables on startup
# @app.on_event("startup")
# def startup_event():
#     print("Creating database tables...")
#     Base.metadata.create_all(bind=engine)
#     print("Database tables created successfully!")

# Include farmer routes
app.include_router(farmer_router, prefix="/api/farmer")

@app.get("/")
def read_root():
    return {
        "message": "Supply Chain Management API",
        "version": "1.0.0",
        "endpoints": {
            "register": "/api/register",
            "login": "/api/login"
        }
    }

@app.post("/api/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """
    Register a new user with role-based profile creation
    
    Roles: farmer, mandi_owner, retailer, admin
    """
    # Check if username already exists
    existing_user = db.query(User).filter(User.username == user_data.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    # Hash the password
    hashed_password = get_password_hash(user_data.password)
    
    # Create user
    new_user = User(
        username=user_data.username,
        password_hash=hashed_password,
        role=user_data.role,
        contact=user_data.contact,
        latitude=user_data.latitude,
        longitude=user_data.longitude
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Create role-specific profile
    if user_data.role == "farmer":
        farmer_profile = Farmer(
            user_id=new_user.id,
            language=user_data.language or "English"
        )
        db.add(farmer_profile)
    elif user_data.role == "mandi_owner":
        mandi_profile = MandiOwner(
            user_id=new_user.id,
            language=user_data.language or "English"
        )
        db.add(mandi_profile)
    elif user_data.role == "retailer":
        retailer_profile = Retailer(
            user_id=new_user.id,
            language=user_data.language or "English"
        )
        db.add(retailer_profile)
    
    db.commit()
    
    return new_user

@app.post("/api/login", response_model=Token)
def login(user_credentials: UserLogin, db: Session = Depends(get_db)):
    """
    Login with username and password, returns JWT token with role
    """
    # Find user by username
    user = db.query(User).filter(User.username == user_credentials.username).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify password
    if not verify_password(user_credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "sub": user.username,
            "user_id": user.id,
            "role": user.role
        },
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "username": user.username,
        "user_id": user.id
    }

# Register routes
app.include_router(retailer_router)
app.include_router(mandi_router)

@app.get("/api/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "Supply Chain API"}


@app.post("/api/agent/run", tags=["Agent"])
def trigger_agent_manually():
    """Manually trigger the demand-alert agent (for testing)."""
    try:
        result = run_demand_agent()
        return {"status": "success", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")


@app.post("/api/agent/mandi/run", tags=["Agent"])
def trigger_mandi_agent_manually():
    """Manually trigger the mandi supply-chain agent (for testing)."""
    try:
        result = run_mandi_agent()
        return {"status": "success", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")


@app.post("/api/agent/farmer/run", tags=["Agent"])
def trigger_farmer_agent_manually():
    """Manually trigger the farmer advisory agent (for testing)."""
    try:
        result = run_farmer_agent()
        return {"status": "success", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
