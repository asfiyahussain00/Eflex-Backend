import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import cors from "cors";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json()); // body parser

// ✅ MongoDB connection
let mongoStatus = "❌ Not Connected";
mongoose
  .connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 })
  .then(() => {
    console.log("✅ MongoDB connected");
    mongoStatus = "✅ Connected";
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    mongoStatus = "❌ Connection Failed: " + err.message;
  });

// ✅ Contact Schema & Model
const contactSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  message: String,
});
const Contact = mongoose.model("Contact", contactSchema);

// ✅ Nodemailer Transporter
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // SSL
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

let emailStatus = "❌ Not Ready";
transporter.verify((error) => {
  if (error) {
    console.error("❌ Email transporter error:", error);
    emailStatus = "❌ Email Error: " + error.message;
  } else {
    console.log("✅ Email transporter is ready");
    emailStatus = "✅ Ready";
  }
});

// ✅ Contact Route
app.post("/contact", async (req, res) => {
  console.log("📩 Incoming Contact Request:", req.body);

  try {
    const { name, email, phone, message } = req.body;

    if (!name || !email || !message) {
      console.warn("⚠️ Missing required fields");
      return res
        .status(400)
        .json({ success: false, message: "Name, Email, and Message are required." });
    }

    // Save to DB
    const newContact = new Contact({ name, email, phone, message });
    await newContact.save();
    console.log("✅ Contact saved to DB:", newContact);

    // Send email
    await transporter.sendMail({
      from: `"Eflex Solution" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: "📩 New Contact Form Submission",
      html: `
        <h3>New Contact Request</h3>
        <p><b>Name:</b> ${name}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Phone:</b> ${phone}</p>
        <p><b>Message:</b> ${message}</p>
      `,
    });

    console.log("✅ Email sent successfully");
    res.json({ success: true, message: "✅ Form submitted successfully!" });
  } catch (err) {
    console.error("❌ Error in /contact route:", err.stack || err);
    res.status(500).json({ success: false, message: "❌ Error submitting form", error: err.message });
  }
});

// ✅ Health Check Route
app.get("/ping", (req, res) => {
  res.json({
    success: true,
    message: "🚀 Backend is live!",
    mongo: mongoStatus,
    email: emailStatus,
  });
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
