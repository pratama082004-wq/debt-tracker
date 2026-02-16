import uuid
from sqlalchemy import Column, String, Boolean, ForeignKey, DateTime, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class Group(Base):
    __tablename__ = "groups"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    members = relationship("Member", back_populates="group")
    transactions = relationship("Transaction", back_populates="group")

class Member(Base):
    __tablename__ = "members"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String)
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id"))
    group = relationship("Group", back_populates="members")
    transactions_paid = relationship("Transaction", back_populates="payer")
    debts = relationship("TransactionParticipant", back_populates="member")

class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id"))
    payer_id = Column(UUID(as_uuid=True), ForeignKey("members.id"))
    description = Column(String)
    amount = Column(Float)
    date = Column(DateTime(timezone=True), server_default=func.now())
    group = relationship("Group", back_populates="transactions")
    payer = relationship("Member", back_populates="transactions_paid")
    participants = relationship("TransactionParticipant", back_populates="transaction")

class TransactionParticipant(Base):
    __tablename__ = "transaction_participants"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    transaction_id = Column(UUID(as_uuid=True), ForeignKey("transactions.id"))
    member_id = Column(UUID(as_uuid=True), ForeignKey("members.id"))
    is_paid = Column(Boolean, default=False)
    transaction = relationship("Transaction", back_populates="participants")
    member = relationship("Member", back_populates="debts")