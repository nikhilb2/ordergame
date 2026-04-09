#!/usr/bin/env bash
set -euo pipefail

# Build and push backend image for shruks_project.
#
# Defaults to linux/amd64 so images run on typical cloud Kubernetes nodes.
#
# Usage:
#   ./k8s/backend/build-and-push.sh registry.kube.nikhilbhatia.com/shruks-api v1
#   ./k8s/backend/build-and-push.sh ghcr.io/<owner>/shruks-api latest
#
# Env (optional):
#   PROJECT_ROOT   Defaults to repository root (auto-detected)
#   DOCKERFILE     Defaults to docker/Dockerfile
#   PLATFORM       Defaults to linux/amd64
#   BUILDER        Optional buildx builder name

IMAGE_REPO="${1:-}"
IMAGE_TAG="${2:-latest}"
PLATFORM="${PLATFORM:-linux/amd64}"
BUILDER="${BUILDER:-}"

if [[ -z "$IMAGE_REPO" ]]; then
  echo "Usage: $0 <image-repo> [tag]"
  echo "Example: $0 registry.kube.nikhilbhatia.com/ordergame v1"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${PROJECT_ROOT:-$SCRIPT_DIR/..}"
DOCKERFILE="${DOCKERFILE:-$PROJECT_ROOT/Dockerfile}"
echo "Project root: $PROJECT_ROOT"
if ! command -v docker >/dev/null 2>&1; then
  echo "Error: docker is not installed or not in PATH"
  exit 1
fi

if [[ ! -f "$DOCKERFILE" ]]; then
  echo "Error: Dockerfile not found at: $DOCKERFILE"
  exit 1
fi

if ! docker buildx version >/dev/null 2>&1; then
  echo "Error: docker buildx is required. Please install/enable Docker Buildx."
  exit 1
fi

if [[ -n "$BUILDER" ]]; then
  docker buildx use "$BUILDER" >/dev/null 2>&1 || docker buildx create --name "$BUILDER" --use >/dev/null
fi

IMAGE="${IMAGE_REPO}:${IMAGE_TAG}"

echo "Building+Pushing image: $IMAGE"
echo "Platform: $PLATFORM"
docker buildx build \
  --platform "$PLATFORM" \
  -f "$DOCKERFILE" \
  -t "$IMAGE" \
  --push \
  "$PROJECT_ROOT"

echo

echo "Done."
echo "Set this in k8s/backend/10-deployment.yaml:"
echo "  image: $IMAGE"
