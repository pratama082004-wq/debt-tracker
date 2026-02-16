// FILE: frontend/lib/config.ts
// (Isinya ALAMAT RAILWAY)

const API_URL = "https://debt-tracker-production-3466.up.railway.app";

export const WS_URL = API_URL.replace(/^http/, "ws");
export { API_URL };
export default API_URL;