const express = require("express");
const authController= require("../controllers/auth.controller")
const authRouter= express.Router();
const authMiddleware=require("../middlewares/auth.middleware")

authRouter.post("/register",authController.registerUser);
authRouter.post("/login",authController.loginUser);
authRouter.post("/logout",authController.logoutUser)
authRouter.get("/get-me",authMiddleware.authUser,authController.getMe);
module.exports=authRouter;