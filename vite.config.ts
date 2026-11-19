import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  // MathJax (pulled in transitively by react_typescript_editor) reads its own
  // version via a Node-only `eval("require")` fallback when this global is
  // undefined. In a browser that throws "ReferenceError: require is not
  // defined" at module-eval time, before React can render anything. Defining
  // it, as MathJax's own docs recommend for bundler setups, skips that branch.
  // https://github.com/mathjax/MathJax-src#packaging-and-building (webpack/vite define)
  define: {
    PACKAGE_VERSION: JSON.stringify("3.2.1"),
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
  server: {
    port: 5173,
    open: true,
  },
})