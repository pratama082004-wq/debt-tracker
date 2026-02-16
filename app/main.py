from fastapi import FastAPI, Depends, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from . import models, database
from sqlalchemy import delete

# --- Schemas ---
class MemberCreate(BaseModel):
    name: str

class MemberUpdate(BaseModel):
    name: str 

class MemberOut(BaseModel):
    id: UUID
    name: str
    class Config:
        from_attributes = True

class ParticipantOut(BaseModel):
    id: UUID
    member_id: UUID
    member_name: Optional[str] = None
    is_paid: bool
    class Config:
        from_attributes = True

class TransactionCreate(BaseModel):
    payer_id: UUID
    description: str
    amount: float

class TransactionUpdate(BaseModel):
    payer_id: UUID
    description: str
    amount: float

class TransactionOut(BaseModel):
    id: UUID
    payer_id: UUID
    payer_name: Optional[str] = None
    description: str
    amount: float
    date: datetime
    participants: List[ParticipantOut] = []
    class Config:
        from_attributes = True

class GroupCreate(BaseModel):
    name: str

class GroupUpdate(BaseModel):
    name: str

class GroupOut(BaseModel):
    id: UUID
    name: str
    members: List[MemberOut] = []
    class Config:
        from_attributes = True

# --- Manager WebSocket ---
class ConnectionManager:
    def __init__(self):
        self.active_connections = {}

    async def connect(self, ws: WebSocket, group_id: str):
        await ws.accept()
        if group_id not in self.active_connections:
            self.active_connections[group_id] = []
        self.active_connections[group_id].append(ws)

    def disconnect(self, ws: WebSocket, group_id: str):
        if group_id in self.active_connections:
            if ws in self.active_connections[group_id]:
                self.active_connections[group_id].remove(ws)

    async def broadcast(self, group_id: str):
        if group_id in self.active_connections:
            for c in self.active_connections[group_id]:
                try:
                    await c.send_text("update")
                except:
                    pass

manager = ConnectionManager()
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI()

# --- CORS & HEALTH CHECK (PENTING BUAT RAILWAY & VERCEL) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "Backend is running!", "message": "Hello from Railway"}
# -----------------------------------------------------------

# --- Helper Broadcast ---
async def broadcast_group(group_id):
    await manager.broadcast(str(group_id))

# --- GROUP ENDPOINTS ---
@app.post("/groups/", response_model=GroupOut)
def create_group(group: GroupCreate, db: Session = Depends(database.get_db)):
    db_group = models.Group(name=group.name)
    db.add(db_group)
    db.commit()
    db.refresh(db_group)
    return db_group

@app.get("/groups/", response_model=List[GroupOut])
def get_groups(db: Session = Depends(database.get_db)):
    return db.query(models.Group).order_by(models.Group.created_at.desc()).all()

@app.get("/groups/{group_id}", response_model=GroupOut)
def get_group(group_id: UUID, db: Session = Depends(database.get_db)):
    return db.query(models.Group).options(joinedload(models.Group.members)).filter(models.Group.id == group_id).first()

@app.put("/groups/{group_id}")
def update_group(group_id: UUID, group: GroupUpdate, db: Session = Depends(database.get_db)):
    db_group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not db_group: raise HTTPException(404, "Group not found")
    db_group.name = group.name
    db.commit()
    return {"status": "ok"}

@app.delete("/groups/{group_id}")
def delete_group(group_id: UUID, db: Session = Depends(database.get_db)):
    db_group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not db_group: raise HTTPException(404, "Group not found")
    
    # 1. Hapus Partisipan & Transaksi terkait
    txs = db.query(models.Transaction).filter(models.Transaction.group_id == group_id).all()
    for tx in txs:
        db.query(models.TransactionParticipant).filter(models.TransactionParticipant.transaction_id == tx.id).delete()
        db.delete(tx)
    
    # 2. Hapus Member
    db.query(models.Member).filter(models.Member.group_id == group_id).delete()
    
    # 3. Hapus Group
    db.delete(db_group)
    db.commit()
    return {"status": "deleted"}

# --- MEMBER ENDPOINTS ---
@app.post("/groups/{group_id}/members/", response_model=MemberOut)
async def add_member(group_id: UUID, member: MemberCreate, db: Session = Depends(database.get_db)):
    db_mem = models.Member(name=member.name, group_id=group_id)
    db.add(db_mem)
    db.commit()
    db.refresh(db_mem)
    await broadcast_group(group_id)
    return db_mem

