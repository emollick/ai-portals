#!/usr/bin/env bash
# Replays one recorded video file to YouTube Live for ever, on a small Linux server (Ubuntu or Debian, no graphics card).
# The file is sent as it is, without re-encoding, so it must already be what YouTube takes: H.264 video with a keyframe
# every 2 seconds and AAC sound (tools/loop/README.md has the OBS settings that make such a file).
#
#   sudo bash install.sh /root/portals-loop.mp4
#
# It asks for the YouTube stream key (not shown as you type, and kept in a file only root can read), then starts the
# broadcast as a service that comes back by itself after a dropped connection, a crash or a restart of the server.
#   systemctl status portals-stream      is it running
#   journalctl -u portals-stream -f      what ffmpeg says
#   systemctl stop portals-stream        stop the broadcast          systemctl start portals-stream      start it again
set -euo pipefail
[ "$(id -u)" = 0 ] || { echo "run this with sudo"; exit 1; }
VIDEO="${1:-}"; [ -f "$VIDEO" ] || { echo "usage: sudo bash install.sh /path/to/recording.mp4"; exit 1; }
VIDEO="$(readlink -f "$VIDEO")"
command -v ffmpeg >/dev/null || { apt-get update -qq && apt-get install -y -qq ffmpeg; }
# an .mkv (what OBS records) is rewrapped once as .mp4, which loops cleanly; nothing is re-encoded
if [ "${VIDEO##*.}" != mp4 ]; then
  echo "rewrapping as mp4 (a few minutes, no loss of quality)"
  ffmpeg -hide_banner -loglevel error -y -i "$VIDEO" -c copy -movflags +faststart "${VIDEO%.*}.mp4"; VIDEO="${VIDEO%.*}.mp4"
fi
codecs="$(ffprobe -v error -show_entries stream=codec_name -of csv=p=0 "$VIDEO" | tr '\n' ' ')"
case "$codecs" in *h264*aac*|*aac*h264*) ;; *) echo "this file holds: $codecs. YouTube needs h264 video and aac sound: record it again with the settings in README.md"; exit 1;; esac
read -r -s -p "YouTube stream key: " KEY; echo
[ -n "$KEY" ] || { echo "no key given"; exit 1; }
umask 077
printf 'VIDEO=%s\nYOUTUBE_KEY=%s\n' "$VIDEO" "$KEY" > /etc/portals-stream.env
cat > /etc/systemd/system/portals-stream.service <<'UNIT'
[Unit]
Description=Portals: a recorded flight, replayed to YouTube Live
After=network-online.target
Wants=network-online.target

[Service]
EnvironmentFile=/etc/portals-stream.env
ExecStart=/usr/bin/ffmpeg -hide_banner -loglevel warning -re -stream_loop -1 -i ${VIDEO} -c copy -flvflags no_duration_filesize -f flv rtmp://a.rtmp.youtube.com/live2/${YOUTUBE_KEY}
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable --now portals-stream
sleep 4; systemctl --no-pager --lines=5 status portals-stream || true
echo "started. YouTube Studio should show the stream within half a minute."
