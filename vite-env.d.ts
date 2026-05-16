/// <reference types="vite/client" />

declare module "@hono/vite-dev-server" {
  import type { Plugin } from "vite";
  interface DevServerOptions {
    entry: string;
    exclude?: RegExp[];
  }
  export default function devServer(options: DevServerOptions): Plugin;
}
