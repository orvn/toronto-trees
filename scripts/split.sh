#!/usr/bin/env bash
# Split large GeoJSON FeatureCollection into smaller chunk files
# scripts/split.sh [INPUT] [--out-dir DIR] [--max N] [--prefix NAME] [--force]

set -euo pipefail

INPUT="data/street-tree-data-4326.geojson"
OUT_DIR="data/chunks"
MAX=50000
PREFIX="street-tree-data"
FORCE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --input)   INPUT="$2"; shift 2 ;;
    --out-dir) OUT_DIR="$2"; shift 2 ;;
    --max)     MAX="$2"; shift 2 ;;
    --prefix)  PREFIX="$2"; shift 2 ;;
    --force)   FORCE=1; shift ;;
    -h|--help)
      sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    -*) echo "unknown arg: $1" >&2; exit 1 ;;
    *)  INPUT="$1"; shift ;;
  esac
done

command -v jq >/dev/null || { echo "jq is required (brew install jq)" >&2; exit 1; }
[[ -f "$INPUT" ]] || { echo "input not found: $INPUT" >&2; exit 1; }
[[ "$MAX" =~ ^[0-9]+$ ]] && (( MAX > 0 )) || { echo "--max must be a positive integer" >&2; exit 1; }

mkdir -p "$OUT_DIR"

shopt -s nullglob
existing=("$OUT_DIR/${PREFIX}-"*.geojson)
if (( ${#existing[@]} > 0 )); then
  if (( FORCE )); then
    rm -f "${existing[@]}"
  else
    echo "refusing to write: ${#existing[@]} existing ${PREFIX}-*.geojson file(s) in $OUT_DIR (use --force to overwrite)" >&2
    exit 1
  fi
fi
shopt -u nullglob

# Pull top-level name and crs with jq stream
NAME=$(jq -rn --stream '
  first(fromstream(1 | truncate_stream(inputs | select(.[0][0] == "name"))))
  // empty
' "$INPUT")
CRS=$(jq -cn --stream '
  first(fromstream(1 | truncate_stream(inputs | select(.[0][0] == "crs"))))
  // empty
' "$INPUT")
[[ -z "$NAME" ]] && NAME="$(basename "$INPUT" .geojson)"
[[ -z "$CRS"  ]] && CRS='{"type":"name","properties":{"name":"urn:ogc:def:crs:OGC:1.3:CRS84"}}'

echo "input:   $INPUT"
echo "out-dir: $OUT_DIR"
echo "prefix:  $PREFIX"
echo "max:     $MAX features per chunk"
echo

# Emit json
jq -cn --stream '
  fromstream(2 | truncate_stream(inputs | select(.[0][0] == "features")))
' "$INPUT" \
| awk -v max="$MAX" -v out_dir="$OUT_DIR" -v prefix="$PREFIX" -v name="$NAME" -v crs="$CRS" '
function open_chunk(   fname) {
  chunk_index++
  fname = sprintf("%s/%s-%04d.geojson", out_dir, prefix, chunk_index)
  current_file = fname
  printf("{\n\"type\": \"FeatureCollection\",\n\"name\": \"%s\",\n\"crs\": %s,\n\"features\": [\n", name, crs) > current_file
  in_chunk = 0
}
function close_chunk() {
  if (current_file == "") return
  printf("\n]\n}\n") > current_file
  close(current_file)
  printf("wrote %s (%d features)\n", current_file, in_chunk)
  current_file = ""
}
{
  if (current_file == "" || in_chunk >= max) {
    close_chunk(); open_chunk()
  }
  if (in_chunk > 0) printf(",\n") > current_file
  printf("%s", $0) > current_file
  in_chunk++; total++
}
END {
  close_chunk()
  printf("\ntotal: %d features across %d chunks\n", total, chunk_index)
  if (total == 0) {
    print "warning: no features emitted" > "/dev/stderr"
    exit 2
  }
}
'
