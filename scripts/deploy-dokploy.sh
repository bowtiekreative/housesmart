#!/usr/bin/env bash
# Deploys HomeSmart.ca to a Dokploy instance as a Compose service.
#
# Usage:
#   export DOKPLOY_URL=https://dashboard.cauziva.com
#   export DOKPLOY_TOKEN=<your Dokploy API key>   # Settings → API/CLI → Generate
#   ./scripts/deploy-dokploy.sh
#
# Optional:
#   REPO_URL   (default: https://github.com/bowtiekreative/housesmart.git)
#   BRANCH     (default: claude/homesmart-seo-platform-rziv4r)
#   ENV_FILE   (default: .env — pasted into the compose service's environment)
#
# Notes:
# - Targets the Dokploy REST API (v0.17+ paths: /api/<router>.<procedure>).
# - For a PRIVATE GitHub repo, either install the GitHub app on your Dokploy
#   instance and attach the repo in the UI afterwards, or use a URL with a
#   token: https://<user>:<PAT>@github.com/bowtiekreative/housesmart.git
set -euo pipefail

: "${DOKPLOY_URL:?Set DOKPLOY_URL, e.g. https://dashboard.cauziva.com}"
: "${DOKPLOY_TOKEN:?Set DOKPLOY_TOKEN (Dokploy → Settings → API/CLI)}"
REPO_URL="${REPO_URL:-https://github.com/bowtiekreative/housesmart.git}"
BRANCH="${BRANCH:-claude/homesmart-seo-platform-rziv4r}"
ENV_FILE="${ENV_FILE:-.env}"

api() {
  local path="$1"; shift
  curl -fsS -X POST "${DOKPLOY_URL%/}/api/${path}" \
    -H "x-api-key: ${DOKPLOY_TOKEN}" \
    -H "Content-Type: application/json" \
    "$@"
}

echo "→ Creating project 'homesmart'..."
PROJECT_JSON=$(api project.create -d '{"name":"homesmart","description":"HomeSmart.ca — programmatic SEO/GEO platform"}')
PROJECT_ID=$(echo "$PROJECT_JSON" | grep -o '"projectId":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "  projectId: ${PROJECT_ID}"

echo "→ Creating compose service..."
COMPOSE_JSON=$(api compose.create -d "{\"name\":\"homesmart-stack\",\"projectId\":\"${PROJECT_ID}\",\"composeType\":\"docker-compose\"}")
COMPOSE_ID=$(echo "$COMPOSE_JSON" | grep -o '"composeId":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "  composeId: ${COMPOSE_ID}"

ENV_CONTENT=""
if [[ -f "$ENV_FILE" ]]; then
  ENV_CONTENT=$(python3 -c 'import json,sys; print(json.dumps(open(sys.argv[1]).read()))' "$ENV_FILE")
  echo "→ Loaded environment from ${ENV_FILE}"
else
  ENV_CONTENT='""'
  echo "! ${ENV_FILE} not found — deploying without env vars (set them in the Dokploy UI)"
fi

echo "→ Pointing service at ${REPO_URL} (${BRANCH})..."
api compose.update -d "{
  \"composeId\": \"${COMPOSE_ID}\",
  \"sourceType\": \"git\",
  \"customGitUrl\": \"${REPO_URL}\",
  \"customGitBranch\": \"${BRANCH}\",
  \"composePath\": \"./docker-compose.yml\",
  \"env\": ${ENV_CONTENT}
}" > /dev/null

echo "→ Deploying..."
api compose.deploy -d "{\"composeId\":\"${COMPOSE_ID}\"}" > /dev/null

cat <<DONE

✔ Deploy triggered. Next steps in the Dokploy UI (${DOKPLOY_URL}):
  1. Watch the build logs on the 'homesmart-stack' service.
  2. Domains tab: map your site domain → service 'web' port 4321,
     and a CMS domain → service 'wordpress' port 80.
  3. Finish the WordPress installer at the CMS domain, create the bot user
     + application password, set WP_URL/WP_AUTH_KEY in the env, redeploy.
DONE
