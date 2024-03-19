// vite.config.js
import { resolve } from "path"
import { defineConfig } from "vite"
import dts from "vite-plugin-dts"
import externals from "rollup-plugin-node-externals"
import { name } from "./package.json"

const libName = name.replace(`@`, ``).replace(`/`, `-`)

export default defineConfig(({ mode }) => ({
  build: {
    minify: false,
    lib: {
      entry: resolve(__dirname, `src/index.ts`),
      name: libName,
      fileName: "index",
    },
    emptyOutDir: mode !== `development`,
    sourcemap: true,
  },
  plugins: [
    {
      enforce: `pre`,
      ...externals({
        peerDeps: true,
        deps: true,
        devDeps: true,
      }),
    },
    dts({
      entryRoot: "src",
      compilerOptions: {
        declaration: false,
        skipLibCheck: true
      }
    }),
  ],
}))
