import { ApiResponse } from "../utils/api-response.js"
import { asyncHandler } from "../utils/async-handler.js"
import {ApiError} from "../utils/api-error.js"
import { userTable } from "../models/user.model.js";
import { sendEmail , emailVerificationMailgenContent} from "../utils/mail.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";




const registerUser = asyncHandler(async (req, res) => {

    // getting user data from client
    const { username, email, password } = req.body;

    // check if user already exists
    const existingUser = await userTable.findOne({
        $or: [{ email }, { username }],
    })

    if (existingUser) {
        throw new ApiError(400, "User already exists")
    }

    // create new user
    const newUser = await userTable.create({
        username,
        email,
        password,
        isEmailVerified: false,
    });

    // create temporary tokens for email verification
    const { unHashedToken, hashedToken, tokenExpiry } = newUser.generateTemporaryToken();
    newUser.emailVerificationToken = hashedToken;
    newUser.emailVerificationTokenExpiry = tokenExpiry;

    await newUser.save({validateBeforeSave: false});


    // send verification email to user
    await sendEmail({
        email: newUser.email,
        subject: "Email Verification - Final Project",
        mailgenContent: emailVerificationMailgenContent(
            newUser.username,
            `${req.protocol}://${req.get("host")}/api/v1/auth/verify-email/${unHashedToken}`

        ),
    });

    // excluding fields from database

    const createdUser = await userTable.findById(newUser._id).select("-password -refreshToken -emailVerificationToken -emailVerificationTokenExpiry");
    
    // if user creation failed
    if(!createdUser){
        throw new ApiError (500,"User not found after creation")
    }

    return res.status(201)
    .json(new ApiResponse(201, "User registered successfully. Please verify your email to activate your account.", createdUser));
});
    



//-------------------------- Login Controller function --------------------------//



const login = asyncHandler(async (req, res) => {

   // getting user data from client
   const { email, password } = req.body;

   // check if email exsits
   if(!email){
    throw new ApiError (400,"Email is required")
   }
  // check if user exists in database
    const existingUser = await userTable.findOne({ email });

    // if user not found ,throw error
    if(!existingUser){
        throw new ApiError (404,"User not found with this email")
    }

    // check if password is correct
    const isPasswordCorrect = await existingUser.isPasswordCorrect(password);

    // if password is incorrect , throw error
    if(!isPasswordCorrect){
        throw new ApiError (401,"Incorrect password")
    }

    // generate access token and refresh token
    const accessToken = existingUser.generateAccessToken();
    const refreshToken = existingUser.generaterefreshToken();

    // save refresh token in database
    existingUser.refreshToken = refreshToken;
    await existingUser.save({ validateBeforeSave: false });

    // setting cookies options
        const options = {
        httpOnly: true,
        secure: true
        }

   //  returning response to client with user detail and tokens
   return res
   .status(200)
   .cookie("refreshToken", refreshToken, options)
   .cookie("accessToken", accessToken, options)
   .json(
    new ApiResponse(200,{
        user: {
            _id: existingUser._id,
            email: existingUser.email,
            
        },
        accessToken,
        refreshToken
      },
       "user logged in successfully"

))
});




const verifyEmail = asyncHandler (async (req,res) => {

    // getting verification token from params
    const { verificationToken } = req.params;

    // if token not found , throw error
    if(!verificationToken){
        throw new ApiError (400,"Verification token is required")
    }

    // hashing the token received from params
    
    const hashedToken = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex");

    // find user with hashed token and check if token is not expired
    const user = await userTable.findOne({
        emailVerificationToken: hashedToken,
        emailVerificationTokenExpiry: { $gt: Date.now() }
    });

    // if user not found , throw error
    if(!user){
        throw new ApiError (400,"Invalid or expired verification token")
    }

    // update user's email verification status
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationTokenExpiry = undefined;
    // save the user
    await user.save({validateBeforeSave: false});

    // send response to client
    return res.status(200)
        .json(new ApiResponse(200, "Email verified successfully", {isEmailVerified: true}));

})




const logoutUser = asyncHandler (async (req,res) => {
    // clear refresh token from  database
    await userTable.findByIdAndUpdate(
      req.user._id,
     { $set: { refreshToken: ""}},
    { new: true }
    );
    // option to clear cookies
    const options = {
        httpOnly: true,
        secure: true,
        }
    // send response to client
    return res
    .status(200)
    .cookie("refreshToken", options)
    .cookie("accessToken", options)
    .json(new ApiResponse(200, "User logged out successfully"));

})


// -------------------------- Resend Email Verification Controller function --------------------------//

const resendEmailVerification = asyncHandler (async (req,res) => {
    // find user from database
    const {email} = req.user;
    
     // find user with email
    const user = await userTable.findOne({ email });

    // if user not found , throw error
    if(!user){
        throw new ApiError (404,"User not found")
    }
    // if email already verified , throw error
    if(user.isEmailVerified){
        throw new ApiError (400,"Email is already verified")
    }

    // create temporary tokens for email verification
    const { unHashedToken, hashedToken, tokenExpiry } = user.generateTemporaryToken();
    user.emailVerificationToken = hashedToken;
    user.emailVerificationTokenExpiry = tokenExpiry;

    await user.save({validateBeforeSave: false});


    // send verification email to user
    await sendEmail({
        email: user.email,
        subject: "Email Verification - Final Project",
        mailgenContent: emailVerificationMailgenContent(
            user.username,
            `${req.protocol}://${req.get("host")}/api/v1/auth/verify-email/${unHashedToken}`

        ),
    });

    // send response to client
    return res.status(200)
    .json(new ApiResponse(200, "Verification email resent successfully. Please check your email to verify your account."));

})



