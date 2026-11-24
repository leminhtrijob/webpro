import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['mongoose'],
  async headers() {
    return [{
      source: '/source-demos/:path*',
      headers: [{ key: 'Content-Security-Policy', value: 'sandbox allow-scripts' }]
    }];
  }
};

export default nextConfig;
