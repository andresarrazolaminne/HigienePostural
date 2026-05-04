import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Rutas relativas: necesario para Tauri y para Capacitor (file/capacitor)
  base: "./",
})
