#!/bin/bash
export DATABASE_URL="$NEXT_DATABASE_URL"
cd /home/runner/workspace/next-reference
exec npx next dev --port 5000 --hostname 0.0.0.0
