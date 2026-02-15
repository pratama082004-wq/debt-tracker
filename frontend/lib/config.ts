// frontend/lib/config.ts

// 1. Ambil URL dari Environment Variable atau pakai default Koyeb
const RAW_URL = process.env.NEXT_PUBLIC_API_URL || "https://past-crystie-srimaja-a21b3945.koyeb.app";

// 2. Pastikan tidak ada garis miring (slash) di belakang
export const API_URL = RAW_URL.replace(/\/$/, "");

// 3. Buat URL WebSocket otomatis (http jadi ws, https jadi wss)
export const WS_URL = API_URL.replace(/^http/, "ws");

// 4. Export default juga biar aman kalau ada file yang minta default
export default API_URL;