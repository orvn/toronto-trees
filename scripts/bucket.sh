#!/usr/bin/env bash
# Upload the built pmtiles file to Cloudflare R2 (S3-compatible)
# scripts/upload.sh [FILE]

set -euo pipefail

FILE="${1:-public/data/street-trees.pmtiles}"

if [ -f .env ]; then
  set -a; source .env; set +a
fi

: "${R2_ACCOUNT_ID:?set R2_ACCOUNT_ID in .env}"
: "${R2_ACCESS_KEY_ID:?set R2_ACCESS_KEY_ID in .env}"
: "${R2_SECRET_ACCESS_KEY:?set R2_SECRET_ACCESS_KEY in .env}"
: "${R2_BUCKET:?set R2_BUCKET in .env}"

command -v aws >/dev/null || { echo "aws CLI required (brew install awscli)" >&2; exit 1; }
[ -f "$FILE" ] || { echo "file not found: $FILE (run scripts/tiles.sh first)" >&2; exit 1; }

KEY="$(basename "$FILE")"

AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" \
AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
AWS_DEFAULT_REGION=auto \
aws s3 cp "$FILE" "s3://$R2_BUCKET/$KEY" \
  --endpoint-url "https://$R2_ACCOUNT_ID.r2.cloudflarestorage.com" \
  --content-type "application/octet-stream" \
  --cache-control "public, max-age=31536000, immutable"

echo "uploaded s3://$R2_BUCKET/$KEY"
