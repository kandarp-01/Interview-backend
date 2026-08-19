const { mongo } = require("mongoose");
const userModel = require("../models/user.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const redisClient = require("../db/redis");

async function registerUser(req, res) {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({
      message: "All fields are required",
    });
  }
  const isExist = await userModel.findOne({
    $or: [{ username }, { email }],
  });
  if (isExist) {
    return res.status(400).json({
      message: "username or email already exist",
    });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await userModel.create({
    username,
    email,
    password: hashedPassword,
  });
  res.status(201).json({
    message: "user registered successfully",
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
    },
  });
}

async function loginUser(req, res) {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({
      message: "all fields are required",
    });
  }
  const isExist = await userModel
    .findOne({
      $or: [{ username }, { email: username }],
    })
    .select("+password");
  if (!isExist) {
    return res.status(400).json({
      message: "Invalid username/email or password",
    });
  }
  const isValid = await bcrypt.compare(password, isExist.password);
  if (!isValid) {
    return res.status(400).json({
      message: "Invalid username/email or password",
    });
  }
  const jti = uuidv4();
  const token = jwt.sign({ _id: isExist._id, jti }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });
  await redisClient.hSet(`session:${jti}`, {
    userId: isExist._id.toString(),
    email: isExist.email,
    username: isExist.username,
  });
  await redisClient.expire(`session:${jti}`, 60 * 60 * 24);
  res.cookie("token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 24 * 60 * 60 * 1000,
  });
  res.status(201).json({
    message: "User logged in successfully",
    token,
  });
}

async function logoutUser(req, res) {
  const token =
    req.cookies?.token || req?.headers?.authorization?.split(" ")[1];
  if (!token) {
    return res.status(400).json({
      message: "Token is missing",
    });
  }
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  await redisClient.del(`session:${decoded.jti}`);
  res.clearCookie("token");
  res.status(200).json({
    message: "User logged out successfully",
  });
}

async function getMe(req, res) {
  res.status(200).json({
    message: "User fetched successfully",
    user: req.user,
  });
}

module.exports = { registerUser, loginUser, logoutUser, getMe };
