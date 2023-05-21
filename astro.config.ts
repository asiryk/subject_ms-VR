import { defineConfig } from "astro/config";
import glsl from "vite-plugin-glsl";
import tailwind from "@astrojs/tailwind";

// https://astro.build/config
export default defineConfig({
  site: "https://asiryk.github.io",
  base: "/subject_ms-VR",
  vite: {
    plugins: [glsl()],
  },
  integrations: [
    tailwind()
  ],
});
