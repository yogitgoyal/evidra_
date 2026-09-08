from datetime import datetime

from sqlalchemy import DateTime, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class Case(Base):
    __tablename__ = "cases"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="active", nullable=False)
    priority: Mapped[str] = mapped_column(String(16), default="medium", nullable=False)
    lead: Mapped[str] = mapped_column(String(255), default="Unassigned", nullable=False)
    tags: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    cdr_records = relationship("CdrRecord", back_populates="case")
    ipdr_records = relationship("IpdrRecord", back_populates="case")
    banking_records = relationship("BankingRecord", back_populates="case")
    social_records = relationship("SocialRecord", back_populates="case")
    identity_records = relationship("IdentityRecord", back_populates="case")
    evidence_records = relationship("EvidenceRecordRow", back_populates="case")
    audit_logs = relationship("AuditLogEntry", back_populates="case")
