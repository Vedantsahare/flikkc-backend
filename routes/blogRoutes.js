import express from "express";
import {
  createBlog,
  getBlogs,
  getBlogBySlug,
  deleteBlog,
} from "../controllers/blogController.js";

import auth from "../middleware/auth.js";
import { roleGuard } from "../middleware/roleGuard.js";

const router = express.Router();

/* PUBLIC */
router.get("/", getBlogs);
router.get("/:slug", getBlogBySlug);

/* ADMIN */
router.post("/", auth, roleGuard("ADMIN"), createBlog);
router.delete("/:id", auth, roleGuard("ADMIN"), deleteBlog);

export default router;