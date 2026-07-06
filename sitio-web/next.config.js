/** @type {import('next').NextConfig} */
const nextConfig = {
  // Imágenes remotas (el editor visual admite pegar URLs de imagen).
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
};
module.exports = nextConfig;
