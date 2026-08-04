import { defineConfig } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Minimal config - plugins temporarily disabled due to npm installation issues
export default defineConfig({
  plugins: [],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 900,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "react-vendor",
              test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 30,
            },
            {
              name: "ui-vendor",
              test: /node_modules[\\/](@radix-ui|class-variance-authority|clsx|tailwind-merge|lucide-react|framer-motion|vaul|cmdk|input-otp|react-day-picker|embla-carousel-react|react-resizable-panels|next-themes)[\\/]/,
              priority: 20,
            },
            {
              name: "data-vendor",
              test: /node_modules[\\/](@tanstack|wouter|date-fns)[\\/]/,
              priority: 20,
            },
            {
              name: "form-vendor",
              test: /node_modules[\\/](react-hook-form|@hookform|zod|zod-validation-error)[\\/]/,
              priority: 20,
            },
            {
              name: "charts-vendor",
              test: /node_modules[\\/](recharts|victory-vendor|d3-|d3|decimal.js-light)[\\/]/,
              priority: 20,
            },
            {
              name: "zxcvbn",
              test: /node_modules[\\/]zxcvbn[\\/]/,
              priority: 20,
            },
          ],
        },
      },
    },
  },
  // Add esbuild config to handle JSX without plugin
  esbuild: {
    jsx: "automatic",
  },
});
