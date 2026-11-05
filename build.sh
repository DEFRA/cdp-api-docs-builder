#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 2 ]; then
  echo "Usage: ./build.sh <repo-dir> <target>"
  echo "Example: ./build.sh ~/dev/DEFRA/cdp-uploader latest"
  exit 1
fi

REPO_DIR="$(cd "$1" && pwd)"
TARGET="$2"
BUILDER_ROOT="$(cd "$(dirname "$0")" && pwd)"
SITE_DIR="${BUILDER_ROOT}/site"
SITE_GUIDES_DIR="${SITE_DIR}/guides"
SITE_OPENAPI_DIR="${SITE_DIR}/openapi"
SITE_API_DOCS_DIR="${SITE_DIR}/docs/api/reference"

SERVICE_NAME="$(basename "${REPO_DIR}")"
BASE_URL="/api/${SERVICE_NAME}/${TARGET}/"

if [ ! -d "${REPO_DIR}" ]; then
  echo "Repository directory does not exist: ${REPO_DIR}" >&2
  exit 1
fi

if [ ! -d "${REPO_DIR}/docs/guides" ]; then
  echo "Expected guides at ${REPO_DIR}/docs/guides" >&2
  exit 1
fi

if [ ! -d "${SITE_DIR}/node_modules" ]; then
  echo "Installing builder dependencies..."
  (cd "${SITE_DIR}" && npm ci)
fi

echo "Preparing builder inputs..."
rm -rf "${SITE_GUIDES_DIR}" "${SITE_OPENAPI_DIR}" "${SITE_API_DOCS_DIR}"
mkdir -p "${SITE_GUIDES_DIR}" "${SITE_OPENAPI_DIR}"
cp -R "${REPO_DIR}/docs/guides/." "${SITE_GUIDES_DIR}/"

HAS_SPEC="false"
if [ -f "${REPO_DIR}/docs/openapi/swagger.json" ]; then
  cp "${REPO_DIR}/docs/openapi/swagger.json" "${SITE_OPENAPI_DIR}/swagger.json"
  HAS_SPEC="true"
fi

if [ "${HAS_SPEC}" = "true" ]; then
  echo "Generating API reference pages from swagger.json"
  (cd "${SITE_DIR}" && npm run gen:api)
else
  echo "No swagger.json found, building guides-only site"
fi

OUT_DIR="${REPO_DIR}/build-${TARGET}"
rm -rf "${OUT_DIR}"

echo "Building docs to ${OUT_DIR}"
(
  cd "${SITE_DIR}"
  GITHUB_REPOSITORY="DEFRA/${SERVICE_NAME}" \
  DOCS_BASE_URL="${BASE_URL}" \
  npx docusaurus build --out-dir "${OUT_DIR}"
)

echo "Done. Built ${OUT_DIR}"
