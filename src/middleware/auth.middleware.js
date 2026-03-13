const userModel = require("../models/user.model");
const jwt = require("jsonwebtoken");
const tokenblacklistModel = require("../models/blacklist.model");

async function authMiddleware(req, res, next) {
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  const isBlacklisted = await tokenblacklistModel.findOne({ token });

  if (isBlacklisted) {
    return res.status(401).json({
      message: "Unauthorized, token is blacklisted",
    });
  }

  try {
    const decode = jwt.verify(token, process.env.JWT_SECRET);

    const user = await userModel.findById(decode.userId);

    req.user = user;

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Unauthorized access, token is invalid",
    });
  }
}

async function authSystemUserMiddleware(req, res, next) {
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  const isBlacklisted = await tokenblacklistModel.findOne({ token });

  if (isBlacklisted) {
    return res.status(401).json({
      message: "Unauthorized, token is blacklisted",
    });
  }

  try {
    const decode = jwt.verify(token, process.env.JWT_SECRET);
    const user = await userModel.findById(decode.userId).select("+systemUser");

    if (!user.systemUser) {
      return res.status(403).json({
        message: "Forbidden, system user access only",
      });
    }

    req.user = user;

    return next();
  } catch (error) {
    return res.status(401).json({
      message: "Unauthorized access, token is invalid",
    });
  }
  next();
}
module.exports = {
  authMiddleware,
  authSystemUserMiddleware,
};
