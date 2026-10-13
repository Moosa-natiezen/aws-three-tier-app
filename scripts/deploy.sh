#!/usr/bin/env bash
# Build + publish the SPA to S3/CloudFront for the state's environment.
# Usage: ./scripts/deploy.sh [dev|prod]
set -euo pipefail

ENVIRONMENT="${1:-dev}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TF="-chdir=$ROOT/terraform"

STATE_ENV=$(terraform $TF output -raw environment)
if [[ "$STATE_ENV" != "$ENVIRONMENT" ]]; then
  echo "ERROR: terraform state targets '$STATE_ENV' but you asked for '$ENVIRONMENT'." >&2
  exit 1
fi

BUCKET=$(terraform $TF output -raw frontend_bucket_name)
DIST_ID=$(terraform $TF output -raw cloudfront_distribution_id)
API_URL=$(terraform $TF output -raw api_stage_invoke_url)

echo "==> Building frontend ($ENVIRONMENT, VITE_API_URL=$API_URL)"
(cd "$ROOT/frontend" && VITE_API_URL="$API_URL" npm run build)

echo "==> Syncing content-hashed assets (immutable, 1y)"
aws s3 sync "$ROOT/frontend/dist/" "s3://$BUCKET/" --delete \
  --exclude "index.html" \
  --cache-control "public, max-age=31536000, immutable"

echo "==> Uploading index.html (no-cache entry document)"
aws s3 cp "$ROOT/frontend/dist/index.html" "s3://$BUCKET/index.html" \
  --cache-control "no-cache, no-store, must-revalidate" \
  --content-type "text/html"

echo "==> Invalidating /index.html (UI/UX §4)"
aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/index.html" >/dev/null

echo "==> Done: https://$(terraform $TF output -raw cloudfront_domain_name)"
