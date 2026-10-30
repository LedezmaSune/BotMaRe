/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  typescript: {
    // Omite la comprobación redundante de tipos durante el build para evitar 'heap out of memory' en Termux / VPS con RAM limitada
    ignoreBuildErrors: true,
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  }
};

export default nextConfig;
