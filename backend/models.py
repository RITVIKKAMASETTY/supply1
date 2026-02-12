from sqlalchemy import Column, Integer, String, Numeric, Date, DateTime, Boolean, ForeignKey, Text, CheckConstraint, TIMESTAMP
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)
    contact = Column(String(20))
    location = Column(String(150))
    
    __table_args__ = (
        CheckConstraint("role IN ('farmer', 'mandi_owner', 'retailer', 'admin')", name='check_user_role'),
    )
    
    # Relationships
    farmer = relationship("Farmer", back_populates="user", uselist=False, cascade="all, delete-orphan")
    mandi_owner = relationship("MandiOwner", back_populates="user", uselist=False, cascade="all, delete-orphan")
    retailer = relationship("Retailer", back_populates="user", uselist=False, cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="user", cascade="all, delete-orphan")


class Farmer(Base):
    __tablename__ = "farmer"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    language = Column(String(50))
    
    # Relationships
    user = relationship("User", back_populates="farmer")
    crops = relationship("Crop", back_populates="farmer", cascade="all, delete-orphan")


class Crop(Base):
    __tablename__ = "crop"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    farmer_id = Column(Integer, ForeignKey("farmer.id", ondelete="CASCADE"))
    quantity = Column(Numeric(10, 2))
    planted_date = Column(Date)
    
    # Relationships
    farmer = relationship("Farmer", back_populates="crops")


class MandiOwner(Base):
    __tablename__ = "mandi_owners"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    language = Column(String(50))
    
    # Relationships
    user = relationship("User", back_populates="mandi_owner")
    mandi_items = relationship("MandiItem", back_populates="mandi_owner", cascade="all, delete-orphan")


class MandiItem(Base):
    __tablename__ = "mandi_items"
    
    id = Column(Integer, primary_key=True, index=True)
    mandi_owner_id = Column(Integer, ForeignKey("mandi_owners.id", ondelete="CASCADE"))
    item_name = Column(String(100), nullable=False)
    current_qty = Column(Numeric(10, 2), default=0)
    
    # Relationships
    mandi_owner = relationship("MandiOwner", back_populates="mandi_items")


class MandiFarmerOrder(Base):
    __tablename__ = "mandi_farmer_orders"
    
    id = Column(Integer, primary_key=True, index=True)
    source = Column(String(150))
    destination = Column(String(150))
    item = Column(String(100))
    start_time = Column(TIMESTAMP)
    price_per_kg = Column(Numeric(10, 2))
    order_date = Column(Date)


class Retailer(Base):
    __tablename__ = "retailer"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    language = Column(String(50))
    
    # Relationships
    user = relationship("User", back_populates="retailer")
    retailer_items = relationship("RetailerItem", back_populates="retailer", cascade="all, delete-orphan")


class RetailerItem(Base):
    __tablename__ = "retailer_item"
    
    id = Column(Integer, primary_key=True, index=True)
    retailer_id = Column(Integer, ForeignKey("retailer.id", ondelete="CASCADE"))
    name = Column(String(100))
    item = Column(String(100))
    quantity = Column(Numeric(10, 2))
    
    # Relationships
    retailer = relationship("Retailer", back_populates="retailer_items")


class RetailerMandiOrder(Base):
    __tablename__ = "retailer_mandi_order"
    
    id = Column(Integer, primary_key=True, index=True)
    source = Column(String(150))
    destination = Column(String(150))
    item = Column(String(100))
    start_time = Column(TIMESTAMP)
    price_per_kg = Column(Numeric(10, 2))
    order_date = Column(Date)


class Alert(Base):
    __tablename__ = "alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    message = Column(Text)
    seen = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="alerts")