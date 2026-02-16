// frontend/lib/config.ts

// Pakai link Railway yang baru ini:
const RAW_URL = process.env.NEXT_PUBLIC_API_URL || "https://debt-tracker-production-3466.up.railway.app";

export const API_URL = RAW_URL.replace(/\/$/, "");
export const WS_URL = API_URL.replace(/^http/, "ws");

export default API_URL;