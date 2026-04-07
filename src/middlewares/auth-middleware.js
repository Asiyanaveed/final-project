import {asyncHandler} from "../utils/async-handler.js";
import {userTable} from "../models/user.model.js";
import jwt from "jsonwebtoken";
import { ApiError } from "../utils/api-error.js";
import passport from "../config/passport.js";

export const verifyJWT = asyncHandler(async (req, res, next) => {
   
    // getting client token from cookies 
    const token = req.cookies?.accessToken 

    // if token not found , throw error
    if(!token){
        throw new ApiError (401,"Access token is required , please login")
    }

    try {
        // token decoded from jwt
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        //  finding user from database
        const user = await userTable.findById(decodedToken._id).select("-password -refreshToken -emailVerificationToken -emailVerificationTokenExpiry");

        // if user not found , throw error
        if(!user){
            throw new ApiError (401,"User not found , invalid token")
        }
        // attaching user to request object
        req.user = user;
        next();

    }catch (error) {
        throw new ApiError (401,"Invalid or expired access token , please login again")
    }


})




// export const passAuth = asyncHandler(async (req, res, next) => {
//     // Implementation for passport authentication middleware
//     passport.authenticate("google", {sesssion: false},(err, user, info) => {
//         if (err || !user) {
//             return res.status(401).json({ message: "Google Authentication failed", error: err.message || info });
//         }

//         req.user = user; // Attach the authenticated user to the request object
//         next();
       
//     })(req, res, next);
// });


export const passAuth = (req, res, next) => {
    passport.authenticate("google", { session: false }, (err, user, info) => {
        console.log("❌ err", err);
        console.log("✅ user", user);
        console.log("✅ info", info);
        
        if (err || !user) {
            console.error("Google Auth Error:", err || info);
            return res.status(401).json({ message: "Google Authentication failed", error: err.message || info });
        }
        req.user = user;
        next();
    })(req, res, next);
};