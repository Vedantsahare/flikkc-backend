import User from "../../models/User.js";
import { logAdminAction } from "../../utils/admin/adminLogger.js";

/* =========================
   Get users (pagination)
========================= */

export const getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    const total = await User.countDocuments();

    const users = await User.find()
      .select("email country accountStatus kycStatus riskLevel createdAt")
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      users
    });

  } catch (error) {
    console.error("Fetch users error:", error);

    res.status(500).json({
      message: "Failed to fetch users"
    });
  }
};


/* =========================
   Freeze user
========================= */

export const freezeUser = async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    if (user.accountStatus === "FROZEN") {
      return res.status(400).json({
        message: "User already frozen"
      });
    }

    user.accountStatus = "FROZEN";
    user.freezeReason = reason || "Admin action";
    user.frozenAt = new Date();
    user.frozenBy = req.user.id;

    await user.save();

    await logAdminAction({
      adminId: req.user.id,
      action: "USER_FREEZE",
      targetType: "USER",
      targetId: user._id,
      details: { reason },
      req
    });

    res.json({
      message: "User account frozen"
    });

  } catch (error) {
    console.error("Freeze user error:", error);

    res.status(500).json({
      message: "Freeze failed"
    });
  }
};


/* =========================
   Unfreeze user
========================= */

export const unfreezeUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    if (user.accountStatus !== "FROZEN") {
      return res.status(400).json({
        message: "User is not frozen"
      });
    }

    user.accountStatus = "ACTIVE";
    user.freezeReason = null;
    user.frozenAt = null;
    user.frozenBy = null;

    await user.save();

    await logAdminAction({
      adminId: req.user.id,
      action: "USER_UNFREEZE",
      targetType: "USER",
      targetId: user._id,
      req
    });

    res.json({
      message: "User account unfrozen"
    });

  } catch (error) {
    console.error("Unfreeze user error:", error);

    res.status(500).json({
      message: "Unfreeze failed"
    });
  }
};