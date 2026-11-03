/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep production builds from overwriting the running development compiler cache.
  distDir: process.env.NODE_ENV === 'production' ? '.next' : '.next-dev',
  reactStrictMode: true,
}

export default nextConfig
