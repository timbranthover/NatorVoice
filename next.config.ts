import type { NextConfig } from "next";

const isPagesBuild = process.env.BUILD_TARGET === "pages";
const repoName = "NatorVoice";

const nextConfig: NextConfig = {
  ...(isPagesBuild
    ? {
        output: "export",
        basePath: `/${repoName}`,
        assetPrefix: `/${repoName}/`,
        trailingSlash: true,
        images: {
          unoptimized: true,
        },
      }
    : {}),
};

export default nextConfig;
