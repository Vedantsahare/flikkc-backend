import User from "../../models/User.js";
import { logAdminAction } from "../../utils/admin/adminLogger.js";

async (req, res) => {

  try {

    const { userId } = req.params;
    const { reason } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    if (!reason) {
      return res.status(400).json({
        message: "Freeze reason required"
      });
    }

    user.accountStatus = "FROZEN";
    user.frozenAt = new Date();
    user.frozenBy = req.user.id;
    user.freezeReason = reason || "Admin action";

    await user.save();

    await logAdminAction({
      adminId: req.user.id,
      action: "FREEZE_USER",
      targetType: "USER",
      targetId: userId,
      details: { email: user.email, reason },
      req
    });

    return res.json({
      message: "User account frozen"
    });

  } catch (error) {

    console.error("Freeze user error:", error);

    return res.status(500).json({
      message: "Failed to freeze user"
    });

  }

};