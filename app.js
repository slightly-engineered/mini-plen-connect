// Nordic UART UUIDs
const NUS_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const NUS_RX_UUID      = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
const NUS_TX_UUID      = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";

let rxChar = null;

const logEl = document.getElementById("log");
const statusLine = document.getElementById("statusLine");
const statusDot = document.getElementById("statusDot");

// Full log (hidden, for desktop debugging) + latest line on screen
function log(...args) {
  const line = args.join(" ");
  logEl.textContent += line + "\n";
  statusLine.textContent = line;
}

// ------------------------------------------------------------
// CONNECT
// ------------------------------------------------------------
async function connect() {
  try {
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: "RoBoHoN-C3" }],
      optionalServices: [NUS_SERVICE_UUID]
    });

    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(NUS_SERVICE_UUID);

    rxChar = await service.getCharacteristic(NUS_RX_UUID);
    const txChar = await service.getCharacteristic(NUS_TX_UUID);

    await txChar.startNotifications();
    txChar.addEventListener("characteristicvaluechanged", e => {
      const text = new TextDecoder().decode(e.target.value);
      log("RX:", text.trim());
    });

    statusDot.classList.remove("gray");
    statusDot.classList.add("green");
    log("Connected");
  } catch (err) {
    log("Connect error:", err);
  }
}

// ------------------------------------------------------------
// BLE WRITES, one at a time (Web Bluetooth rejects a write while
// another is still in progress, e.g. joystick moves during an upload)
// ------------------------------------------------------------
let writeChain = Promise.resolve();

function bleWrite(text) {
  const bytes = new TextEncoder().encode(text);
  const done = writeChain.then(() => rxChar.writeValue(bytes));
  writeChain = done.catch(err => log("Write error:", err));
  return done;
}

// ------------------------------------------------------------
// SEND JSON COMMAND
// ------------------------------------------------------------
async function sendJson(obj) {
  if (!rxChar) return log("Not connected");
  const line = JSON.stringify(obj) + "\n";
  await bleWrite(line);
  log("TX:", line.trim());
}

// ------------------------------------------------------------
// PLAY BUTTONS (top row, fixed slots)
// ------------------------------------------------------------
document.querySelectorAll(".icon-btn[data-slot]").forEach(btn => {
  btn.onclick = () => {
    const slot = Number(btn.dataset.slot);
    sendJson({ cmd: "play", slot });
  };
});

// ------------------------------------------------------------
// SLOT PICKER + PLAY
// ------------------------------------------------------------
const slotSelect = document.getElementById("motionSlot");
const slotLabel = document.getElementById("slotLabel");

slotSelect.onchange = () => { slotLabel.textContent = slotSelect.value; };

document.getElementById("playSlot").onclick = () => {
  sendJson({ cmd: "play", slot: Number(slotSelect.value) });
};

// ------------------------------------------------------------
// MOTION UPLOAD
// ------------------------------------------------------------
async function uploadMotionToRobot(slot, jsonText) {
  if (!rxChar) return log("Not connected");

  const CHUNK = 150;

  log(`Starting upload to slot ${slot}...`);

  // Start upload
  await bleWrite(`UPLOAD ${slot}\n`);

  // Send JSON in chunks
  for (let i = 0; i < jsonText.length; i += CHUNK) {
    const chunk = jsonText.slice(i, i + CHUNK);
    await bleWrite(chunk);
    const pct = Math.round(Math.min(100, (i + CHUNK) / jsonText.length * 100));
    log(`Uploading to slot ${slot}... ${pct}%`);
  }

  // End upload
  await bleWrite("\nEND\n");

  log(`Upload to slot ${slot} sent`);
}

// Upload: pick a .json file, it goes straight to the chosen slot
const fileInput = document.getElementById("motionFile");

document.getElementById("uploadMotion").onclick = () => {
  if (!rxChar) return log("Not connected");
  fileInput.click();
};

fileInput.onchange = async () => {
  if (!fileInput.files.length) return;
  const file = fileInput.files[0];
  const slot = Number(slotSelect.value);
  log(`${file.name} -> slot ${slot}`);
  await uploadMotionToRobot(slot, await file.text());
  fileInput.value = "";   // allow picking the same file again
};

// ------------------------------------------------------------
// WALK JOYSTICK (look and feel from the pan-tilt tripod page)
// Up/down = walk forward/back, left/right = turn. The firmware keeps
// walking while the same direction repeats, finishes the stride when it
// changes, and plays the stopping steps on "stop" (stick released).
// ------------------------------------------------------------
const joyArea = document.getElementById("joyArea");
const stick = document.getElementById("stick");

const DEAD_ZONE = 0.35;        // stick travel (0..1) before a walk starts
const RESEND_MS = 500;         // repeat the direction in case a write is lost

let walkDir = "stop";
let joyHeld = false;

function stickDirection(x, y) {
  if (Math.max(Math.abs(x), Math.abs(y)) < DEAD_ZONE) return "stop";
  if (Math.abs(y) >= Math.abs(x)) return y < 0 ? "forward" : "back";
  return x < 0 ? "left" : "right";
}

function setWalk(dir) {
  if (dir === walkDir) return;
  walkDir = dir;
  sendJson({ cmd: "walk", dir });
}

setInterval(() => {
  if (joyHeld && walkDir !== "stop") sendJson({ cmd: "walk", dir: walkDir });
}, RESEND_MS);

// x, y in -1..1; the stick's centre travels one third of the pad
function updateStick(x, y) {
  stick.style.left = (34.67 + x * 33.33) + "%";
  stick.style.top  = (34.67 + y * 33.33) + "%";
}

function handleMove(evt) {
  const rect = joyArea.getBoundingClientRect();
  const travel = rect.width / 3;

  let x = (evt.clientX - (rect.left + rect.width / 2)) / travel;
  let y = (evt.clientY - (rect.top + rect.height / 2)) / travel;

  // Clamp
  x = Math.max(-1, Math.min(1, x));
  y = Math.max(-1, Math.min(1, y));

  updateStick(x, y);
  setWalk(stickDirection(x, y));
}

function resetStick() {
  joyHeld = false;
  updateStick(0, 0);
  setWalk("stop");
}

joyArea.addEventListener("pointerdown", (e) => {
  joyHeld = true;
  joyArea.setPointerCapture(e.pointerId);
  handleMove(e);
});
joyArea.addEventListener("pointermove", (e) => {
  if (joyHeld) handleMove(e);
});
joyArea.addEventListener("pointerup", resetStick);
joyArea.addEventListener("pointercancel", resetStick);

// ------------------------------------------------------------
// FOOTER BUTTONS
// ------------------------------------------------------------
document.getElementById("connect").onclick = connect;

document.getElementById("advanced").onclick = () =>
  window.location.href = "../motion-editor/index.html";
