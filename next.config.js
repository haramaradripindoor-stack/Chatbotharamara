/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['groq-sdk', 'cohere-ai']
  }
}

module.exports = nextConfig
