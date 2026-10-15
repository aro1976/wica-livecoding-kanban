import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // amazon-cognito-identity-js depende do pacote "buffer" (Node.js), que
  // referencia a global "global". No browser essa global não existe, então
  // mapeamos para "globalThis". Precisa ser declarado tanto para o build
  // normal (define) quanto para o pre-bundle de dependências do esbuild
  // (optimizeDeps.esbuildOptions.define), que não herda o define acima.
  define: {
    global: "globalThis",
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
