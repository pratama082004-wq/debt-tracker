"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Group, Transaction } from "@/types";
import { Check, X, ArrowLeft, User, Trash2, Pencil } from "lucide-react";
import Link from "next/link";
import { API_URL, WS_URL } from "@/lib/config"; // Import Konfigurasi URL

export default function GroupDetail() {
  const { id } = useParams();
  const [group, setGroup] = useState<Group | null>(null);
  const [txs, setTxs] = useState<Transaction[]>([]);
  
  // State Input Baru
  const [newMem, setNewMem] = useState("");
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [payer, setPayer] = useState("");

  // State untuk EDIT TRANSAKSI (Modal)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editPayer, setEditPayer] = useState("");

  const refresh = async () => {
    try {
      // UPDATED: Gunakan API_URL
      const gRes = await fetch(`${API_URL}/groups/${id}`);
      if(gRes.ok) setGroup(await gRes.json());
      const tRes = await fetch(`${API_URL}/groups/${id}/transactions/`);
      if(tRes.ok) setTxs(await tRes.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    refresh();
    // UPDATED: Gunakan WS_URL
    const ws = new WebSocket(`${WS_URL}/ws/${id}`);
    ws.onmessage = () => refresh();
    return () => ws.close();
  }, [id]);

  // --- ACTIONS ---

  const addMember = async () => {
    if (!newMem) return;
    // UPDATED: Gunakan API_URL
    await fetch(`${API_URL}/groups/${id}/members/`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newMem })
    });
    setNewMem(""); refresh();
  };

  const deleteMember = async (memberId: string, memberName: string) => {
    if(!confirm(`Hapus anggota "${memberName}"?`)) return;
    // UPDATED: Gunakan API_URL
    await fetch(`${API_URL}/members/${memberId}`, { method: "DELETE" });
  };

  const editMember = async (memberId: string, oldName: string) => {
    const newName = prompt("Ganti nama anggota:", oldName);
    if(newName && newName !== oldName) {
        // UPDATED: Gunakan API_URL
        await fetch(`${API_URL}/members/${memberId}`, {
            method: "PUT", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: newName })
        });
    }
  };

  const addTx = async () => {
    if (!payer || !amount || !desc) return;
    // UPDATED: Gunakan API_URL
    await fetch(`${API_URL}/groups/${id}/transactions/`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payer_id: payer, description: desc, amount: Number(amount) })
    });
    setDesc(""); setAmount("");
  };

  const deleteTx = async (txId: string) => {
    if(!confirm("Hapus transaksi ini?")) return;
    // UPDATED: Gunakan API_URL
    await fetch(`${API_URL}/transactions/${txId}`, { method: "DELETE" });
  };

  // --- NEW: LOGIC EDIT TRANSAKSI ---
  
  // 1. Buka Modal & Isi Data Lama
  const openEditModal = (t: Transaction) => {
    setEditingTx(t);
    setEditDesc(t.description);
    setEditAmount(t.amount.toString());
    setEditPayer(t.payer_id);
  };

  // 2. Simpan Perubahan
  const saveEditTx = async () => {
    if(!editingTx || !editPayer || !editAmount || !editDesc) return;
    
    // UPDATED: Gunakan API_URL
    await fetch(`${API_URL}/transactions/${editingTx.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            payer_id: editPayer, 
            description: editDesc, 
            amount: Number(editAmount) 
        })
    });
    setEditingTx(null); // Tutup modal
  };

  const togglePay = async (pid: string, status: boolean) => {
    // UPDATED: Gunakan API_URL
    await fetch(`${API_URL}/participants/${pid}/pay?is_paid=${!status}`, { method: "PUT" });
  };

  if (!group) return <div className="p-8 text-white">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto p-4 min-h-screen bg-gray-900 text-gray-100 relative">
      <Link href="/" className="flex items-center gap-2 text-gray-400 mb-4 hover:text-white transition">
        <ArrowLeft size={16}/> Back
      </Link>
      
      {/* --- Header --- */}
      <div className="bg-white p-6 rounded-lg shadow-lg mb-6 text-gray-900">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{group.name}</h1>
        <div className="flex flex-wrap gap-2 mt-4">
            {group.members.map(m => (
              <div key={m.id} className="flex items-center gap-2 bg-gray-100 pl-3 pr-2 py-1.5 rounded-full border border-gray-200 group hover:border-blue-300 transition">
                <span className="flex items-center gap-1 text-sm font-semibold text-gray-700">
                    <User size={14} /> {m.name}
                </span>
                <div className="flex items-center gap-1 ml-1 border-l pl-2 border-gray-300">
                    <button onClick={() => editMember(m.id, m.name)} className="text-gray-400 hover:text-blue-600 transition"><Pencil size={12} /></button>
                    <button onClick={() => deleteMember(m.id, m.name)} className="text-gray-400 hover:text-red-600 transition"><Trash2 size={12} /></button>
                </div>
              </div>
            ))}
        </div>
        <div className="mt-6 flex gap-2">
            <input value={newMem} onChange={e=>setNewMem(e.target.value)} placeholder="Tambah anggota..." className="border border-gray-300 bg-gray-50 p-2 rounded text-sm text-gray-900 w-full"/>
            <button onClick={addMember} className="bg-gray-900 text-white px-4 py-2 rounded text-sm hover:bg-gray-700 transition">Add</button>
        </div>
      </div>

      {/* --- Form Tambah Transaksi --- */}
      <div className="bg-white p-6 rounded-lg shadow-lg mb-6 text-gray-900">
        <h3 className="font-bold mb-4 text-xl text-gray-900">Tambah Transaksi</h3>
        <div className="grid grid-cols-2 gap-3 mb-3">
            <input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Beli apa?" className="border border-gray-300 bg-gray-50 p-3 rounded text-gray-900"/>
            <input value={amount} onChange={e=>setAmount(e.target.value)} type="number" placeholder="Harga (Rp)" className="border border-gray-300 bg-gray-50 p-3 rounded text-gray-900"/>
        </div>
        <select value={payer} onChange={e=>setPayer(e.target.value)} className="w-full border border-gray-300 bg-white p-3 rounded mb-4 text-gray-900">
            <option value="">Siapa yang bayar?</option>
            {group.members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <button onClick={addTx} className="w-full bg-blue-600 text-white font-bold p-3 rounded hover:bg-blue-700 transition shadow-md">Submit Transaksi</button>
      </div>

      {/* --- List Transaksi --- */}
      <div className="space-y-4">
        {txs.map(t => {
            const totalOrang = t.participants.length + 1;
            const perOrang = t.amount / totalOrang;

            return (
              <div key={t.id} className="relative bg-white p-5 rounded-lg shadow-md border-l-4 border-blue-500 text-gray-900 group">
                  {/* Action Buttons (Edit & Delete) */}
                  <div className="absolute top-3 right-3 flex gap-2">
                    <button onClick={() => openEditModal(t)} className="text-gray-300 hover:text-blue-500 transition p-1" title="Edit Transaksi">
                        <Pencil size={16} />
                    </button>
                    <button onClick={() => deleteTx(t.id)} className="text-gray-300 hover:text-red-500 transition p-1" title="Hapus Transaksi">
                        <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="flex justify-between items-start mb-2 pr-16">
                      <div>
                        <span className="font-bold text-lg text-gray-900 block">{t.description}</span>
                        <div className="text-sm text-gray-500 mt-1">
                          Ditalangin: <strong className="text-gray-800">{t.payer_name}</strong>
                        </div>
                        <div className="text-xs font-semibold text-blue-600 bg-blue-50 inline-block px-2 py-1 rounded mt-2">
                           Patungan: Rp {perOrang.toLocaleString('id-ID', {maximumFractionDigits: 0})} / orang
                        </div>
                      </div>
                      <span className="font-bold text-gray-900 text-xl">Rp {t.amount.toLocaleString('id-ID')}</span>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-400 mb-2 uppercase font-semibold tracking-wider">Status Pembayaran:</p>
                    <div className="flex flex-wrap gap-2">
                        {t.participants.map(p => (
                            <button key={p.id} onClick={()=>togglePay(p.id, p.is_paid)} 
                                className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border transition-all duration-200 font-medium
                                ${p.is_paid ? 'bg-green-100 border-green-200 text-green-700 hover:bg-green-200' : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100 hover:border-red-300'}`}>
                                <div className="flex flex-col items-start">
                                  <span>{p.member_name}</span>
                                  <span className="text-[10px] opacity-80">Rp {perOrang.toLocaleString('id-ID', {maximumFractionDigits: 0})}</span>
                                </div>
                                {p.is_paid ? <Check size={16} strokeWidth={3}/> : <X size={16} strokeWidth={3}/>}
                            </button>
                        ))}
                    </div>
                  </div>
              </div>
            );
        })}
      </div>

      {/* --- MODAL EDIT TRANSAKSI --- */}
      {editingTx && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Pencil size={20} className="text-blue-600"/> Edit Transaksi
                </h3>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                        <input value={editDesc} onChange={e=>setEditDesc(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nominal (Rp)</label>
                        <input type="number" value={editAmount} onChange={e=>setEditAmount(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Siapa yang nalangin?</label>
                        <select value={editPayer} onChange={e=>setEditPayer(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 bg-white">
                            {group.members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                    </div>
                    
                    <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg text-xs text-yellow-800">
                        Warning: Mengedit transaksi akan <strong>mereset status pembayaran</strong> semua orang menjadi "Belum Lunas".
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button onClick={() => setEditingTx(null)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium">Batal</button>
                        <button onClick={saveEditTx} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-md">Simpan</button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}