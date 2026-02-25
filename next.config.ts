import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {
    // Fix: prevent Turbopack panic on non-ASCII characters (ç) in the project path.
    // Setting root to the project directory makes module idents relative and ASCII-safe.
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
