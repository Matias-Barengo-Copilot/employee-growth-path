#!/bin/bash
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
echo "Current branch: $BRANCH"

if [ "$BRANCH" = "migation-to-next" ] && [ -d "next-reference" ]; then
  echo "Detected migration branch - Starting Next.js app from next-reference/"
  cd next-reference
  pnpm install --frozen-lockfile 2>/dev/null || pnpm install
  PORT=5000 pnpm dev
else
  echo "Starting Express/React app"
  npm run dev
fi
