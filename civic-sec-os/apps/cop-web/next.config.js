/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [],
  env: {
    MAP_STYLE_URL: process.env.MAP_STYLE_URL || "https://tiles.stadiamaps.com/styles/alidade_smooth.json"
  }
};

module.exports = nextConfig;
