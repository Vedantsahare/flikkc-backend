import AdminAuditLog from "../models/admin/AdminAuditLog.js";

export const getAuditLogs = async (req, res) => {

  try {

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    const filter = {};

    if (req.query.adminId) {
      filter.adminId = req.query.adminId;
    }

    if (req.query.action) {
      filter.action = req.query.action;
    }

    const total = await AdminAuditLog.countDocuments(filter);

    const logs = await AdminAuditLog.find(filter)
      .populate("adminId", "email role")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      logs
    });

  } catch (error) {

    console.error("Audit log fetch error:", error);

    res.status(500).json({
      message: "Failed to fetch logs"
    });

  }

};