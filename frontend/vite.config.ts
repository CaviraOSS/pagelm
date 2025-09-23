import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, ".."), "VITE_");
  return {
    plugins: [react()],
    server: {
      host: env.VITE_FRONTEND_HOST || "localhost",
      port: Number(env.VITE_FRONTEND_PORT) || 5173,
    },
    preview: {
      host: env.VITE_FRONTEND_HOST || "localhost",
      port: Number(env.VITE_FRONTEND_PORT) || 4173,
    },
    envDir: path.resolve(__dirname, ".."),
  };
});
