/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  // Allow production builds to succeed even if there are ESLint warnings/errors
  eslint: {
    ignoreDuringBuilds: true,
  },
};
