#!/usr/bin/env bash
# Synthesizes Guildcrest's abbey bell and book close (tools/sfx/synth-guildcrest.py, no samples) and
# encodes them like tools/sfx/fetch.sh's loops: a gain to the target loudness, Ogg/Opus 64 kbps mono and an AAC fallback.
#   bash tools/sfx/synth-guildcrest.sh
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUT="$ROOT/public/audio"
FFMPEG="${FFMPEG:-ffmpeg}"
python3 "$ROOT/tools/sfx/synth-guildcrest.py" >/dev/null
# name | target LUFS
for entry in "abbey_bell|-18" "book_close|-20"; do
  IFS='|' read -r name target <<<"$entry"
  src="$ROOT/tools/.cache/sfx/$name.wav"
  # A plain gain to the target (as fetch.sh's loops): loudnorm's compression would flatten the bell's decay.
  have=$("$FFMPEG" -hide_banner -nostats -i "$src" -af ebur128 -f null - 2>&1 | awk '/I:/ { v = $2 } END { print v }')
  gain=$(awk -v t="$target" -v h="$have" 'BEGIN { print t - h }')
  filter="volume=${gain}dB,alimiter=limit=0.84:level=false"
  "$FFMPEG" -hide_banner -loglevel error -y -i "$src" -vn -af "$filter" -ar 48000 -ac 1 \
    -c:a libopus -b:a 64k -vbr on -compression_level 10 -map_metadata -1 "$OUT/$name.ogg"
  "$FFMPEG" -hide_banner -loglevel error -y -i "$src" -vn -af "$filter" -ar 48000 -ac 1 \
    -c:a aac -b:a 80k -map_metadata -1 -movflags +faststart "$OUT/$name.m4a"
  lufs=$("$FFMPEG" -hide_banner -nostats -i "$OUT/$name.ogg" -af ebur128 -f null - 2>&1 | awk '/I:/ { v = $2 } END { print v }')
  echo "$name  ${lufs} LUFS  $(du -h "$OUT/$name.ogg" | cut -f1)"
done
