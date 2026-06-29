from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.schemas.schemas import UserCreate, UserLogin, UserResponse, TokenResponse
from app.models.models import User
from app.core.auth import hash_password, verify_password, create_access_token, get_current_user
from app.utils.logging import app_logger

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse, status_code=201)
def register_user(user_in: UserCreate, db: Session = Depends(get_db)):
    # 1. Check if user already exists
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )
    
    try:
        # 2. Hash password & create user
        hashed_pw = hash_password(user_in.password)
        db_user = User(
            email=user_in.email,
            hashed_password=hashed_pw,
            name=user_in.name
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        app_logger.info(f"Registered user: {db_user.email} (ID {db_user.id})")
        return db_user
    except Exception as e:
        db.rollback()
        app_logger.error(f"Error registering user: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during registration."
        )

@router.post("/login", response_model=TokenResponse)
def login_user(credentials: UserLogin, db: Session = Depends(get_db)):
    # 1. Fetch user by email
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 2. Generate token
    access_token = create_access_token(data={"sub": user.email})
    app_logger.info(f"User login successful: {user.email}")
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=user
    )

@router.get("/me", response_model=UserResponse)
def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user
