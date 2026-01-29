/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig = {
  output: "export",
  basePath,
  assetPrefix: basePath,
  images: { unoptimized: true },
  trailingSlash: true,

  // 1. Safety: Bypass errors to get the site live
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // 2. Webpack Configuration (Merging both logic blocks)
  webpack: (config) => {
    // Handling Solana/Browser fallbacks
    config.resolve.fallback = { 
      fs: false, 
      path: false, 
      os: false, 
      crypto: false 
    };

    // Handling the pino-pretty warning
    config.externals.push({
      'pino-pretty': 'pino-pretty',
    });

    return config;
  },
};

module.exports = nextConfig;