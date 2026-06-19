import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Docker/Lightsail: VITE_BASE=/  |  Tauri/Capacitor: VITE_BASE=./ (default en npm run build)
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE ?? "./",
})
