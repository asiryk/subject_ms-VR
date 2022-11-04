import { defineConfig } from "astro/config";
import glsl from "vite-plugin-glsl";

// https://astro.build/config
export default defineConfig({
  site: "https://asiryk.github.io",
  base: "/subject_ms-VGGI",
  vite: {
    plugins: [glsl()],
  },
});
