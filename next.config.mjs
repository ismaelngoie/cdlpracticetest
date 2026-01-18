/** @type {import('next').NextConfig} */
const nextConfig = {
  // This allows the app to work on Cloudflare Pages
  output: "export",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
