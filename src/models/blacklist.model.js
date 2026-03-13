const mongoose = require("mongoose");

const tokenBlacklistSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: [true, "Token is required to be blacklisted"],
      unique: [true, "Token is already blacklisted"],
    },
  },
  {
    timestamps: true,
  },
);

tokenBlacklistSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 3 },
); // Expire after 3 days

const TokenBlacklistModel = mongoose.model("TokenBlacklist", tokenBlacklistSchema);

module.exports = TokenBlacklistModel;
