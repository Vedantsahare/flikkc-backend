import Wallet from "../../models/Wallet.js";
import AdminPendingAction from "../../models/admin/AdminPendingAction.js";
import { logAdminAction } from "../../utils/admin/adminLogger.js";

/* =========================
   Request wallet adjustment
   (requires dual approval)
========================= */

export const adjustWallet = async (req, res) => {

  try {

    const { userId, amount, reason } = req.body;

    if (!userId || !amount || !reason) {
      return res.status(400).json({
        message: "userId, amount and reason required"
      });
    }

    const wallet = await Wallet.findOne({ userId });

    if (!wallet) {
      return res.status(404).json({
        message: "Wallet not found"
      });
    }

    if (typeof amount !== "number" || amount === 0) {
      return res.status(400).json({ 
        message: "Invalid amount" 
      });
    }


    const action = await AdminPendingAction.create({
      actionType: "WALLET_ADJUSTMENT",
      payload: { userId, amount, reason },
      requestedBy: req.user.id
    });

    await logAdminAction({
      adminId: req.user.id,
      action: "WALLET_ADJUST_REQUEST",
      targetType: "WALLET",
      targetId: wallet._id,
      details: { amount, reason },
      req
    });

    res.json({
      message: "Wallet adjustment pending approval",
      actionId: action._id
    });

  } catch (error) {

    console.error("Wallet adjustment error:", error);

    res.status(500).json({
      message: "Wallet adjustment failed"
    });

  }

};