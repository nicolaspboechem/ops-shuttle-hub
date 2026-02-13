import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@tanstack/react-query', 'react-router-dom'],
  },
  build: {
    // CRITICAL: Disable modulepreload polyfill
    // The default polyfill eagerly fetches ALL lazy chunks on page load.
    // On 4G this saturates the connection and blocks rendering.
    // With this disabled, lazy chunks are only fetched when navigated to.
    modulePreload: false,
    // Enable source maps for production debugging
    sourcemap: mode === 'development',
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          'vendor-core': [
            'react', 'react-dom', 'react-router-dom',
            '@tanstack/react-query',
            'clsx', 'tailwind-merge', 'zod', 'date-fns',
          ],
          'vendor-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-popover',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-tooltip',
            'framer-motion',
          ],
          'vendor-services': [
            '@supabase/supabase-js',
            'recharts',
          ],
        },
      },
    },
    // Minification options
    minify: 'esbuild',
    target: 'es2020',
  },
  // Faster dev server
  esbuild: {
    target: 'es2020',
  },
}));
