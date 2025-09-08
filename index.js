
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import cors from "cors";
import bodyParser from "body-parser";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ✅ MongoDB connection
mongoose
  .connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err.message));

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

// ✅ Test transporter connection (startup par check karega)
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Email transporter error:", error);
  } else {
    console.log("✅ Email transporter is ready");
  }
});

// ✅ Contact Route
app.post("/contact", async (req, res) => {
  console.log("📩 Incoming Contact Request:", req.body);

  try {
    const { name, email, phone, message } = req.body;

    if (!name || !email || !message) {
      console.warn("⚠️ Missing required fields");
      return res.status(400).json({ success: false, message: "Name, Email, and Message are required." });
    }

    // Save to DB
    const newContact = new Contact({ name, email, phone, message });
    await newContact.save();
    console.log("✅ Contact saved to DB:", newContact);

    // Send email
    const mailOptions = {
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
    };

    await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully");

    res.json({ success: true, message: "✅ Form submitted successfully!" });
  } catch (err) {
    console.error("❌ Error in /contact route:", err.stack || err);
    res.status(500).json({ success: false, message: "❌ Error submitting form", error: err.message });
  }
});

// ✅ Health Route (Live Check)
app.get("/ping", (req, res) => {
  res.json({
    success: true,
    message: "🚀 Backend is live!",
    mongo: mongoose.connection.readyState === 1 ? "✅ Connected" : "❌ Not Connected",
    email: transporter ? "✅ Email Config Loaded" : "❌ Email Not Ready",
  });
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

