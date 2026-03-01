import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["shared-components"],
  async redirects() {
    return [
      {
        source: "/dashboard",
        destination: "/dashboard/qr-codes",
        permanent: false,
      },
    ]
  },
}

export default nextConfig
