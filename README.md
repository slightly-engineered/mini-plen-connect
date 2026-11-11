# Mini PLEN Connect

Phone controller for the mini PLEN (RoBoHoN servos, ESP32 running MiniPlenFirmware).

**Open it:** https://slightly-engineered.github.io/mini-plen-connect/

- iPhone: open the link in **Bluefy** (Safari has no Web Bluetooth). Android: Chrome.
- Tap **Connect** and pick `RoBoHoN-C3`.
- Joystick: up/down walks forward/back, left/right turns, release to stop.
  Needs the walk motions in slots 70-73 (PLEN 1.4 `46`-`49`).
- Buttons play slots 1-8. Upload a PLEN 1.4 `.json` motion to any slot below them.

Source lives in `connect-app/` of
[mini-plen-robohon-servos](https://github.com/slightly-engineered/mini-plen-robohon-servos).
