from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import MandiOwner, MandiItem, MandiFarmerOrder, User
from schemas import (
    MandiOwnerProfileUpdate, MandiOwnerProfileResponse,
    MandiItemCreate, MandiItemUpdate, MandiItemResponse,
    MandiFarmerOrderCreate, MandiFarmerOrderUpdate, MandiFarmerOrderResponse,
)
from auth import get_current_user, require_role

router = APIRouter(prefix="/api/mandi", tags=["Mandi"])


# ── Helper ──────────────────────────────────────────────────────────────────
def _get_mandi_profile(user: User, db: Session) -> MandiOwner:
    """Return the MandiOwner row for the authenticated user, or 404."""
    mandi = db.query(MandiOwner).filter(MandiOwner.user_id == user.id).first()
    if not mandi:
        raise HTTPException(status_code=404, detail="Mandi owner profile not found")
    return mandi


# ═════════════════════════════════════════════════════════════════════════════
#  PROFILE
# ═════════════════════════════════════════════════════════════════════════════

@router.get("/profile", response_model=MandiOwnerProfileResponse)
def get_profile(
    current_user: User = Depends(require_role("mandi_owner")),
    db: Session = Depends(get_db),
):
    """Get the logged-in mandi owner's profile."""
    mandi = _get_mandi_profile(current_user, db)
    return mandi


@router.put("/profile", response_model=MandiOwnerProfileResponse)
def update_profile(
    payload: MandiOwnerProfileUpdate,
    current_user: User = Depends(require_role("mandi_owner")),
    db: Session = Depends(get_db),
):
    """Update the mandi owner's profile (contact, lat/lng, language)."""
    mandi = _get_mandi_profile(current_user, db)

    if payload.contact is not None:
        current_user.contact = payload.contact
    if payload.latitude is not None:
        current_user.latitude = payload.latitude
    if payload.longitude is not None:
        current_user.longitude = payload.longitude
    if payload.language is not None:
        mandi.language = payload.language

    db.commit()
    db.refresh(mandi)
    return mandi


# ═════════════════════════════════════════════════════════════════════════════
#  MANDI ITEMS  (CRUD)
# ═════════════════════════════════════════════════════════════════════════════

@router.get("/items", response_model=List[MandiItemResponse])
def list_items(
    current_user: User = Depends(require_role("mandi_owner")),
    db: Session = Depends(get_db),
):
    """List all items belonging to the logged-in mandi owner."""
    mandi = _get_mandi_profile(current_user, db)
    return db.query(MandiItem).filter(MandiItem.mandi_owner_id == mandi.id).all()


@router.post("/items", response_model=MandiItemResponse, status_code=status.HTTP_201_CREATED)
def create_item(
    payload: MandiItemCreate,
    current_user: User = Depends(require_role("mandi_owner")),
    db: Session = Depends(get_db),
):
    """Add a new item to the mandi's inventory."""
    mandi = _get_mandi_profile(current_user, db)
    item = MandiItem(
        mandi_owner_id=mandi.id,
        item_name=payload.item_name,
        current_qty=payload.current_qty,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/items/{item_id}", response_model=MandiItemResponse)
def get_item(
    item_id: int,
    current_user: User = Depends(require_role("mandi_owner")),
    db: Session = Depends(get_db),
):
    """Get a single mandi item by ID."""
    mandi = _get_mandi_profile(current_user, db)
    item = db.query(MandiItem).filter(
        MandiItem.id == item_id, MandiItem.mandi_owner_id == mandi.id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


@router.put("/items/{item_id}", response_model=MandiItemResponse)
def update_item(
    item_id: int,
    payload: MandiItemUpdate,
    current_user: User = Depends(require_role("mandi_owner")),
    db: Session = Depends(get_db),
):
    """Update an existing mandi item."""
    mandi = _get_mandi_profile(current_user, db)
    item = db.query(MandiItem).filter(
        MandiItem.id == item_id, MandiItem.mandi_owner_id == mandi.id
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
    current_user: User = Depends(require_role("mandi_owner")),
    db: Session = Depends(get_db),
):
    """Delete a mandi item."""
    mandi = _get_mandi_profile(current_user, db)
    item = db.query(MandiItem).filter(
        MandiItem.id == item_id, MandiItem.mandi_owner_id == mandi.id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    db.delete(item)
    db.commit()


# ═════════════════════════════════════════════════════════════════════════════
#  MANDI ↔ FARMER ORDERS  (CRUD)
# ═════════════════════════════════════════════════════════════════════════════

@router.get("/orders", response_model=List[MandiFarmerOrderResponse])
def list_orders(
    current_user: User = Depends(require_role("mandi_owner")),
    db: Session = Depends(get_db),
):
    """List all mandi-farmer orders."""
    return db.query(MandiFarmerOrder).all()


@router.post("/orders", response_model=MandiFarmerOrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(
    payload: MandiFarmerOrderCreate,
    current_user: User = Depends(require_role("mandi_owner")),
    db: Session = Depends(get_db),
):
    """Create a new mandi-farmer order."""
    order = MandiFarmerOrder(**payload.model_dump())
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


@router.get("/orders/{order_id}", response_model=MandiFarmerOrderResponse)
def get_order(
    order_id: int,
    current_user: User = Depends(require_role("mandi_owner")),
    db: Session = Depends(get_db),
):
    """Get a single order by ID."""
    order = db.query(MandiFarmerOrder).filter(MandiFarmerOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.put("/orders/{order_id}", response_model=MandiFarmerOrderResponse)
def update_order(
    order_id: int,
    payload: MandiFarmerOrderUpdate,
    current_user: User = Depends(require_role("mandi_owner")),
    db: Session = Depends(get_db),
):
    """Update an existing mandi-farmer order."""
    order = db.query(MandiFarmerOrder).filter(MandiFarmerOrder.id == order_id).first()
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
    current_user: User = Depends(require_role("mandi_owner")),
    db: Session = Depends(get_db),
):
    """Delete a mandi-farmer order."""
    order = db.query(MandiFarmerOrder).filter(MandiFarmerOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    db.delete(order)
    db.commit()
