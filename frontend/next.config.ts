import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Ignore ESLint errors during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Ignore TypeScript errors during build (optional)
  typescript: {
    ignoreBuildErrors: false, // Set to true if you also want to ignore TypeScript errors
  },
  async headers() {
    return [
      {
        // Apply these headers to all routes in your application.
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
        ],
      },
    ];
  },
  webpack: (config) => {
    // Fallback for 'fs' module needed by some PDFTron dependencies if not handled elsewhere
    if (!config.resolve.fallback) {
      config.resolve.fallback = {};
    }
    config.resolve.fallback.fs = false;
    return config;
  },
};

export default withNextIntl(nextConfig);
