import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const SEC_UA =
  'FinancialResearchAssistant/1.0 (Educational demo; contact: dev@localhost) Mozilla/5.0 compatible'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/anthropic': {
        target: 'https://api.anthropic.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/anthropic/, ''),
      },
      '/api/ninjas': {
        target: 'https://api.api-ninjas.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/ninjas/, ''),
      },
      '/api/yahoo2': {
        target: 'https://query2.finance.yahoo.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/yahoo2/, ''),
        headers: { 'User-Agent': SEC_UA },
      },
      '/api/yahoo': {
        target: 'https://query1.finance.yahoo.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/yahoo/, ''),
        headers: { 'User-Agent': SEC_UA },
      },
      '/api/sec-data': {
        target: 'https://data.sec.gov',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/sec-data/, ''),
        headers: { 'User-Agent': SEC_UA },
      },
      '/api/sec': {
        target: 'https://www.sec.gov',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/sec/, ''),
        headers: { 'User-Agent': SEC_UA },
      },
    },
  },
  preview: {
    proxy: {
      '/api/anthropic': {
        target: 'https://api.anthropic.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/anthropic/, ''),
      },
      '/api/ninjas': {
        target: 'https://api.api-ninjas.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/ninjas/, ''),
      },
      '/api/yahoo2': {
        target: 'https://query2.finance.yahoo.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/yahoo2/, ''),
        headers: { 'User-Agent': SEC_UA },
      },
      '/api/yahoo': {
        target: 'https://query1.finance.yahoo.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/yahoo/, ''),
        headers: { 'User-Agent': SEC_UA },
      },
      '/api/sec-data': {
        target: 'https://data.sec.gov',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/sec-data/, ''),
        headers: { 'User-Agent': SEC_UA },
      },
      '/api/sec': {
        target: 'https://www.sec.gov',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/sec/, ''),
        headers: { 'User-Agent': SEC_UA },
      },
    },
  },
})
