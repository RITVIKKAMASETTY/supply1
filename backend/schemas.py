from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime, date

class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=100)
    password: str = Field(..., min_length=6)
    role: str = Field(..., pattern="^(farmer|mandi_owner|retailer|admin)$")
    contact: Optional[str] = Field(None, max_length=20)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    language: Optional[str] = Field(None, max_length=50)
    
    @validator('role')
    def validate_role(cls, v):
        allowed_roles = ['farmer', 'mandi_owner', 'retailer', 'admin']
        if v not in allowed_roles:
            raise ValueError(f'Role must be one of {allowed_roles}')
        return v

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str
    user_id: int

class UserResponse(BaseModel):
    id: int
    username: str
    role: str
    contact: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    
    class Config:
        from_attributes = True


# ── Retailer Profile ────────────────────────────────────────────────────────
class RetailerProfileUpdate(BaseModel):
    contact: Optional[str] = Field(None, max_length=20)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    language: Optional[str] = Field(None, max_length=50)


class RetailerProfileResponse(BaseModel):
    id: int
    user_id: int
    language: Optional[str]
    user: Optional[UserResponse] = None

    class Config:
        from_attributes = True


# ── Retailer Items ──────────────────────────────────────────────────────────
class RetailerItemCreate(BaseModel):
    name: str = Field(..., max_length=100)
    item: str = Field(..., max_length=100)
    quantity: Optional[float] = None


class RetailerItemUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    item: Optional[str] = Field(None, max_length=100)
    quantity: Optional[float] = None


class RetailerItemResponse(BaseModel):
    id: int
    retailer_id: int
    name: Optional[str]
    item: Optional[str]
    quantity: Optional[float]

    class Config:
        from_attributes = True


# ── Retailer ↔ Mandi Orders ────────────────────────────────────────────────
class RetailerMandiOrderCreate(BaseModel):
    src_lat: Optional[float] = None
    src_long: Optional[float] = None
    dest_lat: Optional[float] = None
    dest_long: Optional[float] = None
    item: Optional[str] = Field(None, max_length=100)
    start_time: Optional[datetime] = None
    price_per_kg: Optional[float] = None
    order_date: Optional[datetime] = None


class RetailerMandiOrderUpdate(BaseModel):
    src_lat: Optional[float] = None
    src_long: Optional[float] = None
    dest_lat: Optional[float] = None
    dest_long: Optional[float] = None
    item: Optional[str] = Field(None, max_length=100)
    start_time: Optional[datetime] = None
    price_per_kg: Optional[float] = None
    order_date: Optional[datetime] = None


class RetailerMandiOrderResponse(BaseModel):
    id: int
    src_lat: Optional[float]
    src_long: Optional[float]
    dest_lat: Optional[float]
    dest_long: Optional[float]
    item: Optional[str]
    start_time: Optional[datetime]
    price_per_kg: Optional[float]
    order_date: Optional[datetime]

    class Config:
        from_attributes = True


# ── Mandi Owner Profile ────────────────────────────────────────────────────
class MandiOwnerProfileUpdate(BaseModel):
    contact: Optional[str] = Field(None, max_length=20)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    language: Optional[str] = Field(None, max_length=50)


class MandiOwnerProfileResponse(BaseModel):
    id: int
    user_id: int
    language: Optional[str]
    user: Optional[UserResponse] = None

    class Config:
        from_attributes = True


# ── Mandi Items ─────────────────────────────────────────────────────────────
class MandiItemCreate(BaseModel):
    item_name: str = Field(..., max_length=100)
    current_qty: Optional[float] = 0


class MandiItemUpdate(BaseModel):
    item_name: Optional[str] = Field(None, max_length=100)
    current_qty: Optional[float] = None


class MandiItemResponse(BaseModel):
    id: int
    mandi_owner_id: int
    item_name: Optional[str]
    current_qty: Optional[float]

    class Config:
        from_attributes = True


# ── Mandi ↔ Farmer Orders ──────────────────────────────────────────────────
class MandiFarmerOrderCreate(BaseModel):
    src_lat: Optional[float] = None
    src_long: Optional[float] = None
    dest_lat: Optional[float] = None
    dest_long: Optional[float] = None
    item: Optional[str] = Field(None, max_length=100)
    start_time: Optional[datetime] = None
    price_per_kg: Optional[float] = None
    order_date: Optional[datetime] = None


class MandiFarmerOrderUpdate(BaseModel):
    src_lat: Optional[float] = None
    src_long: Optional[float] = None
    dest_lat: Optional[float] = None
    dest_long: Optional[float] = None
    item: Optional[str] = Field(None, max_length=100)
    start_time: Optional[datetime] = None
    price_per_kg: Optional[float] = None
    order_date: Optional[datetime] = None


class MandiFarmerOrderResponse(BaseModel):
    id: int
    src_lat: Optional[float]
    src_long: Optional[float]
    dest_lat: Optional[float]
    dest_long: Optional[float]
    item: Optional[str]
    start_time: Optional[datetime]
    price_per_kg: Optional[float]
    order_date: Optional[datetime]

    class Config:
        from_attributes = True


# ── Farmer Profile ──────────────────────────────────────────────────────────
class FarmerProfileUpdate(BaseModel):
    contact: Optional[str] = Field(None, max_length=20)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    language: Optional[str] = Field(None, max_length=50)


class FarmerProfileResponse(BaseModel):
    id: int
    user_id: int
    language: Optional[str]
    user: Optional[UserResponse] = None

    class Config:
        from_attributes = True


# ── Crops ────────────────────────────────────────────────────────────────────
class CropCreate(BaseModel):
    name: str = Field(..., max_length=100)
    quantity: Optional[float] = None
    planted_date: Optional[date] = None


class CropUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    quantity: Optional[float] = None
    planted_date: Optional[date] = None


class CropResponse(BaseModel):
    id: int
    farmer_id: int
    name: Optional[str]
    quantity: Optional[float]
    planted_date: Optional[date]

    class Config:
        from_attributes = True