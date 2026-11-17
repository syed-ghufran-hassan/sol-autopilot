// next.config.ts
import type { NextConfig } from 'next';

const isGithubPages = process.env.GITHUB_PAGES === 'true';
const repoName = 'sol-autopilot'; // MUST match your GitHub repo name exactly

const nextConfig: NextConfig = {
  output: isGithubPages ? 'export' : undefined,
  trailingSlash: isGithubPages,           // /rebalance → /rebalance/index.html
  images: { unoptimized: isGithubPages }, // No server image optimizer on Pages
  basePath: isGithubPages ? `/${repoName}` : '',
  assetPrefix: isGithubPages ? `/${repoName}/` : '',
};

export default nextConfig;