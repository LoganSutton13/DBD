#!/usr/bin/env bash
# Install and start DBD (NodeODM + backend + frontend) with Docker Compose.
# Builds from ./code (see docker-compose.yml). For pre-built images from GHCR, use:
#   ./scripts/install-dbd-ghcr.sh
# Farmers do not need Git if they receive this folder or a release archive.
#
# Prerequisites: Docker Engine + Docker Compose v2 (`docker compose`).
#
# Offline after images exist:
#   - While online once:  docker compose pull && docker compose build
#   - Export for USB:   docker save -o dbd-images.tar ...
#   - On air-gapped PC: docker load -i dbd-images.tar && ./scripts/install-dbd.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

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

echo "Building and starting DBD from: $ROOT"
"${COMPOSE[@]}" up -d --build

echo ""
echo "DBD is running."
echo "  Web app:    http://localhost:8000"
echo "  API / docs: http://localhost:8001/docs"
echo "  NodeODM UI: http://localhost:3000 (optional)"
echo ""
echo "Commands:  docker compose logs -f   |   docker compose down"
