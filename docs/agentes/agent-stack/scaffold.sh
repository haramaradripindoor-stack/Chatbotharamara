#!/usr/bin/env bash
# Wrapper. Requiere Node (que ya tienes para Next.js).
set -euo pipefail
cd "$(dirname "$0")"
node scaffold.mjs "$@"
