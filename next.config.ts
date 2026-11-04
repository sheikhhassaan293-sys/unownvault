import type { NextConfig } from "next";

// NEXT_PUBLIC_STATIC_EXPORT=1 → flat static files for a shareable preview (see lib/paths.ts).
const staticExport = process.env.NEXT_PUBLIC_STATIC_EXPORT === "1";

const turbopack: NextConfig["turbopack"] = {
  rules: {
    "*.css": {
      loaders: ["@tailwindcss/turbopack"],
      as: "*.css",
    },
  },
};

const nextConfig: NextConfig = staticExport
  ? { output: "export", images: { unoptimized: true }, turbopack }
  : { cacheComponents: true, partialPrefetching: true, turbopack };

export default nextConfig;
