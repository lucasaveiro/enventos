import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {
    // Root must include node_modules. In worktree context, resolve up to the main repo.
    root: path.resolve(__dirname, '../../..'),
  },
};

export default nextConfig;
