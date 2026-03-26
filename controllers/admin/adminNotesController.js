import AdminNote from "../../models/admin/AdminNote.js";
import User from "../../models/User.js";

/* =========================
   Add admin note
========================= */

export const addAdminNote = async (req, res) => {

  try {

    const { userId, note } = req.body;

    if (!userId || !note) {
      return res.status(400).json({
        message: "userId and note required"
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    const newNote = await AdminNote.create({
      userId,
      adminId: req.user.id,
      note
    });

    res.json(newNote);

  } catch (error) {

    console.error("Add note error:", error);

    res.status(500).json({
      message: "Failed to add note"
    });

  }

};


/* =========================
   Get notes
========================= */

export const getAdminNotes = async (req, res) => {

  try {

    const { userId } = req.params;

    const notes = await AdminNote.find({ userId })
      .populate("adminId", "email")
      .sort({ createdAt: -1 });

    res.json(notes);

  } catch (error) {

    console.error("Fetch notes error:", error);

    res.status(500).json({
      message: "Failed to fetch notes"
    });

  }

};