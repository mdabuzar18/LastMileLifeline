from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from backend.app.core.database import get_db
from backend.app.core.security import verify_password, create_access_token, get_current_user_payload
from backend.app.models import User, UserRole
from backend.app.schemas import UserLogin, Token, UserOut

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account is inactive."
        )
    
    token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role.value, "name": user.full_name}
    )
    return Token(access_token=token, token_type="bearer", user=user)

@router.get("/me", response_model=UserOut)
def get_current_user(payload: dict = Depends(get_current_user_payload), db: Session = Depends(get_db)):
    user_id = int(payload.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.get("/demo-accounts", response_model=List[UserOut])
def list_demo_accounts(db: Session = Depends(get_db)):
    """Returns seeded demo accounts for convenient one-click demo login."""
    return db.query(User).order_by(User.id).all()
