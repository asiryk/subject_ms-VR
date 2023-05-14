import { defineConfig } from "astro/config";
import glsl from "vite-plugin-glsl";
import tailwind from "@astrojs/tailwind";
import serviceWorker from "astrojs-service-worker";

// https://astro.build/config
export default defineConfig({
  site: "https://asiryk.github.io",
  base: "/subject_ms-VR",
  vite: {
    plugins: [glsl()],
  },
  integrations: [
    tailwind() ,
    serviceWorker()
  ],
});
