#!/usr/bin/env bash
# Build the species index used by the search bar from the split GeoJSON chunks
# scripts/species.sh [--src-dir DIR] [--out FILE]

set -euo pipefail

SRC_DIR="data/chunks"
OUT="src/content/species.json"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --src-dir) SRC_DIR="$2"; shift 2 ;;
    --out)     OUT="$2"; shift 2 ;;
    -h|--help)
      sed -n '2,4p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *) echo "unknown arg: $1" >&2; exit 1 ;;
  esac
done

shopt -s nullglob
chunks=("$SRC_DIR"/*.geojson)
shopt -u nullglob
(( ${#chunks[@]} > 0 )) || { echo "no .geojson chunks in $SRC_DIR" >&2; exit 1; }

# One row per botanical + common name pair, sorted by count, names kept exactly as the inventory spells them
cat "${chunks[@]}" | perl -MJSON::PP -ne '
  while (/"BOTANICAL_NAME":"([^"]*)","COMMON_NAME":"([^"]*)"/g) {
    next if $1 eq "None";
    $c{"$1\t$2"}++;
  }
  END {
    my @rows = map { my ($b, $n) = split /\t/; { botanical => $b, common => $n, count => $c{$_} } }
               sort { $c{$b} <=> $c{$a} || $a cmp $b } keys %c;
    print JSON::PP->new->canonical->pretty->encode(\@rows);
  }
' > "$OUT"

echo "wrote $OUT ($(grep -c '"botanical"' "$OUT") rows)"
