#!/bin/bash
cd /home/runner/workspace/next-reference
pnpm install --frozen-lockfile 2>/dev/null || pnpm install
PORT=5000 pnpm dev
