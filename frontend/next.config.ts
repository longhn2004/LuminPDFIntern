import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // reactStrictMode: true,
  // async headers() {
  //   return [
  //     {
  //       // Apply these headers to all routes in your application.
  //       source: '/(.*)',
  //       headers: [
  //         {
  //           key: 'Cross-Origin-Embedder-Policy',
  //           value: 'require-corp',
  //         },
  //         {
  //           key: 'Cross-Origin-Opener-Policy',
  //           value: 'same-origin',
  //         },
  //       ],
  //     },
  //   ];
  // },
  // webpack: (config) => {
  //   // Fallback for 'fs' module needed by some PDFTron dependencies if not handled elsewhere
  //   if (!config.resolve.fallback) {
  //     config.resolve.fallback = {};
  //   }
  //   config.resolve.fallback.fs = false;
  //   return config;
  // },
};

export default nextConfig;
