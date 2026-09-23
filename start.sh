#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
node scripts/ensure-deps.js
exec node index.js
