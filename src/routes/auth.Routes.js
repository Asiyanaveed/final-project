import express from "express";
import { registerUser, login, verifyEmail, logoutUser, resendEmailVerification ,getCurrentUser, refreshAccessToken, forgetPasswordRequest, resetForgotPassword, changeCurrentPassword, cbFunction} from "../controllers/auth.controller.js";
import { verifyJWT, passAuth } from "../middlewares/auth-middleware.js";



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




import passport from "../config/passport.js";
///---------------------LOGIN WITH GOOGLE rOUTE---------------------///
// redirect user to google for authentication
router.route("/google").get(passport.authenticate("google", { scope: ["profile", "email"] }));

//  google redirect back here after successful authentication
router.route("/google/callback").all(passAuth).get(cbFunction)

//failure route for google authentication
router.route("/google/failure").get((req, res) => {
   return res.status(401).json({ message: "Google Authentication failed" });
})
   



export default router;