export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
// Logika WS: Jika API https, maka WS wss. Jika http, maka ws.
export const WS_URL = process.env.NEXT_PUBLIC_API_URL 
  ? process.env.NEXT_PUBLIC_API_URL.replace('https://', 'wss://').replace('http://', 'ws://') 
  : "ws://localhost:8000";