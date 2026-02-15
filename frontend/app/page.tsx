"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Group } from "@/types";
import { Trash2, Pencil } from "lucide-react";
import { API_URL } from "@/lib/config"; // Import konfigurasi URL

export default function Home() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [name, setName] = useState("");

  const fetchGroups = async () => {
    try {
      const res = await fetch(`${API_URL}/groups/`);
      if (res.ok) setGroups(await res.json());
    } catch (e) {
      console.error("Backend mati/error");
    }
  };

  useEffect(() => { fetchGroups(); }, []);

  const createGroup = async () => {
    if(!name) return;
    try {
      // UPDATED: Pakai API_URL
      const res = await fetch(`${API_URL}/groups/`, {
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });
      if (!res.ok) throw new Error("Gagal buat grup");
      setName(""); 
      fetchGroups();
    } catch (error) {
      alert("Error: Pastikan backend jalan!");
    }
  };

  const deleteGroup = async (e: React.MouseEvent, groupId: string, groupName: string) => {
    e.preventDefault(); // Mencegah link terbuka saat tombol diklik
    if(!confirm(`Hapus Grup "${groupName}" beserta semua data di dalamnya?`)) return;
    
    // UPDATED: Pakai API_URL
    await fetch(`${API_URL}/groups/${groupId}`, { method: "DELETE" });
    fetchGroups();
  };

  const editGroup = async (e: React.MouseEvent, groupId: string, oldName: string) => {
    e.preventDefault(); 
    const newName = prompt("Nama Baru Grup:", oldName);
    if(newName && newName !== oldName) {
        // UPDATED: Pakai API_URL
        await fetch(`${API_URL}/groups/${groupId}`, {
            method: "PUT", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: newName })
        });
        fetchGroups();
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center text-blue-500">Debt Tracker Anak Kos</h1>
        
        {/* Input Buat Grup */}
        <div className="flex gap-2 mb-8 bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-700">
          <input 
            value={name} 
            onChange={e=>setName(e.target.value)} 
            className="flex-1 bg-gray-700 border border-gray-600 p-3 rounded text-white focus:outline-none focus:border-blue-500" 
            placeholder="Nama Grup Baru (misal: Kos Melati)" 
          />
          <button onClick={createGroup} className="bg-blue-600 text-white px-6 rounded hover:bg-blue-700 transition font-bold">
            Buat
          </button>
        </div>

        {/* List Grup */}
        <div className="space-y-3">
          {groups.map(g => (
            <Link key={g.id} href={`/groups/${g.id}`} className="group block bg-gray-800 border border-gray-700 p-5 rounded-lg hover:bg-gray-750 hover:border-blue-500 transition shadow-md flex justify-between items-center">
              <span className="font-semibold text-lg">{g.name}</span>
              
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                 {/* Tombol Edit */}
                 <button 
                    onClick={(e) => editGroup(e, g.id, g.name)}
                    className="p-2 text-gray-400 hover:text-blue-400 hover:bg-gray-700 rounded-full transition"
                    title="Edit Nama"
                 >
                    <Pencil size={18} />
                 </button>

                 {/* Tombol Hapus */}
                 <button 
                    onClick={(e) => deleteGroup(e, g.id, g.name)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-700 rounded-full transition"
                    title="Hapus Grup"
                 >
                    <Trash2 size={18} />
                 </button>
              </div>
            </Link>
          ))}
          
          {groups.length === 0 && (
            <div className="text-center text-gray-500 py-10">
              Belum ada grup. Buat satu di atas!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}