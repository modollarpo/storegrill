/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@storegrill/shared'],
};

export default nextConfig;
