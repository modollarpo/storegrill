/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@Storegrill/shared'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'https', hostname: 'placehold.co' },
      { protocol: 'http', hostname: 'placehold.co' }
    ],
  },
};

export default nextConfig;
