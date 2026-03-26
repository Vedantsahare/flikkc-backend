import redis from "./redisClient.js";
import Wallet from "../models/Wallet.js";

/**
 * Get wallet balance with Redis caching
 */
export const getWalletBalance = async (walletId) => {
  try {
    const cacheKey = `wallet:${walletId}`;

    // Check cache first
    const cached = await redis.get(cacheKey);
    if (cached !== null) {
      return Number(cached);
    }

    // Fetch from DB
    const wallet = await Wallet.findById(walletId);

    const balance = wallet?.balance || 0;

    // Cache for 60 seconds
    await redis.set(cacheKey, balance, "EX", 60);

    return balance;
  } catch (error) {
    console.error("getWalletBalance error:", error);
    return 0;
  }
};