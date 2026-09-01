#!/usr/bin/env bash
# Build a single PMTiles file from the split GeoJSON chunks
# scripts/tiles.sh [--src-dir DIR] [--out FILE] [--min-zoom N] [--max-zoom N]

set -euo pipefail

SRC_DIR="data/chunks"
OUT="public/data/street-trees.pmtiles"
MIN_ZOOM=9
MAX_ZOOM=16
LAYER="trees"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --src-dir)  SRC_DIR="$2"; shift 2 ;;
    --out)      OUT="$2"; shift 2 ;;
    --min-zoom) MIN_ZOOM="$2"; shift 2 ;;
    --max-zoom) MAX_ZOOM="$2"; shift 2 ;;
    -h|--help)
      sed -n '2,4p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *) echo "unknown arg: $1" >&2; exit 1 ;;
  esac
done

command -v tippecanoe >/dev/null || {
  echo "tippecanoe is required (brew install tippecanoe)" >&2
  exit 1
}

shopt -s nullglob
chunks=("$SRC_DIR"/street-tree-data-*.geojson)
shopt -u nullglob
if (( ${#chunks[@]} == 0 )); then
  echo "no chunks found in $SRC_DIR (run scripts/split.sh first)" >&2
  exit 1
fi

mkdir -p "$(dirname "$OUT")"

echo "src:      $SRC_DIR (${#chunks[@]} chunks)"
echo "out:      $OUT"
echo "zoom:     $MIN_ZOOM..$MAX_ZOOM"
echo "layer:    $LAYER"
echo

tippecanoe \
  --output="$OUT" \
  --layer="$LAYER" \
  --minimum-zoom="$MIN_ZOOM" \
  --maximum-zoom="$MAX_ZOOM" \
  --drop-densest-as-needed \
  --extend-zooms-if-still-dropping \
  --read-parallel \
  --force \
  "${chunks[@]}"

echo
echo "wrote $OUT"
ls -lh "$OUT"
