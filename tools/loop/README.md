# A looped broadcast

Rendering the flight live needs a graphics card around the clock. The cheap way to keep a stream up is to record a long stretch once, on a computer that has one, and have a small server replay the file to YouTube for ever.

## 1. Record it (OBS, on your own computer)

1. `npm start`, and leave it running.
2. In OBS add a **Browser** source: URL `http://localhost:8000/?stream=1&quality=high`, width 1920, height 1080, and tick **Control audio via OBS**.
3. Settings → Video: base and output 1920×1080, 30 frames a second.
4. Settings → Output → Output Mode **Advanced** → Recording:
   - Format **mkv** (a recording that is cut short can still be played)
   - Video encoder: the hardware H.264 one if there is one (Apple VT H264, NVENC, QuickSync), else x264
   - Rate control **CBR**, bitrate **6000** Kbps, keyframe interval **2 s**
   - Audio encoder AAC, 160 Kbps (Settings → Audio: 48 kHz, stereo)
5. Plug the computer in, stop it from sleeping, press **Start Recording**, and stop after about 12 hours. All 471 worlds take about 6 hours at the usual pace, so 12 hours shows each of them twice, with different songs. The file comes to about 33 GB.

The loop restarts with a hard cut, once every 12 hours. To hide it, stop the recording just as a portal is crossed.

## 2. Put it on the server

Any small Linux server (Ubuntu or Debian) with 80 GB of disk and a traffic allowance of 2 TB a month or more. Copy the file up (this can be resumed if it is interrupted):

```
rsync -P --inplace recording.mkv root@SERVER:/root/portals-loop.mkv
scp tools/loop/install.sh root@SERVER:/root/
```

## 3. Start the broadcast

In YouTube Studio → Go live → Stream, copy the stream key, and turn **Auto-stop** off so a short gap does not end the stream. Then on the server:

```
sudo bash /root/install.sh /root/portals-loop.mkv
```

It asks for the key and starts. From then on it restarts itself after a dropped connection or a reboot. To swap in a new recording: copy it up under the same name and `systemctl restart portals-stream`.