@app.put("/members/{member_id}")
async def update_member(member_id: UUID, member: MemberUpdate, db: Session = Depends(database.get_db)):
    db_mem = db.query(models.Member).filter(models.Member.id == member_id).first()
    if not db_mem: raise HTTPException(404, "Member not found")
    db_mem.name = member.name
    db.commit()
    await broadcast_group(db_mem.group_id)
    return {"status": "ok"}

@app.delete("/members/{member_id}")
async def delete_member(member_id: UUID, db: Session = Depends(database.get_db)):
    db_mem = db.query(models.Member).filter(models.Member.id == member_id).first()
    if not db_mem: raise HTTPException(404, "Member not found")
    group_id = db_mem.group_id
    db.delete(db_mem)
    db.commit()
    await broadcast_group(group_id)
    return {"status": "deleted"}

# --- TRANSACTION ENDPOINTS ---
@app.post("/groups/{group_id}/transactions/", response_model=TransactionOut)
async def add_transaction(group_id: UUID, tx: TransactionCreate, db: Session = Depends(database.get_db)):
    db_tx = models.Transaction(group_id=group_id, payer_id=tx.payer_id, description=tx.description, amount=tx.amount)
    db.add(db_tx)
    db.flush()
    
    members = db.query(models.Member).filter(models.Member.group_id == group_id).all()
    parts = [models.TransactionParticipant(transaction_id=db_tx.id, member_id=m.id) for m in members if m.id != tx.payer_id]
    db.add_all(parts)
    db.commit()
    db.refresh(db_tx)
    
    await broadcast_group(group_id)
    return db_tx

@app.delete("/transactions/{transaction_id}")
async def delete_transaction(transaction_id: UUID, db: Session = Depends(database.get_db)):
    db_tx = db.query(models.Transaction).filter(models.Transaction.id == transaction_id).first()
    if not db_tx: raise HTTPException(404, "Transaction not found")
    group_id = db_tx.group_id
    
    db.query(models.TransactionParticipant).filter(models.TransactionParticipant.transaction_id == transaction_id).delete()
    db.delete(db_tx)
    db.commit()
    await broadcast_group(group_id)
    return {"status": "deleted"}

@app.put("/transactions/{transaction_id}")
async def update_transaction(transaction_id: UUID, tx: TransactionUpdate, db: Session = Depends(database.get_db)):
    db_tx = db.query(models.Transaction).filter(models.Transaction.id == transaction_id).first()
    if not db_tx: raise HTTPException(404, "Transaction not found")
    
    db_tx.description = tx.description
    db_tx.amount = tx.amount
    db_tx.payer_id = tx.payer_id
    
    db.query(models.TransactionParticipant).filter(models.TransactionParticipant.transaction_id == transaction_id).delete()
    
    members = db.query(models.Member).filter(models.Member.group_id == db_tx.group_id).all()
    parts = [models.TransactionParticipant(transaction_id=db_tx.id, member_id=m.id) for m in members if m.id != tx.payer_id]
    
    db.add_all(parts)
    db.commit()
    
    await broadcast_group(db_tx.group_id)
    return {"status": "updated"}

@app.get("/groups/{group_id}/transactions/", response_model=List[TransactionOut])
def get_transactions(group_id: UUID, db: Session = Depends(database.get_db)):
    txs = db.query(models.Transaction).options(joinedload(models.Transaction.payer), joinedload(models.Transaction.participants).joinedload(models.TransactionParticipant.member)).filter(models.Transaction.group_id == group_id).order_by(models.Transaction.date.desc()).all()
    res = []
    for t in txs:
        tout = TransactionOut.from_orm(t)
        tout.payer_name = t.payer.name if t.payer else "Unknown"
        for p in tout.participants:
            mem = next((x.member for x in t.participants if x.id == p.id), None)
            if mem: p.member_name = mem.name
        res.append(tout)
    return res

@app.put("/participants/{pid}/pay")
async def toggle_pay(pid: UUID, is_paid: bool, db: Session = Depends(database.get_db)):
    part = db.query(models.TransactionParticipant).filter(models.TransactionParticipant.id == pid).first()
    if part:
        part.is_paid = is_paid
        db.commit()
        gid = part.transaction.group_id
        await broadcast_group(gid)
    return {"status": "ok"}

@app.websocket("/ws/{group_id}")
async def ws_endpoint(websocket: WebSocket, group_id: str):
    await manager.connect(websocket, group_id)
    try: 
        while True:
            await websocket.receive_text()
    except:
        manager.disconnect(websocket, group_id)