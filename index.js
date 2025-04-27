const express = require("express");
const app = express();
const path = require("path");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  delay,
  makeCacheableSignalKeyStore,
  Browsers,
  jidNormalizedUser,
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require("fs");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve the pair.html file
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "pair.html"));
});

// Pairing endpoint
app.get("/generate-code", async (req, res) => {
  const number = req.query.number;

  if (!number || number.replace(/[^0-9]/g, "").length < 10) {
    return res.status(400).json({ error: "Invalid phone number. Please include country code (e.g., +94712345678)." });
  }

  try {
    // Create session folder if it doesn't exist
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

    if (!socket.authState.creds.registered) {
      await delay(1500);
      const cleanNumber = number.replace(/[^0-9]/g, "");
      const code = await socket.requestPairingCode(cleanNumber);
      socket.ev.on("creds.update", saveCreds);

      // Send the pairing code to the user
      res.json({ code: code || "Service Unavailable" });

      // Clean up session after pairing
      socket.ev.on("connection.update", async (update) => {
        const { connection } = update;
        if (connection === "open") {
          await delay(5000);
          if (fs.existsSync("./session")) {
            fs.rmSync("./session", { recursive: true, force: true });
          }
          socket.end();
        }
      });
    } else {
      res.json({ error: "Session already registered." });
    }
  } catch (err) {
    console.error("Error generating pairing code:", err);
    res.status(500).json({ error: "Service Unavailable" });
  }
});

// Start the server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
