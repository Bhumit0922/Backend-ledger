const userModel = require("../models/user.model");
const jwt = require("jsonwebtoken");

async function authMiddleware(req, res, next) {
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "Unauthorized",
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


module.exports = {
    authMiddleware
}