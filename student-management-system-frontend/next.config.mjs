/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable static export for Tauri
  output: "export",

  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },

  // Configure trailing slash
  trailingSlash: true,

  // Configure base path
  basePath: "",

  // Disable server-side features that don't work with static export
  experimental: {},

  // Configure webpack for Tauri compatibility
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    return config;
  },

  // Configure environment variables
  env: {
    TAURI_PLATFORM: process.env.TAURI_PLATFORM,
    TAURI_ARCH: process.env.TAURI_ARCH,
    TAURI_FAMILY: process.env.TAURI_FAMILY,
    TAURI_PLATFORM_VERSION: process.env.TAURI_PLATFORM_VERSION,
    TAURI_PLATFORM_TYPE: process.env.TAURI_PLATFORM_TYPE,
  },
};

export default nextConfig;
