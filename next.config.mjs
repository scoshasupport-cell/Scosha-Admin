/** @type {import('next').NextConfig} */
const nextConfig = {
  // Nested admin/backend packages must stay out of the Next/Turbopack graph
  outputFileTracingExcludes: {
    "*": ["./admin/**/*", "./backend/**/*", "./scripts/**/*"],
  },
  images: {
    // Local SVG icons are static files. Remote SVG is not required, and the
    // image optimizer must not re-serve it.
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "**.amazonaws.com" },
      { protocol: "http", hostname: "localhost" },
      { protocol: "https", hostname: "m.media-amazon.com" },
      { protocol: "https", hostname: "images-na.ssl-images-amazon.com" },
      { protocol: "https", hostname: "images-eu.ssl-images-amazon.com" },
      { protocol: "http", hostname: "newentor.co.uk" },
      { protocol: "https", hostname: "newentor.co.uk" },
      { protocol: "https", hostname: "www.voilavoile.com" },
      { protocol: "http", hostname: "www.voilavoile.com" },
    ],
  },
  async headers() {
    // Report-only until inline Next.js scripts are nonced. This does not block
    // checkout, Google sign-in, or images. Enforce only after a browser pass
    // shows an empty violation report.
    const policy = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'self'",
      "form-action 'self'",
      "script-src 'self' https://accounts.google.com https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://res.cloudinary.com https://m.media-amazon.com https://images-na.ssl-images-amazon.com https://images-eu.ssl-images-amazon.com https://newentor.co.uk https://www.voilavoile.com",
      "font-src 'self'",
      "connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com https://vitals.vercel-insights.com",
      "frame-src https://accounts.google.com",
    ].join("; ")
    return [
      {
        source: "/:path*",
        headers: [{ key: "Content-Security-Policy-Report-Only", value: policy }],
      },
    ]
  },
  async redirects() {
    // Legacy Amaz/Pupasita catalog codes → Scosha-only sco codes
    return [
      {
        source: "/product/:slug*-ama-:code",
        destination: "/product/:slug*-sco-:code",
        permanent: true,
      },
      {
        source: "/product/:slug*-pup-:code",
        destination: "/product/:slug*-sco-:code",
        permanent: true,
      },
    ]
  },
  async rewrites() {
    const api = process.env.NEXT_PUBLIC_API_PROXY || "http://127.0.0.1:5000"
    const rules = [
      {
        source: "/api/v1/:path*",
        destination: `${api}/api/v1/:path*`,
      },
    ]
    // Dev only: proxy /admin to Vite. Production serves static files from public/admin
    // (nginx should SPA-fallback /admin/* → /admin/index.html).
    if (process.env.NODE_ENV !== "production") {
      const admin = process.env.NEXT_PUBLIC_ADMIN_PROXY || "http://localhost:5174"
      rules.push(
        { source: "/admin", destination: `${admin}/admin/` },
        { source: "/admin/:path*", destination: `${admin}/admin/:path*` }
      )
    }
    return rules
  },
}

export default nextConfig
