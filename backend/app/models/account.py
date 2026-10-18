"""Login identities for hosts and admins.

Customers stay in `users`. Hosts live in `hosts`. Admins live in `admins`.
The same email may exist in more than one table because each app signs in
against only its own table.
"""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.orm import relationship
from app.core.database import Base


class AccountRole:
    """Stand-in for a UserRole row so require_role() works on host and admin accounts."""

    def __init__(self, role):
        self.role = role


def _now():
    return datetime.now(timezone.utc)


class Host(Base):
    __tablename__ = "hosts"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    phone_number = Column(String(50), nullable=True)
    profile_photo_url = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    phone_verified = Column(Boolean, default=False)
    email_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)

    # host_profiles.user_id stores this id (column name kept so listing queries stay valid)
    host_profile = relationship(
        "HostProfile",
        back_populates="host_account",
        uselist=False,
        cascade="all, delete-orphan",
        foreign_keys="HostProfile.user_id",
        primaryjoin="Host.id==HostProfile.user_id",
    )

    @property
    def roles(self):
        from app.models.user import UserRoleEnum
        return [AccountRole(UserRoleEnum.HOST)]


class Admin(Base):
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    phone_number = Column(String(50), nullable=True)
    profile_photo_url = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    phone_verified = Column(Boolean, default=False)
    email_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)

    @property
    def roles(self):
        from app.models.user import UserRoleEnum
        return [AccountRole(UserRoleEnum.ADMIN)]

    @property
    def host_profile(self):
        return None
