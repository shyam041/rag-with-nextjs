import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "chromadb", "@prisma/client", "pdfjs-dist"],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), "canvas"]
    }
    return config
  },
}

export default nextConfig
