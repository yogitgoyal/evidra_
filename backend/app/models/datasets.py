from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, LargeBinary, Numeric, String, func
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
    original_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    original_content_type: Mapped[str | None] = mapped_column(String(128), nullable=True)
    original_file: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    case = relationship("Case", back_populates="cdr_records")


class IpdrRecord(CaseLinkedRecord):
    __tablename__ = "ipdr_records"
    batch_id: Mapped[str | None] = mapped_column(
        ForeignKey("ipdr_upload_batches.id"), nullable=True
    )
    source_ip: Mapped[str] = mapped_column(String(128), nullable=False)
    destination_ip: Mapped[str] = mapped_column(String(128), nullable=False)
    protocol: Mapped[str] = mapped_column(String(32), nullable=False)
    case = relationship("Case", back_populates="ipdr_records")


class IpdrUploadBatch(Base):
    __tablename__ = "ipdr_upload_batches"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    case_id: Mapped[str] = mapped_column(ForeignKey("cases.id"), nullable=False, index=True)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    original_content_type: Mapped[str | None] = mapped_column(String(128), nullable=True)
    original_file: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class BankingUploadBatch(Base):
    __tablename__ = "banking_upload_batches"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    case_id: Mapped[str] = mapped_column(ForeignKey("cases.id"), nullable=False, index=True)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    original_content_type: Mapped[str | None] = mapped_column(String(128), nullable=True)
    original_file: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class SocialUploadBatch(Base):
    __tablename__ = "social_upload_batches"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    case_id: Mapped[str] = mapped_column(ForeignKey("cases.id"), nullable=False, index=True)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    original_content_type: Mapped[str | None] = mapped_column(String(128), nullable=True)
    original_file: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class BankingRecord(CaseLinkedRecord):
    __tablename__ = "banking_records"
    batch_id: Mapped[str | None] = mapped_column(
        ForeignKey("banking_upload_batches.id"), nullable=True
    )
    sender: Mapped[str] = mapped_column(String(128), nullable=False)
    recipient: Mapped[str] = mapped_column(String(128), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False)
    channel: Mapped[str] = mapped_column(String(32), nullable=False)
    case = relationship("Case", back_populates="banking_records")


class SocialRecord(CaseLinkedRecord):
    __tablename__ = "social_records"
    batch_id: Mapped[str | None] = mapped_column(
        ForeignKey("social_upload_batches.id"), nullable=True
    )
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


class ReportRecord(CaseLinkedRecord):
    __tablename__ = "report_records"

    raw_text: Mapped[str] = mapped_column(String(100000), nullable=False)
    submitted_by: Mapped[str] = mapped_column(String(128), nullable=False)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    extracted_entities: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    original_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    original_content_type: Mapped[str | None] = mapped_column(String(128), nullable=True)
    original_file: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)

    case = relationship("Case", back_populates="report_records")


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
