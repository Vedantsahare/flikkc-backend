import Event from "../models/Event.js";
import Leaderboard from "../models/Leaderboard.js";
import { processWalletTransaction } from "../services/walletservice.js";

/**
 * Distribute prizes for an event
 */
export const distributePrizes = async (eventId) => {
  try {
    const event = await Event.findById(eventId);

    if (!event) throw new Error("Event not found");
    if (event.prizesDistributed) throw new Error("Already distributed");

    const leaderboard = await Leaderboard.find({ eventId }).sort({ score: -1 });

    if (!leaderboard.length) throw new Error("No entries");

    const winners = leaderboard.slice(0, event.maxWinners);

    if (!winners.length) throw new Error("No winners");

    const prizePerWinner = event.prizePool / winners.length;

    // Distribute prizes
    await Promise.all(
      winners.map((winner) =>
        processWalletTransaction({
          userId: winner.userId,
          type: "credit",
          amount: prizePerWinner,
          description: "Event prize payout",
          source: "event",
        })
      )
    );

    // Mark event as completed
    event.prizesDistributed = true;
    await event.save();

    return {
      success: true,
      winners,
      prizePerWinner,
    };
  } catch (error) {
    console.error("distributePrizes error:", error);
    throw error;
  }
};