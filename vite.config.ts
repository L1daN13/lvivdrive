import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Відносні шляхи — збірка працює і на https://<user>.github.io/<repo>/, і в корені домену
  base: './',
  server: {
    port: 5173,
  },
});
