from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class CaseLinkedRecord(Base):
    __abstract__ = True
    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    case_id: Mapped[str] = mapped_column(ForeignKey("cases.id"), index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    attributes: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)


class CdrRecord(CaseLinkedRecord):
    __tablename__ = "cdr_records"
    caller: Mapped[str] = mapped_column(String(128), nullable=False)
    callee: Mapped[str] = mapped_column(String(128), nullable=False)
    duration_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    case = relationship("Case", back_populates="cdr_records")


class IpdrRecord(CaseLinkedRecord):
    __tablename__ = "ipdr_records"
    source_ip: Mapped[str] = mapped_column(String(128), nullable=False)
    destination_ip: Mapped[str] = mapped_column(String(128), nullable=False)
    protocol: Mapped[str] = mapped_column(String(32), nullable=False)
    case = relationship("Case", back_populates="ipdr_records")


class BankingRecord(CaseLinkedRecord):
    __tablename__ = "banking_records"
    sender: Mapped[str] = mapped_column(String(128), nullable=False)
    recipient: Mapped[str] = mapped_column(String(128), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False)
    channel: Mapped[str] = mapped_column(String(32), nullable=False)
    case = relationship("Case", back_populates="banking_records")


class SocialRecord(CaseLinkedRecord):
    __tablename__ = "social_records"
    actor: Mapped[str] = mapped_column(String(128), nullable=False)
    target: Mapped[str] = mapped_column(String(128), nullable=False)
    platform: Mapped[str] = mapped_column(String(64), nullable=False)
    interaction: Mapped[str] = mapped_column(String(64), nullable=False)
    case = relationship("Case", back_populates="social_records")


class IdentityRecord(CaseLinkedRecord):
    __tablename__ = "identity_records"
    subject: Mapped[str] = mapped_column(String(128), nullable=False)
    document_type: Mapped[str] = mapped_column(String(64), nullable=False)
    document_hash: Mapped[str] = mapped_column(String(256), nullable=False)
    case = relationship("Case", back_populates="identity_records")


class EvidenceRecordRow(Base):
    __tablename__ = "evidence_records"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    case_id: Mapped[str] = mapped_column(ForeignKey("cases.id"), index=True)
    source: Mapped[str] = mapped_column(String(32), nullable=False)
    source_record_id: Mapped[str] = mapped_column(String(128), nullable=False)
    rule: Mapped[str] = mapped_column(String(128), nullable=False)
    transformation: Mapped[str] = mapped_column(String(128), nullable=False)
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    fields: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    case = relationship("Case", back_populates="evidence_records")
