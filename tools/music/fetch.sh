#!/usr/bin/env bash
# Downloads the CC0 music tracks from OpenGameArt (and picks up Dan's Suno tracks from the cache),
# checks their sha256, trims the dead air at each end (leaving about a second of breath for the
# loop), and encodes Ogg/Opus plus an AAC fallback into public/audio. Prints each output's
# integrated loudness for src/audio/music/tracks.ts.
#   bash tools/music/fetch.sh [music_name]   (just the one track when a name is given)
# Suno tracks ("suno:<id>") can't be downloaded: export the MP3 (or M4A) from Dan's Suno library and
# copy it to tools/.cache/music/<name without the music_ prefix>.mp3 (or .m4a) first. ElevenLabs Music tracks
# ("elevenlabs:<date>", generated with `elevenlabs music compose`; ART_PROVENANCE.md has the prompt) are
# the same: copy the generated MP3 to the cache first.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CACHE="$ROOT/tools/.cache/music"
OUT="$ROOT/public/audio"
mkdir -p "$CACHE"

# name | source url | sha256 | trim start (s) | trim end (s)
TRACKS=(
  "music_bards_tale|https://opengameart.org/sites/default/files/The_Bards_Tale.mp3|6e93e8e8215bea17a209c321c182111058e024c53e3ad775ce1481ca1d1fcfc2|2.0|153.0"
  "music_reggae|https://opengameart.org/sites/default/files/regea_0.mp3|e276b0afddff4eb483d4ae13e9b7f95a04cc46d03180ebf1c3d58084f415adfd|0.4|236.0"
  "music_bamboo_tide|suno:a6655ab9-f55b-4083-baca-8b20354c928f|9a848dd048caf6830321b4b61e011d28134cc5cdc8fd11bed52bbe7c7f55d51c|0.0|151.4"
  "music_sunset_plains|https://opengameart.org/sites/default/files/sunset_plains.wav|f3750f8eda8bf42662b12f5726404675689b50f05ccaa968c5cb2e33d9172a62|0.8|329.4"
  "music_salty_sway|suno:4411cff4-7e13-45d8-a90b-07e15ad9fd2e|bbb8a91c615de57cc5e0f9b051cc86bdb61c9edb669c5b6a16be207db761cf67|0.2|157.0"
  "music_island_reveal|suno:e9a16c98-4efe-40f7-a705-8c2ef91182a1|165ab83dd2411f1beae067cb45cd38f11e55cac735a19633089f7ef76a8ceb58|0.3|147.2"
  "music_brass_of_the_storm|suno:c7937692-3831-4a79-b7f2-66401ecc9b68|85e9baef8964374bb43540c966781411c9608d8f82e0508b717a9f6bf8ed6113|0.0|146.7"
  "music_thousand_boughs|suno:99af60c4-84c5-4b2b-8908-7b80468b66c6|b2d08fd5e03d6d7011e7dc4b40688401bd5ef76e71cee93d74e221688df66780|0.0|148.6"
  "music_harps_return|suno:harps-return|ae5c71dc21094f1bd214cef2ee75ebbd9786725dff7df97485d002ef92a5c2a8|0.15|179.9"
  "music_sunspire_crossing|suno:sunspire-crossing|471175514cfeaa8855364cf65ee274d23157c9af2eee862bdcb9f504e418e3a6|0.1|131.9"
  "music_inkwell_waltz|suno:inkwell-waltz|2096216d5a7ac982d42aa6306a43ff992b5383e8aee518f607c0fc3cba1306a9|0.1|149.9"
  "music_tidewheel_lullaby|suno:tidewheel-lullaby|1974960ef23f0b7151d9990d3dbbf799783bc6cca9fa7b1d556e3acc527fce67|0.05|149.9"
  "music_the_long_light|suno:the-long-light|1ad27e1046a2a362b84f28a2c422dcc53b319e69c1d2a861eb3f37e9f76387d3|0.0|147.3"
)

ONLY="${1:-}"
for entry in "${TRACKS[@]}"; do
  IFS='|' read -r name url sha start end <<<"$entry"
  [[ -z "$ONLY" || "$name" == "$ONLY" ]] || continue
  if [[ "$url" == suno:* || "$url" == elevenlabs:* ]]; then
    # (Suno exports an MP3 or an M4A: either is taken.)
    src="$CACHE/${name#music_}.mp3"
    [[ -f "$src" ]] || src="$CACHE/${name#music_}.m4a"
    [[ -f "$src" ]] || { echo "Missing $CACHE/${name#music_}.mp3 (or .m4a): export track ${url#*:} (${url%%:*}) and copy it there." >&2; exit 1; }
  else
    src="$CACHE/$(basename "$url")"
    [[ -f "$src" ]] || curl -sfL -A "Mozilla/5.0" -o "$src" "$url"
  fi
  echo "$sha  $src" | shasum -a 256 -c --quiet -
  duration=$(awk -v s="$start" -v e="$end" 'BEGIN { print e - s }')
  fade_out=$(awk -v d="$duration" 'BEGIN { print d - 0.8 }')
  filter="atrim=start=$start:end=$end,asetpts=PTS-STARTPTS,afade=t=in:d=0.02,afade=t=out:st=$fade_out:d=0.8"
  ffmpeg -hide_banner -loglevel error -y -i "$src" -vn -af "$filter" -ar 48000 -ac 2 \
    -c:a libopus -b:a 96k -vbr on -compression_level 10 -application audio -map_metadata -1 "$OUT/$name.ogg"
  ffmpeg -hide_banner -loglevel error -y -i "$src" -vn -af "$filter" -ar 48000 -ac 2 \
    -c:a aac -b:a 128k -movflags +faststart -map_metadata -1 "$OUT/$name.m4a"
  lufs=$(ffmpeg -hide_banner -nostats -i "$OUT/$name.ogg" -af ebur128 -f null - 2>&1 | awk '/^ +I:/ { v = $2 } END { print v }')
  echo "$name: ${duration}s, $lufs LUFS, $(du -h "$OUT/$name.ogg" | cut -f1) ogg, $(du -h "$OUT/$name.m4a" | cut -f1) m4a"
done
