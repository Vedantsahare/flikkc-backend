import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

import sendOtp from "../utils/sendOtp.js";
import redis from "../utils/redisClient.js";
import fingerprint from "../utils/deviceFingerprint.js";

import Device from "../models/Device.js";
import UserFingerprint from "../models/UserFingerprint.js";

import calculateRisk from "../utils/riskScore.js";
import { generateOtp } from "../utils/generateOtp.js";
import { runFraudChecks } from "../utils/advancedFraudEngine.js";

/* ================= REGISTER ================= */
export const register = async (req, res) => {
  const { email, password, phoneNumber, country } = req.body;

  const exists = await User.findOne({ email });
  if (exists) return res.status(400).json({ message: "User exists" });

  const hashed = await bcrypt.hash(password, 10);

  await User.create({
    email,
    password: hashed,
    phoneNumber,
    country
  });

  res.status(201).json({ success: true });
};

/* ================= LOGIN ================= */
export const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");
  if (!user) return res.status(400).json({ message: "Invalid credentials" });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ message: "Invalid credentials" });

  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict"
  });

  res.json({ success: true, token });
};

/* ================= SEND OTP ================= */
export const sendOtpLogin = async (req, res) => {
  const { phone, deviceData } = req.body;

  const user = await User.findOne({ phoneNumber: phone });
  if (!user) return res.status(404).json({ message: "User not found" });

  const deviceId = fingerprint(deviceData || {});
  const ip = req.ip;

  const cooldownKey = `otp:cooldown:${phone}`;
  if (await redis.get(cooldownKey)) {
    return res.status(429).json({ message: "Wait before requesting OTP" });
  }

  const otp = generateOtp();
  const hash = crypto.createHash("sha256").update(otp).digest("hex");

  const payload = JSON.stringify({
    hash,
    deviceId,
    ip
  });

  await redis.set(`otp:${phone}`, payload, "EX", 300);
  await redis.set(`otp:attempts:${phone}`, 0, "EX", 300);
  await redis.set(cooldownKey, "1", "EX", 60);

  await sendOtp(phone, otp);

  res.json({ success: true });
};

/* ================= VERIFY OTP ================= */
export const verifyOtpLogin = async (req, res) => {
  const { phone, otp, deviceData } = req.body;

  const redisData = await redis.get(`otp:${phone}`);
  if (!redisData) {
    return res.status(400).json({ message: "OTP expired" });
  }

  const attemptsKey = `otp:attempts:${phone}`;
  const attempts = parseInt(await redis.get(attemptsKey)) || 0;

  if (attempts >= 5) {
    return res.status(429).json({ message: "Too many attempts" });
  }

  const { hash, deviceId, ip } = JSON.parse(redisData);

  const incomingDevice = fingerprint(deviceData || {});
  const incomingIP = req.ip;

  let flags = [];

  if (deviceId !== incomingDevice) flags.push("duplicate_device");
  if (ip !== incomingIP) flags.push("suspicious_ip");

  const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

  if (otpHash !== hash) {
    await redis.incr(attemptsKey);
    return res.status(400).json({ message: `Invalid OTP (${attempts + 1}/5)` });
  }

  /* ================= USER ================= */
  const user = await User.findOne({ phoneNumber: phone });

  /* ================= DEVICE TRACK ================= */
  await Device.updateOne(
    { fingerprint: incomingDevice },
    {
      userId: user._id,
      ip: incomingIP,
      userAgent: req.headers["user-agent"]
    },
    { upsert: true }
  );

  await UserFingerprint.updateOne(
    { userId: user._id, deviceHash: incomingDevice },
    {
      ipAddress: incomingIP,
      userAgent: req.headers["user-agent"],
      lastSeenAt: new Date()
    },
    { upsert: true }
  );

  /* ================= FRAUD ENGINE ================= */
  const fraud = await runFraudChecks(user._id);

  if (fraud.riskLevel === "HIGH") {
    flags.push("high_risk_user");
  }

  /* ================= RISK SCORE ================= */
  const riskScore = calculateRisk(flags);

  user.riskScore = riskScore;

  if (riskScore > 80) {
    user.withdrawalBlocked = true;
  }

  await user.save();

  /* ================= CLEAN REDIS ================= */
  await redis.del(`otp:${phone}`);
  await redis.del(attemptsKey);

  /* ================= TOKEN ================= */
  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict"
  });

  res.json({
    success: true,
    token,
    riskScore,
    flags
  });
};

/* ================= PASSWORD RESET ================= */
export const requestPasswordReset = async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    return res.json({ message: "If email exists, link sent" });
  }

  const token = crypto.randomBytes(32).toString("hex");

  user.resetToken = token;
  user.resetTokenExpires = Date.now() + 3600000;

  await user.save();

  res.json({ success: true });
};

/* ================= LOGOUT ================= */
export const logout = (req, res) => {
  res.clearCookie("token");
  res.json({ success: true });
};

/* ================= ACCEPT LEGAL ================= */
export const acceptLegal = async (req, res) => {
  try {
    const userId = req.user.id;

    await User.findByIdAndUpdate(userId, {
      legalAccepted: true,
      legalAcceptedAt: new Date(),
    });

    res.json({ message: "Legal accepted successfully" });
  } catch (error) {
    console.error("acceptLegal error:", error);
    res.status(500).json({ message: "Server error" });
  }
};