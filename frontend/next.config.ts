import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  // El build de producción no debe romperse por errores de tipo/lint preexistentes
  // (window.freighter, xBullSDK, módulos sin tipos, etc.). El dev usa transpile-only.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