const getCurrentUser = asyncHandler (async (req,res) => {
    // send current logged in user details to client 
    return res.status(200)
    .json(new ApiResponse(200, "Current user fetched successfully", req.user));
});



// -------------------------- Refresh Access Token Controller function --------------------------//


const refreshAccessToken = asyncHandler (async (req, res) => {
    // getting refresh token from cookies
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    console.log(incomingRefreshToken,'incomingRefreshToken')
    // if refresh token is not present , throw error
    if(!incomingRefreshToken){
        throw new ApiError(401, "Refresh token is missing.")
    }
    try{
        // verify the incoming refresh token from client to get _id
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    
        // find user with the _id from decoded token from database
        const user = await userTable.findById(decodedToken._id)
        console.log(user,'user');
        // if user not found , throw error
        if(!user){
            throw new ApiError(401, "User not found with this token.")
        }
       
        // check if incoming refresh token of clients matches the one in database
        if(user.refreshToken !== incomingRefreshToken){
            throw new ApiError(401, "Invalid refresh token.")
        }
        // generate new access token
        const newAccessToken = user.generateAccessToken()
         //  setting cookies options
        const options = {
            httpOnly : true,
            secure : true 
    }
        // send response to client with new access token
        return res.status(200)
        .cookie("accessToken", newAccessToken, options)
        .json(
            new ApiResponse(200, {accessToken: newAccessToken}, "Access token refreshed successfully.")
        )
    }
    catch (error) {
        throw new ApiError(401, "Invalid refresh token.")
    }
});


 
// -------------------------- Forget Password Controller function --------------------------//

const forgetPasswordRequest = asyncHandler (async (req,res) => {

    // getting email from client
    const { email } = req.body;

    //  find user from database
    const user = await userTable.findOne({ email });

    // if user not found , throw error
    if(!user){
        throw new ApiError (404,"User not found with this email")
    }

    // create temporary tokens for password reset
    const { unHashedToken, hashedToken, tokenExpiry } = user.generateTemporaryToken();
    user.emailVerificationToken = hashedToken;
    user.emailVerificationTokenExpiry = tokenExpiry;

    await user.save({validateBeforeSave: false});

    // send password reset email to user
    await sendEmail({
        email: user.email,
        subject: "Password Reset Request - Final Project",
        mailgenContent: emailVerificationMailgenContent(
            user.username,
            `${req.protocol}://${req.get("host")}/api/v1/auth/reset-password/${unHashedToken}`
        ),
    });


    // send response to client
    return res.status(200)
    .json(new ApiResponse(200, "Password reset email sent successfully. Please check your email for further instructions."));
});


// -------------------------- Reset Forgot Password Controller function --------------------------//

const resetForgotPassword = asyncHandler (async (req,res) => {

    // getting reset token from params
    const { resetToken } = req.params; // token from email link

    // getting new password from client
    const  {newPassword}  = req.body;   // new password from client

    // if token not found , throw error
    if(!resetToken){
        throw new ApiError (400,"Reset token is required")
    }

    // hashing the token received from params
    
    const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

    // find user with hashed token and check if token is not expired
    const user = await userTable.findOne({
        emailVerificationToken: hashedToken,
        emailVerificationTokenExpiry: { $gt: Date.now() }
    });

    // if user not found , throw error
    if(!user){
        throw new ApiError (400,"Invalid or expired reset token")
    }

    // update user's password
    user.password = newPassword; // set new password from client
    user.emailVerificationToken = undefined;
    user.emailVerificationTokenExpiry = undefined;

    // save the user
    await user.save({validateBeforeSave: false});

    // send response to client
    return res.status(200)
        .json(new ApiResponse(200, "Password reset successfully"));


})




// -------------------------- Change Current Password Controller function --------------------------//

const changeCurrentPassword = asyncHandler (async (req,res) => {

   const {oldPassword, newPassword} = req.body

    // find user from database
    const user = await userTable.findById(req.user._id)

    // if user not found, throw error
    if(!user){
        throw new ApiError(404, "User not found")
    }

    // check if old password is correct
    const isOldPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    // if old password is incorrect, throw error
    if(!isOldPasswordCorrect){
        throw new ApiError(401, "Old password is incorrect")
    }

    // update user's password
    user.password = newPassword // set new password
    await user.save({validateBeforeSave: false})

    // send response to client
    return res.status(200).json(
        new ApiResponse(200, null, "Password changed successfully")
    )

})








 const cbFunction = asyncHandler(async (req, res) => {
    
    const user = req.user; // The authenticated user will be available in req.user
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generaterefreshToken();

    // save refresh token in database
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    // setting cookies options
    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("refreshToken", refreshToken, options)
    .cookie("accessToken", accessToken, options)
    .json(
        new ApiResponse(200,{
            user: user,
            accessToken,
            refreshToken
          },
           "User logged in with Google successfully")
        )
    ;

})



export { registerUser , login , verifyEmail, logoutUser, resendEmailVerification, getCurrentUser, refreshAccessToken , forgetPasswordRequest, resetForgotPassword, changeCurrentPassword, cbFunction};