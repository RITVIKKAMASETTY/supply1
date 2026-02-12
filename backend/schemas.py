from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime

class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=100)
    password: str = Field(..., min_length=6)
    role: str = Field(..., pattern="^(farmer|mandi_owner|retailer|admin)$")
    contact: Optional[str] = Field(None, max_length=20)
    location: Optional[str] = Field(None, max_length=150)
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
    location: Optional[str]
    
    class Config:
        from_attributes = True