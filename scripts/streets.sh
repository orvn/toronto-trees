#!/usr/bin/env bash
# Build the street index used by address search from the split GeoJSON chunks
# Rows are [name, tree count, anchors]; anchors are [house number, lng, lat] so a number can be
# interpolated to a spot on the street before the tree tiles refine it
# scripts/streets.sh [--src-dir DIR] [--out FILE] [--tolerance METRES]

set -euo pipefail

SRC_DIR="data/chunks"
OUT="public/data/streets.json"
TOL=400

while [[ $# -gt 0 ]]; do
  case "$1" in
    --src-dir)   SRC_DIR="$2"; shift 2 ;;
    --out)       OUT="$2"; shift 2 ;;
    --tolerance) TOL="$2"; shift 2 ;;
    -h|--help)
      sed -n '2,6p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *) echo "unknown arg: $1" >&2; exit 1 ;;
  esac
done

shopt -s nullglob
chunks=("$SRC_DIR"/*.geojson)
shopt -u nullglob
(( ${#chunks[@]} > 0 )) || { echo "no .geojson chunks in $SRC_DIR" >&2; exit 1; }

cat "${chunks[@]}" | perl -MJSON::PP -s -ne '
  while (/"ADDRESS":(\d+),"STREETNAME":"([^"]*)".*?"coordinates":\[\[(-?[\d.]+),(-?[\d.]+)\]\]/g) {
    next if $2 eq "None" || $1 == 0;
    my $k = "$2\t$1";
    $sum{$k}[0] += $3; $sum{$k}[1] += $4; $sum{$k}[2]++;
  }
  END {
    # Several trees share a house number, so each number collapses to the mean of its trees
    for (keys %sum) {
      my ($s, $a) = split /\t/;
      my ($x, $y, $c) = @{ $sum{$_} };
      push @{ $st{$s} }, [$a + 0, $x / $c, $y / $c];
      $n{$s} += $c;
    }
    my $kx = 111320 * cos(43.7 * 3.14159265 / 180);
    my $ky = 111320;
    my @out;
    for my $s (sort keys %st) {
      my @p = sort { $a->[0] <=> $b->[0] } @{ $st{$s} };
      # Douglas-Peucker in address space: keep anchors until interpolating by house number stays within the tolerance
      my %keep = (0 => 1, $#p => 1);
      my @stack = ([0, $#p]);
      while (my $seg = pop @stack) {
        my ($i, $j) = @$seg;
        my ($worst, $wi) = (-1, undef);
        for my $k ($i + 1 .. $j - 1) {
          my ($a, $b, $p) = ($p[$i], $p[$j], $p[$k]);
          my $t = $b->[0] == $a->[0] ? 0 : ($p->[0] - $a->[0]) / ($b->[0] - $a->[0]);
          $t = $t < 0 ? 0 : $t > 1 ? 1 : $t;
          my $dx = ($p->[1] - ($a->[1] + ($b->[1] - $a->[1]) * $t)) * $kx;
          my $dy = ($p->[2] - ($a->[2] + ($b->[2] - $a->[2]) * $t)) * $ky;
          my $d = sqrt($dx * $dx + $dy * $dy);
          ($worst, $wi) = ($d, $k) if $d > $worst;
        }
        if ($worst > $tol) { $keep{$wi} = 1; push @stack, [$i, $wi], [$wi, $j] }
      }
      my @anchors = map { [$p[$_][0], 0 + sprintf("%.4f", $p[$_][1]), 0 + sprintf("%.4f", $p[$_][2])] }
                    sort { $a <=> $b } keys %keep;
      push @out, [$s, $n{$s}, \@anchors];
    }
    print JSON::PP->new->canonical->encode(\@out);
    print STDERR scalar(@out) . " streets\n";
  }
' -- -tol="$TOL" > "$OUT"

echo "wrote $OUT ($(du -h "$OUT" | cut -f1), $(gzip -c "$OUT" | wc -c | tr -d ' ') bytes gzipped)"
