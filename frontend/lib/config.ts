// @ts-nocheck
/* eslint-disable */

// Kita kasih "https://" supaya tidak error kereta gandeng lagi
const API_URL = "https://debt-tracker-production-3466.up.railway.app";

// Export supaya bisa dipakai di file lain
export const WS_URL = API_URL.replace(/^http/, "ws");
export default API_URL;