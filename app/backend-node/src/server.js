/**
 * Cascade - Node.js gateway
 * Auth: email/password (bcrypt) AND Google Sign-In, both issue the same
 * JWT format that FastAPI verifies - so nothing downstream cares which
 * method a person used to log in.
 */
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { OAuth2Client } = require("google-auth-library");
const { WebSocketServer } = require("ws");
const http = require("http");

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// In-memory user store - swap for a real DB table for production use.
// Google-authenticated users get a random unusable password hash, since
// they never set one - they always come back through Google.
const users = [];

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "node-gateway" });
});

app.post("/auth/signup", async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "email and password required" });
  }
  if (users.find((u) => u.email === email)) {
    return res.status(409).json({ error: "user already exists" });
  }
  const hashed = await bcrypt.hash(password, 10);
  users.push({ email, password: hashed, provider: "password", name: name || "" });
  res.status(201).json({ message: "signup successful" });
});

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const user = users.find((u) => u.email === email);
  if (!user || user.provider !== "password" || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: "invalid credentials" });
  }
  const token = jwt.sign({ email, name: user.name || "" }, JWT_SECRET, { expiresIn: "24h" });
  res.json({ token });
});

app.post("/auth/google", async (req, res) => {
  const { credential } = req.body;
  if (!credential) {
    return res.status(400).json({ error: "missing Google credential" });
  }
  if (!GOOGLE_CLIENT_ID) {
    return res.status(500).json({ error: "Google sign-in is not configured on this server" });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const email = payload.email;
    const googleName = payload.name || payload.given_name || "";

    if (!email) {
      return res.status(400).json({ error: "Google account has no email" });
    }

    let user = users.find((u) => u.email === email);
    if (!user) {
      // First time this Google account has been seen - auto-provision it,
      // using the real name Google already verified for us.
      const randomHash = await bcrypt.hash(require("crypto").randomUUID(), 10);
      user = { email, password: randomHash, provider: "google", name: googleName };
      users.push(user);
    } else if (googleName && !user.name) {
      // Backfill a missing name if we didn't have one before.
      user.name = googleName;
    }

    const token = jwt.sign({ email, name: user.name || "" }, JWT_SECRET, { expiresIn: "24h" });
    res.json({ token });
  } catch (err) {
    res.status(401).json({ error: "invalid Google credential" });
  }
});

// --- WebSocket relay setup ---
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws/traces" });

wss.on("connection", (ws) => {
  ws.send(JSON.stringify({ event: "connected", message: "trace relay ready" }));
  ws.on("close", () => {});
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Node gateway listening on port ${PORT}`);
});
