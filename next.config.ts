import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Bundle the pre-built knowledge/ directory into the serverless function
  // for /api/chat and /api/knowledge/[...path] so they can readFileSync()
  // the page PNGs and structured JSONs on Vercel.
  outputFileTracingIncludes: {
    "/api/chat": [
      "./knowledge/corpus.json",
      "./knowledge/figures/catalog.json",
      "./knowledge/structured/**/*",
      "./knowledge/pages/**/*",
    ],
    "/api/knowledge/[...path]": ["./knowledge/**/*"],
  },
};

export default nextConfig;
