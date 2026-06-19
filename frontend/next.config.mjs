// Next.js configuration for the Railia MVP.
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: ["**/node_modules/**", "**/.next/**", "../.npm-cache/**", "../.tools/**"]
      };
    }
    return config;
  }
};

export default nextConfig;
