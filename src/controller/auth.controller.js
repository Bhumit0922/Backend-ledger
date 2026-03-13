const userModel = require("../models/user.model");
const jwt = require("jsonwebtoken");
const sendEmail = require("../services/email.services");
const TokenBlacklistModel = require("../models/blacklist.model");

/**
 *  - user register controller
 *  - POST /api/auth/register
 */
async function userRegisterController(req, res) {
  const { email, name, password } = req.body;

  const isExists = await userModel.findOne({ email: email });

  if (isExists) {
    return res.status(422).json({
      message: "Email already exists",
      status: "failed",
    });
  }

  const user = await userModel.create({
    email,
    password,
    name,
  });

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  res.cookie("token", token);
  res.status(201).json({
    user: {
      _id: user._id,
      email: user.email,
      name: user.name,
    },
    token,
  });

  await sendEmail.sendRegisterEmail(user.email, user.name);
}

/**
 *  - user login controller
 *  - POST /api/auth/login
 */

async function userLoginController(req, res) {
  const { email, password } = req.body;

  const user = await userModel.findOne({ email }).select("+password");

  if (!user) {
    return res.status(401).json({
      message: "Invalid email or password",
      status: "failed",
    });
  }

  const isValidPassword = await user.comparePassword(password);

  if (!isValidPassword) {
    return res.status(401).json({
      message: "Invalid password",
      status: "failed",
    });
  }

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  res.cookie("token", token);
  res.status(200).json({
    user: {
      _id: user._id,
      email: user.email,
      name: user.name,
    },
    token,
  });
}

/**
 *  - user logOut controller
 *  - POST /api/auth/logout
 */

async function userLogoutController(req, res) {
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "No token provided",
    });
  }

  await TokenBlacklistModel.create({ token: token });

  res.clearCookie("token");

  res.status(200).json({
    message: "User Logged out successfully",
  });
}
module.exports = {
  userRegisterController,
  userLoginController,
  userLogoutController,
};
