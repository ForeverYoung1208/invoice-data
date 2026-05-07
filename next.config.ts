import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  outputFileTracingExcludes: {
    '/*': ['docker/**/*'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('typeorm');
    }
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/node_modules', '**/docker/**'],
    };
    return config;
  },
  // Explicitly set turbopack config to silence the warning
  turbopack: {},
};

export default nextConfig;
