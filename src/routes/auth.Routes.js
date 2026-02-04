import express from "express";
import { registerUser, login, verifyEmail, logoutUser, resendEmailVerification ,getCurrentUser, refreshAccessToken, forgetPasswordRequest, resetForgotPassword, changeCurrentPassword} from "../controllers/auth.controller.js";
import { verifyJWT } from "../middlewares/auth-middleware.js";
import { register } from "module";


const router = express.Router();

router.route("/register").post(registerUser); // user registeration route

router.route("/verify-email/:verificationToken").get(verifyEmail); // email verification route

router.route("/resend-email-verification").get(verifyJWT, resendEmailVerification); // resend email verification route

router.route("/login").post(login); // user login route

router.route("/logout").post(verifyJWT, logoutUser); // user logout,  route

router.route("/current-user").post(verifyJWT, getCurrentUser); // get current logged in user route

router.route("/refresh-token").post(refreshAccessToken); // refresh access token route

router.route("/forget-password").post(forgetPasswordRequest); // forget password route

router.route("/reset-password/:resetToken").post(resetForgotPassword); // reset password route

router.route("/change-password").post(verifyJWT, changeCurrentPassword); // change current passwprd



export default router;