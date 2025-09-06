/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimize for production
  poweredByHeader: false,
  generateEtags: false,
  
  // Experimental features
  experimental: {
    // Enable serverComponentsExternalPackages for better-sqlite3
    serverComponentsExternalPackages: ['better-sqlite3']
  }
}

module.exports = nextConfig