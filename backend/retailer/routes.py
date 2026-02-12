from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import Retailer, RetailerItem, RetailerMandiOrder, User
from schemas import (
    RetailerProfileUpdate, RetailerProfileResponse,
    RetailerItemCreate, RetailerItemUpdate, RetailerItemResponse,
    RetailerMandiOrderCreate, RetailerMandiOrderUpdate, RetailerMandiOrderResponse,
)
from auth import get_current_user, require_role

router = APIRouter(prefix="/api/retailer", tags=["Retailer"])


# ── Helper ──────────────────────────────────────────────────────────────────
def _get_retailer_profile(user: User, db: Session) -> Retailer:
    """Return the Retailer row for the authenticated user, or 404."""
    retailer = db.query(Retailer).filter(Retailer.user_id == user.id).first()
    if not retailer:
        raise HTTPException(status_code=404, detail="Retailer profile not found")
    return retailer


# ═════════════════════════════════════════════════════════════════════════════
#  PROFILE
# ═════════════════════════════════════════════════════════════════════════════

@router.get("/profile", response_model=RetailerProfileResponse)
def get_profile(
    current_user: User = Depends(require_role("retailer")),
    db: Session = Depends(get_db),
):
    """Get the logged-in retailer's profile."""
    retailer = _get_retailer_profile(current_user, db)
    return retailer


@router.put("/profile", response_model=RetailerProfileResponse)
def update_profile(
    payload: RetailerProfileUpdate,
    current_user: User = Depends(require_role("retailer")),
    db: Session = Depends(get_db),
):
    """Update the retailer's profile (contact, location, language)."""
    retailer = _get_retailer_profile(current_user, db)

    # Update user-level fields
    if payload.contact is not None:
        current_user.contact = payload.contact
    if payload.latitude is not None:
        current_user.latitude = payload.latitude
    if payload.longitude is not None:
        current_user.longitude = payload.longitude

    # Update retailer-level fields
    if payload.language is not None:
        retailer.language = payload.language

    db.commit()
    db.refresh(retailer)
    return retailer


# ═════════════════════════════════════════════════════════════════════════════
#  RETAILER ITEMS  (CRUD)
# ═════════════════════════════════════════════════════════════════════════════

@router.get("/items", response_model=List[RetailerItemResponse])
def list_items(
    current_user: User = Depends(require_role("retailer")),
    db: Session = Depends(get_db),
):
    """List all items belonging to the logged-in retailer."""
    retailer = _get_retailer_profile(current_user, db)
    return db.query(RetailerItem).filter(RetailerItem.retailer_id == retailer.id).all()


@router.post("/items", response_model=RetailerItemResponse, status_code=status.HTTP_201_CREATED)
def create_item(
    payload: RetailerItemCreate,
    current_user: User = Depends(require_role("retailer")),
    db: Session = Depends(get_db),
):
    """Add a new item to the retailer's inventory."""
    retailer = _get_retailer_profile(current_user, db)
    item = RetailerItem(
        retailer_id=retailer.id,
        name=payload.name,
        item=payload.item,
        quantity=payload.quantity,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/items/{item_id}", response_model=RetailerItemResponse)
def get_item(
    item_id: int,
    current_user: User = Depends(require_role("retailer")),
    db: Session = Depends(get_db),
):
    """Get a single retailer item by ID."""
    retailer = _get_retailer_profile(current_user, db)
    item = db.query(RetailerItem).filter(
        RetailerItem.id == item_id, RetailerItem.retailer_id == retailer.id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


@router.put("/items/{item_id}", response_model=RetailerItemResponse)
def update_item(
    item_id: int,
    payload: RetailerItemUpdate,
    current_user: User = Depends(require_role("retailer")),
    db: Session = Depends(get_db),
):
    """Update an existing retailer item."""
    retailer = _get_retailer_profile(current_user, db)
    item = db.query(RetailerItem).filter(
        RetailerItem.id == item_id, RetailerItem.retailer_id == retailer.id
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
    current_user: User = Depends(require_role("retailer")),
    db: Session = Depends(get_db),
):
    """Delete a retailer item."""
    retailer = _get_retailer_profile(current_user, db)
    item = db.query(RetailerItem).filter(
        RetailerItem.id == item_id, RetailerItem.retailer_id == retailer.id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    db.delete(item)
    db.commit()


# ═════════════════════════════════════════════════════════════════════════════
#  RETAILER ↔ MANDI ORDERS  (CRUD)
# ═════════════════════════════════════════════════════════════════════════════

@router.get("/orders", response_model=List[RetailerMandiOrderResponse])
def list_orders(
    current_user: User = Depends(require_role("retailer")),
    db: Session = Depends(get_db),
):
    """List all retailer-mandi orders."""
    return db.query(RetailerMandiOrder).all()


@router.post("/orders", response_model=RetailerMandiOrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(
    payload: RetailerMandiOrderCreate,
    current_user: User = Depends(require_role("retailer")),
    db: Session = Depends(get_db),
):
    """Create a new retailer-mandi order."""
    order = RetailerMandiOrder(**payload.model_dump())
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


@router.get("/orders/{order_id}", response_model=RetailerMandiOrderResponse)
def get_order(
    order_id: int,
    current_user: User = Depends(require_role("retailer")),
    db: Session = Depends(get_db),
):
    """Get a single order by ID."""
    order = db.query(RetailerMandiOrder).filter(RetailerMandiOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.put("/orders/{order_id}", response_model=RetailerMandiOrderResponse)
def update_order(
    order_id: int,
    payload: RetailerMandiOrderUpdate,
    current_user: User = Depends(require_role("retailer")),
    db: Session = Depends(get_db),
):
    """Update an existing order."""
    order = db.query(RetailerMandiOrder).filter(RetailerMandiOrder.id == order_id).first()
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
    current_user: User = Depends(require_role("retailer")),
    db: Session = Depends(get_db),
):
    """Delete an order."""
    order = db.query(RetailerMandiOrder).filter(RetailerMandiOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    db.delete(order)
    db.commit()
