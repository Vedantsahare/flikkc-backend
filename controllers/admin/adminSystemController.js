import SystemSettings from "../../models/SystemSettings.js";
import { logAdminAction } from "../../utils/admin/adminLogger.js";

/* =========================
   Update system status
========================= */

export const updateSystemStatus = async (req, res) => {

  try {

    const {
      withdrawalsPaused,
      gameplayPaused,
      walletPaused,
      reason
    } = req.body;

    let settings = await SystemSettings.findOne();

    if (!settings) {
      settings = await SystemSettings.create({});
    }


    if (typeof withdrawalsPaused !== "boolean") {
      return res.status(400).json({ message: "Invalid input" });
    }

    
    settings.withdrawalsPaused = withdrawalsPaused;
    settings.gameplayPaused = gameplayPaused;
    settings.walletPaused = walletPaused;
    settings.reason = reason || "System update";
    settings.updatedBy = req.user.id;

    await settings.save();

    await logAdminAction({
      adminId: req.user.id,
      action: "SYSTEM_UPDATE",
      targetType: "SYSTEM",
      targetId: settings._id,
      req
    });

    res.json(settings);

  } catch (error) {

    console.error("System update error:", error);

    res.status(500).json({
      message: "System update failed"
    });

  }

};