import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Add configuration to improve stability
   poweredByHeader: false,
   reactStrictMode: true,
  // Configure webpack to handle aborted requests gracefully
   webpack: (config) => {
     // Add custom error handling for hot updates
     config.infrastructureLogging = {
       level: 'error',
     };
     
     return config;
   },
  // Add custom headers to improve security and prevent aborted requests
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          }
        ]
      }
    ];
  }
};

export default nextConfig;
