"""Card mapping API routes (for the future dashboard)."""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from .. import db, firefly

router = APIRouter(prefix="/cards", tags=["cards"])


class CardAssignment(BaseModel):
    firefly_account_id: str
    firefly_account_name: str


@router.get("")
async def list_cards(unmapped_only: bool = False):
    """List all known card fragments. Optionally filter to unmapped."""
    cards = db.list_cards()
    if unmapped_only:
        cards = [c for c in cards if not c.get("firefly_account_id")]
    return cards


@router.get("/accounts")
async def list_accounts():
    """List all available Firefly asset accounts (for the dashboard dropdown)."""
    try:
        return await firefly.list_asset_accounts()
    except Exception as e:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Firefly unavailable: {e}")


@router.put("/{card_fragment}")
async def assign_card(card_fragment: str, assignment: CardAssignment):
    """Map a card fragment to a Firefly account."""
    success = db.set_card_account(
        card_fragment,
        assignment.firefly_account_id,
        assignment.firefly_account_name,
    )
    if not success:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Card {card_fragment} not found")
    return {"ok": True, "card": card_fragment}
