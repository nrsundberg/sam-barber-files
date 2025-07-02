import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import devtoolsJson from "vite-plugin-devtools-json";
import babel from "vite-plugin-babel";

export default defineConfig({
  resolve: {
    alias: {
      ".prisma/client/index-browser":
        "./node_modules/.prisma/client/index-browser.js",
    },
  },
  server: {
    port: 3000,
    // host: true,
    // https: {
    //   key: fs.readFileSync("./certs/key.pem"),
    //   cert: fs.readFileSync("./certs/cert.pem"),
    // },
  },
  plugins: [
    reactRouter(),
    tsconfigPaths(),
    tailwindcss(),
    devtoolsJson(),
    babel({
      filter: /app\/.*\.[jt]sx?$/,
      babelConfig: {
        presets: ["@babel/preset-typescript"],
        plugins: [["babel-plugin-react-compiler"]],
      },
    }),
  ],
});
