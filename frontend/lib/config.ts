// frontend/lib/config.ts

// Kita kunci alamatnya biar tidak ada drama lagi
// Pastikan ada "https://" di depan dan TIDAK ADA garis miring "/" di belakang
const API_URL = "https://debt-tracker-production-3466.up.railway.app";

// Ini otomatis bikin link WebSocket (ws://) dari link di atas
export const WS_URL = API_URL.replace(/^http/, "ws");

// Export supaya file lain bisa baca
export default API_URL;