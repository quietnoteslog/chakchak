import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfjs-dist는 브라우저 전용 (DOMMatrix, canvas 등) - 서버 번들에서 제외
  serverExternalPackages: ['pdfjs-dist'],
};

export default nextConfig;
