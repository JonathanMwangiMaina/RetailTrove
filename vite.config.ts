import { defineConfig } from "vite";
import path from "path";

// Minimal config - plugins temporarily disabled due to npm installation issues
export default defineConfig({
  plugins: [],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  // Add esbuild config to handle JSX without plugin
  esbuild: {
    jsx: 'automatic',
  },
});
