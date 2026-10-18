from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import decode_token
from app.models.user import User, UserRoleEnum
from app.models.account import Host, Admin

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

PORTAL_MODELS = {
    "customer": User,
    "host": Host,
    "admin": Admin,
}


def account_kind(account) -> str:
    """Which login table this account was loaded from."""
    name = type(account).__name__
    if name == "Host":
        return "host"
    if name == "Admin":
        return "admin"
    return "customer"


def portal_from_payload(payload: dict) -> str:
    portal = (payload.get("portal") or "").lower()
    if portal in PORTAL_MODELS:
        return portal
    roles = payload.get("roles") or []
    if "ADMIN" in roles:
        return "admin"
    if "HOST" in roles:
        return "host"
    return "customer"


def load_account(db: Session, payload: dict):
    subject = payload.get("sub")
    if subject is None:
        return None
    portal = portal_from_payload(payload)
    model = PORTAL_MODELS[portal]
    return db.query(model).filter(model.id == int(subject)).first()


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_token(token)
    if payload is None or payload.get("type") not in (None, "access"):
        raise credentials_exception

    account = load_account(db, payload)
    if account is None or not account.is_active:
        raise credentials_exception

    return account

def require_role(required_role: UserRoleEnum):
    def role_checker(current_user = Depends(get_current_user)):
        user_roles = [r.role for r in current_user.roles]
        if required_role not in user_roles and UserRoleEnum.ADMIN not in user_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation requires {required_role} privilege"
            )
        return current_user
    return role_checker

oauth2_optional_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

def get_optional_current_user(token: str = Depends(oauth2_optional_scheme), db: Session = Depends(get_db)):
    if not token:
        return None
    try:
        payload = decode_token(token)
        if payload is None:
            return None
        return load_account(db, payload)
    except Exception:
        return None
