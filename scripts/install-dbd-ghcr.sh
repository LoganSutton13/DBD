#!/usr/bin/env bash
# Install and start DBD from container registries (no local build, no .env file).
# Pulls NodeODM from Docker Hub and DBD backend/frontend from GitHub Container Registry.
#
# Prerequisites: Docker Engine + Docker Compose v2 (`docker compose`).
#
# Defaults (edit below if you fork or change registry/tag):
#   ghcr.io/logansutton13/dbd-backend:main
#   ghcr.io/logansutton13/dbd-frontend:main
#
# Override without editing this file:
#   DBD_IMAGE_REGISTRY=ghcr.io/other DBD_VERSION=latest ./scripts/install-dbd-ghcr.sh
#
# Private GHCR packages: docker login ghcr.io (PAT with read:packages)

set -euo pipefail

# --- defaults (keep in sync with docker-compose.ghcr.yml image: lines) ---
DBD_IMAGE_REGISTRY="${DBD_IMAGE_REGISTRY:-ghcr.io/logansutton13}"
DBD_VERSION="${DBD_VERSION:-main}"
export DBD_IMAGE_REGISTRY DBD_VERSION

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

COMPOSE_FILE="docker-compose.ghcr.yml"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required. Install Docker Desktop or Docker Engine, then retry."
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  COMPOSE=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE=(docker-compose)
else
  echo "Docker Compose is required (try: docker compose version)."
  exit 1
fi

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "Missing $COMPOSE_FILE in $ROOT (this script must run from the DBD repo root layout)."
  exit 1
fi

echo "Pulling images (NodeODM + DBD from ${DBD_IMAGE_REGISTRY} @ ${DBD_VERSION})..."
"${COMPOSE[@]}" -f "$COMPOSE_FILE" pull

echo "Starting stack from: $ROOT ($COMPOSE_FILE)"
"${COMPOSE[@]}" -f "$COMPOSE_FILE" up -d

echo ""
echo "DBD is running (registry images)."
echo "  Web app:    http://localhost:8000"
echo "  API / docs: http://localhost:8001/docs"
echo "  NodeODM UI: http://localhost:3000 (optional)"
echo ""
echo "Compose file: $COMPOSE_FILE"
echo "Commands:  docker compose -f $COMPOSE_FILE logs -f   |   docker compose -f $COMPOSE_FILE down"
