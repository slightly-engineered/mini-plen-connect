# Mini PLEN Connect

Phone controller for the mini PLEN (RoBoHoN servos, ESP32 running MiniPlenFirmware).

**Open it:** https://slightly-engineered.github.io/mini-plen-connect/

- iPhone: open the link in **Bluefy** (Safari has no Web Bluetooth). Android: Chrome.
- Tap **Connect** and pick `RoBoHoN-C3`.
- Joystick: up/down walks forward/back, left/right turns, release to stop.
  Needs the walk motions in slots 70-73 (PLEN 1.4 `46`-`49`).
- Top row plays slots 1-3. **Slot** picks a slot (1-8, 70-73), **Play** plays it, **Upload** sends a PLEN 1.4 `.json` to it.

Source lives in `connect-app/` of
[mini-plen-robohon-servos](https://github.com/slightly-engineered/mini-plen-robohon-servos).
