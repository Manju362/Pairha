const {
  default: makeWASocket,
  useMultiFileAuthState,
  delay,
  makeCacheableSignalKeyStore,
  Browsers,
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require("fs");

async function testPairing() {
  if (!fs.existsSync("./session")) {
    fs.mkdirSync("./session", { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState("./session");
  const socket = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
    },
    printQRInTerminal: false,
    logger: pino({ level: "fatal" }).child({ level: "fatal" }),
    browser: Browsers.macOS("Safari"),
  });

  const number = "+94768663255"; // Your phone number
  const cleanNumber = number.replace(/[^0-9]/g, "");
  const code = await socket.requestPairingCode(cleanNumber);
  console.log("Pairing code:", code);

  socket.ev.on("creds.update", saveCreds);
}

testPairing().catch(err => console.error("Error in testPairing:", err));
