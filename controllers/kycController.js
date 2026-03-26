import User from "../models/User.js";
import Kyc from "../models/KYC.js";
import Otp from "../models/Otp.js";

import { generateOtp } from "../utils/generateOtp.js";
import validatePan from "../utils/panValidator.js";
import validateAadhaar from "../utils/aadhaarValidator.js";


export const sendPhoneOtp = async (req, res) => {

  try {

    const { phone } = req.body;

    const otp = generateOtp();
    const expiry = new Date(Date.now() + 5 * 60 * 1000);

    await Otp.deleteMany({ phone });

    await Otp.create({
      phone,
      otp,
      expiresAt: expiry
    });

    res.json({
      success: true,
      message: "OTP sent"
    });

  } catch (error) {

    res.status(500).json({
      message: "Failed to send OTP"
    });

  }

};


export const verifyPhoneOtp = async (req, res) => {

  try {

    const { phone, otp } = req.body;

    const record = await Otp.findOne({ phone });

    if (!record)
      return res.status(400).json({ message: "OTP not found" });

    if (record.expiresAt < Date.now())
      return res.status(400).json({ message: "OTP expired" });

    if (record.otp !== otp)
      return res.status(400).json({ message: "Invalid OTP" });

    const user = await User.findById(req.user.id);

    user.phoneNumber = phone;
    user.phoneVerified = true;
    user.kycStatus = "phone_verified";

    await user.save();

    await Otp.deleteMany({ phone });

    res.json({
      success: true,
      message: "Phone verified"
    });

  } catch (error) {

    res.status(500).json({
      message: "Verification error"
    });

  }

};


export const submitPan = async (req, res) => {

  try {

    const { panNumber, panName } = req.body;

    if (!validatePan(panNumber))
      return res.status(400).json({ message: "Invalid PAN" });

    let kyc = await Kyc.findOne({ userId: req.user.id });

    if (!kyc) {

      kyc = await Kyc.create({
        userId: req.user.id
      });

    }

    kyc.panNumber = panNumber;
    kyc.panName = panName;
    kyc.panVerified = true;

    await kyc.save();

    const user = await User.findById(req.user.id);

    user.kycId = kyc._id;
    user.kycStatus = "pan_verified";

    await user.save();

    res.json({
      success: true
    });

  } catch (error) {

    res.status(500).json({
      message: "PAN submission failed"
    });

  }

};


export const submitAadhaar = async (req, res) => {

  try {

    const { aadhaarNumber } = req.body;

    if (!validateAadhaar(aadhaarNumber))
      return res.status(400).json({ message: "Invalid Aadhaar" });

    const kyc = await Kyc.findOne({ userId: req.user.id });

    kyc.aadhaarNumber = aadhaarNumber;
    kyc.aadhaarVerified = true;

    await kyc.save();

    const user = await User.findById(req.user.id);

    user.kycStatus = "aadhaar_verified";

    await user.save();

    res.json({
      success: true
    });

  } catch (error) {

    res.status(500).json({
      message: "Aadhaar verification failed"
    });

  }

};


export const enableWithdrawal = async (req, res) => {

  try {

    const kyc = await Kyc.findOne({ userId: req.user.id });

    if (!kyc.panVerified || !kyc.aadhaarVerified)
      return res.status(400).json({
        message: "Complete KYC first"
      });

    kyc.withdrawalEnabled = true;
    kyc.verifiedAt = new Date();

    await kyc.save();

    const user = await User.findById(req.user.id);

    user.kycStatus = "verified";

    await user.save();

    res.json({
      success: true,
      message: "Withdrawal enabled"
    });

  } catch (error) {

    res.status(500).json({
      message: "Unable to enable withdrawal"
    });

  }

};