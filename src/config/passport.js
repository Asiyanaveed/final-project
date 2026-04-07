//src\config\passport.js

import dotenv from "dotenv";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { userTable } from "../models/user.model.js";
import crypto from "crypto";

dotenv.config();

passport.use(new GoogleStrategy(
    {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
   },
    async (accessToken, refreshToken, profile, done) => {
        try {
                 // check if user already exists in our database
        let user =  await userTable.findOne({googleId: profile.id});
        
         // if user exists, return the user
        if(user){
            return done(null, user);
        }

        // check if user with same email exists  { registered manually}

        user = await userTable.findOne({email: profile.emails[0].value});

        if(user){
            // if user exists, link google account
            user.googleId = profile.id;
            user.isEmailVerified = true; // since email is verified by google
            if(!user.avatar){
                user.avatar = profile.photos[0]?.value || null;
            }
            await user.save({validateBeforeSave: false});
            return done(null, user);
        }

        //   new user, create user in database
        const newUser =await userTable.create({
            googleId: profile.id,
            isEmailVerified: true,
            avatar: profile.photos[0]?.value || null,
            username: profile.emails[0].value.split("@")[0], // use email prefix as username
            email: profile.emails[0].value,
            fullName: profile.displayName,
            password: crypto.randomUUID()// generate random password since user will login with google
        });

        return done(null, newUser);
        }
        catch (error) {
            return done(error, null);
        }
    }
))



export default passport;
   