import type { NextConfig } from 'next';
import { EEnvironments } from '@/lib/constants';

const allowedDevOrigins = process.env.NEXT_ALLOWED_DEV_ORIGINS
  ? process.env.NEXT_ALLOWED_DEV_ORIGINS.split(',')
  : [];
if (
  !allowedDevOrigins.length &&
  process.env.NODE_ENV !== (EEnvironments.PROD as string)
) {
  throw new Error('NEXT_ALLOWED_DEV_ORIGINS is not set');
}

const nextConfig: NextConfig = {
  allowedDevOrigins,
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('typeorm');

      // TypeORM resolves entities by their JavaScript class name at runtime
      // (via constructor.name). Production minification renames classes to
      // single letters (e.g. Task → g), breaking TypeORM's metadata lookup.
      // Disabling minimization on the server bundle preserves class names.
      config.optimization = {
        ...config.optimization,
        minimize: false,
      };
    }
    return config;
  },
};

export default nextConfig;
