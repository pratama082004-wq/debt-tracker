// frontend/lib/config.ts

// PERHATIKAN: Harus ada https:// di depan!
const API_URL = "https://debt-tracker-production-3466.up.railway.app"; 

export const WS_URL = API_URL.replace(/^http/, "ws");
export default API_URL;