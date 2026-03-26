import AdminPendingAction from "../../models/admin/AdminPendingAction.js";
import { executeAdminAction } from "../../utils/admin/adminActionExecutor.js";
import { logAdminAction } from "../../utils/admin/adminLogger.js";


/* =========================
   Get all pending actions
========================= */

export const getPendingActions = async (req, res) => {

  try {

    const actions = await AdminPendingAction.find({
      status: "PENDING"
    })
      .populate("requestedBy", "email role")
      .sort({ createdAt: -1 });

    res.json(actions);

  } catch (error) {

    console.error("Fetch pending actions error:", error);

    res.status(500).json({
      message: "Server error"
    });

  }

};


/* =========================
   Approve pending action
========================= */

export const approvePendingAction = async (req, res) => {

  try {

    const { actionId } = req.params;

    const action = await AdminPendingAction.findById(actionId);

    if (!action) {
      return res.status(404).json({
        message: "Action not found"
      });
    }

    if (action.status !== "PENDING") {
      return res.status(400).json({
        message: "Action already resolved"
      });
    }

    /* Prevent self approval */

    if (String(action.requestedBy) === String(req.user.id)) {
      return res.status(403).json({
        message: "You cannot approve your own request"
      });
    }

    /* Prevent duplicate approval */

    if (action.approvedBy.includes(req.user.id)) {
      return res.status(400).json({
        message: "You already approved this action"
      });
    }

    action.approvedBy.push(req.user.id);

    /* Dual approval check */

    if (action.approvedBy.length >= 2) {

      await executeAdminAction(action);

      action.status = "EXECUTED";

    }

    if (action.approvedBy.length >= 2 && action.status === "PENDING") {
      action.status = "EXECUTING"; // temporary lock 
      await action.save();
      await executeAdminAction(action);
      action.status = "EXECUTED";
    }

    await action.save();

    await logAdminAction({
      adminId: req.user.id,
      action: "APPROVE_PENDING_ACTION",
      targetType: "SYSTEM",
      targetId: action._id,
      req
    });

    res.json({
      message: "Approval recorded",
      status: action.status,
      approvals: action.approvedBy.length
    });

  } catch (error) {

    console.error("Approve action error:", error);

    res.status(500).json({
      message: "Server error"
    });

  }

};