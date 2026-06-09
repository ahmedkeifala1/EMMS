import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfkit uses Node.js fs for fonts — exclude from bundling
  serverExternalPackages: ["pdfkit"],
};

export default nextConfig;
