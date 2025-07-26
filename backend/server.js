// server.js
import express from "express";
import axios from "axios";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";

dotenv.config();
const app = express();
app.use(bodyParser.json());
app.use(cors());

// ✅ Create HTTP server & attach Socket.IO
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// ✅ Load env variables
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

// ✅ Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB Atlas connected to KayaniBOT"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

/* ==============================
   📦 SCHEMAS & MODELS
================================*/
const contactSchema = new mongoose.Schema({
  wa_id: { type: String, required: true, unique: true },
  name: String,
  lastMessage: String,
  lastMessageAt: Date,
});
const Contact = mongoose.model("Contact", contactSchema);

const messageSchema = new mongoose.Schema({
  wa_id: String,
  text: String,
  type: String, // 'incoming' or 'outgoing'
  message_id: String,
  timestamp: Date,
  status: { type: String, default: "sent" }, // pending → sent → delivered → read
});
const Message = mongoose.model("Message", messageSchema);

/* ==============================
   📡 WEBHOOK VERIFICATION
================================*/
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

/* ==============================
   📤 SEND MESSAGE FUNCTION
================================*/
async function sendMessage(to, text) {
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: text },
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(`✅ WhatsApp API confirmed message to ${to}: "${text}"`);

    // ✅ return real message_id for tracking
    return response.data.messages?.[0]?.id;
  } catch (err) {
    console.error("❌ Error sending message:", err.response?.data || err.message);
    return null;
  }
}

/* ==============================
   📥 WEBHOOK HANDLER
================================*/
app.post("/webhook", async (req, res) => {
  const data = req.body;
  console.log("📩 Incoming Webhook:", JSON.stringify(data, null, 2));

  // ✅ Handle incoming messages
  if (data.entry && data.entry[0].changes[0].value.messages) {
    const message = data.entry[0].changes[0].value.messages[0];
    const contactInfo = data.entry[0].changes[0].value.contacts?.[0];

    // ⚠️ Ignore echo from our own WhatsApp number
    if (message.from === PHONE_NUMBER_ID) {
      console.log("⚠️ Ignored echo from our own number");
      return res.sendStatus(200);
    }

    const from = message.from;
    const name = contactInfo?.profile?.name || "Unknown";
    const text = message.text?.body || "";

    // ✅ Save/Update contact
    await Contact.findOneAndUpdate(
      { wa_id: from },
      { wa_id: from, name, lastMessage: text, lastMessageAt: new Date() },
      { upsert: true, new: true }
    );

    console.log(`💾 Contact saved/updated: ${name} (${from})`);

    // ✅ Save incoming message
    const savedMessage = await Message.create({
      wa_id: from,
      text,
      type: "incoming",
      message_id: message.id,
      timestamp: new Date(Number(message.timestamp) * 1000),
      status: "delivered",
    });

    // 🔥 Broadcast instantly
    io.emit("newMessage", savedMessage);

    console.log(`💬 Incoming message saved: "${text}"`);

    // ✅ Optional Auto-reply
    const replyId = await sendMessage(from, `Karibu Kayani Herbs 🌿\nUmesema: "${text}"`);
    if (replyId) {
      const replyMsg = await Message.create({
        wa_id: from,
        text: `Karibu Kayani Herbs 🌿\nUmesema: "${text}"`,
        type: "outgoing",
        message_id: replyId,
        timestamp: new Date(),
        status: "sent",
      });
      io.emit("newMessage", replyMsg);
    }

  // ✅ Handle status updates (sent/delivered/read)
  } else if (data.entry && data.entry[0].changes[0].value.statuses) {
    const statusUpdate = data.entry[0].changes[0].value.statuses[0];
    console.log("ℹ️ Status update:", statusUpdate.status);

    // ✅ Update DB
    await Message.findOneAndUpdate(
      { message_id: statusUpdate.id },
      { status: statusUpdate.status },
      { new: true }
    );

    // 🔥 Broadcast tick change to dashboard
    io.emit("messageStatusUpdate", {
      message_id: statusUpdate.id,
      status: statusUpdate.status,
    });
  }

  res.sendStatus(200);
});

/* ==============================
   📡 ADMIN DASHBOARD ROUTES
================================*/

// 📥 All contacts
app.get("/admin/contacts", async (req, res) => {
  const contacts = await Contact.find().sort({ lastMessageAt: -1 });
  res.json(contacts);
});

// 📥 Messages for one contact
app.get("/admin/messages/:wa_id", async (req, res) => {
  const messages = await Message.find({ wa_id: req.params.wa_id }).sort({ timestamp: 1 });
  res.json(messages);
});

// 📤 Send a message from admin dashboard
app.post("/admin/send", async (req, res) => {
  const { to, text } = req.body;

  // ✅ Create TEMP bubble
  const tempId = "temp-" + Date.now();
  const tempMessage = {
    wa_id: to,
    text,
    type: "outgoing",
    message_id: tempId,
    timestamp: new Date(),
    status: "pending",
  };

  // 🔥 Emit temp bubble to frontend
  io.emit("newMessage", tempMessage);

  // ✅ Save temp to DB
  await Message.create(tempMessage);

  // ✅ Send via WhatsApp API
  const realId = await sendMessage(to, text);

  if (realId) {
    // ✅ Replace temp with real message
    await Message.findOneAndUpdate(
      { message_id: tempId },
      { message_id: realId, status: "sent" },
      { new: true }
    );

    // 🔥 Tell frontend to swap temp bubble ID → real ID
    io.emit("replaceTempMessage", {
      tempId,
      realId,
      status: "sent",
    });

    console.log(`📤 Admin sent message to ${to}: "${text}"`);
    return res.json({ success: true });
  } else {
    return res.status(500).json({ success: false, error: "Failed to send" });
  }
});

/* ==============================
   🚀 SOCKET.IO CONNECTION
================================*/
io.on("connection", (socket) => {
  console.log("✅ Admin dashboard connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("❌ Admin dashboard disconnected:", socket.id);
  });
});

/* ==============================
   🚀 START SERVER
================================*/
server.listen(3000, () => {
  console.log("🚀 Server running on port 3000 with Socket.IO + Live Ticks");
});
