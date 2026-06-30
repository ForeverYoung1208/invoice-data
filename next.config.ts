import type { NextConfig } from 'next';
const allowedDevOrigins = process.env.NEXT_ALLOWED_DEV_ORIGINS
  ? process.env.NEXT_ALLOWED_DEV_ORIGINS.split(',')
  : [];
if (!allowedDevOrigins.length) {
  throw new Error('NEXT_ALLOWED_DEV_ORIGINS is not set');
}

const nextConfig: NextConfig = {
  allowedDevOrigins,
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('typeorm');
    }
    return config;
  },
};

export default nextConfig;
