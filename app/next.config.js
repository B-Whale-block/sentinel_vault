/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

module.exports = {
  output: "export",
  basePath,
  assetPrefix: basePath,
  images: { unoptimized: true },
  trailingSlash: true,
  webpack: (config) => {
    config.resolve.fallback = { fs: false, path: false, os: false, crypto: false };
    return config;
  },
};
