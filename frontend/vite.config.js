import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// /api wird lokal an das FastAPI-Backend weitergeleitet (siehe backend/README.md)
const api = { '/api': 'http://127.0.0.1:8000' }

export default defineConfig({
  plugins: [react()],
  server: { proxy: api },
  preview: { proxy: api },
})
