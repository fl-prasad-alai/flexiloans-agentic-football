import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets the dev server be reached via http://[::1]:3000 without its HMR/dev-resource requests
  // getting cross-origin blocked. Useful specifically because this machine also runs another
  // project's server on the same port 3000 (bound to IPv4) — [::1] disambiguates between them.
  allowedDevOrigins: ["[::1]"],
};

export default nextConfig;
