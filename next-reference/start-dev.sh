#!/bin/bash
export DATABASE_URL="$NEXT_DATABASE_URL"
export NEXTAUTH_URL="https://$REPL_SLUG.$REPL_OWNER.repl.co"
exec npx next dev --port 5000 --hostname 0.0.0.0
