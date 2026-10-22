import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    define: {
      'process.env.AWS_REGION': JSON.stringify(env.AWS_REGION || env.VITE_AWS_REGION || 'us-east-1'),
      'process.env.AWS_ACCESS_KEY_ID': JSON.stringify(env.AWS_ACCESS_KEY_ID || env.VITE_AWS_ACCESS_KEY_ID || ''),
      'process.env.AWS_SECRET_ACCESS_KEY': JSON.stringify(env.AWS_SECRET_ACCESS_KEY || env.VITE_AWS_SECRET_ACCESS_KEY || ''),
      'process.env.FROM_EMAIL': JSON.stringify(env.FROM_EMAIL || env.VITE_FROM_EMAIL || 'kumar@yectra.com'),
    },
  };
});

