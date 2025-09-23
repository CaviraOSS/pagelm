export const env = {
  backend: import.meta.env.VITE_BACKEND_URL || "http://localhost:5000",
  timeout: Number(import.meta.env.VITE_TIMEOUT || 90000),
}