import rateLimit from "express-rate-limit";

/**
 * Common safe key generator
 * - Uses user ID if available
 * - Falls back to IP (IPv6-safe)
 */
const generateKey = (req) => {
  if (req.user?.id) {
    return `user:${req.user.id}`;
  }

  return req.ip; // safe fallback (library handles IPv6)
};

/* =========================
   GLOBAL API LIMITER
========================= */

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,

  standardHeaders: true,
  legacyHeaders: false,

  keyGenerator: generateKey,
});

/* =========================
   PROFILE LIMITER
========================= */

export const profileLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,

  keyGenerator: generateKey,
});

/* =========================
   WALLET LIMITER (HIGH SECURITY)
========================= */

export const walletLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 3,

  keyGenerator: generateKey,
});

/* =========================
   IP BURST LIMITER
========================= */

export const ipLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,

  keyGenerator: (req) => req.ip,
});

/* =========================
   USER ACTION LIMITER
========================= */

export const userLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 50,

  keyGenerator: generateKey,
});