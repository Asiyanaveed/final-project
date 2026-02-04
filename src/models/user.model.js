import { triggerAsyncId } from "async_hooks";
import mongoose , {Schema} from "mongoose";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { type } from "os";

const userSchema = new Schema({
    avatar:{
        type:{
            url: String,
        },
        default: {
            url : "https://placehold.co/200x200",
        }
    },
    username:{
        type: String,
        required: true,
        lowercase: true,
        trim: true,
    },
    email:{
        type: String,
        required: [true, "Email is required"],
        unique: true,
        lowercase: true,
        trim: true,
    },
    fullName:{
        type: String,
        trim: true,
    },
    password:{
        type: String,
        required: [true, "Password is required"],
    },
    isEmailVerified:{
        type: Boolean,
        default: false,
    },
    refreshToken:{
        type: String,
    },
    forgotPasswordToken:{
        type: String,
    },
    fogotPasswordTokenExpiry:{
        type: Date,
    },
    emailVerificationToken:{
        type: String,
    },
    emailVerificationTokenExpiry:{
        type: Date,
    }
        
},{ timestamps: true }
);

//-------------------------------------prehooks-------------------------------------


userSchema.pre("save",async function(){
    if(!this.isModified("password")){
        // if password is not modified, move to next middleware
        return ;
    }

    this.password = await bcrypt.hash(this.password,10);
})

//------------------------------------Methods---------------------------------

userSchema.methods.isPasswordCorrect = async function (password){
    return await bcrypt.compare(password, this.password)
}

// Generate JWT Access tokens
userSchema.methods.generateAccessToken = function(){

    const payload ={
        _id: this._id,
        email: this.email,
        username: this.username,
    }

    return jwt.sign(payload,
                    process.env.ACCESS_TOKEN_SECRET,
                    {expiresIn: process.env.ACCESS_TOKEN_EXPIRY})
}

// Generate Refresh Token
userSchema.methods.generaterefreshToken = function(){
    const payload ={
        _id: this._id,
       
    }
    return jwt.sign(payload, 
           process.env.REFRESH_TOKEN_SECRET,
           {expiresIn: process.env.REFRESH_TOKEN_EXPIRY})
}

//-------------------------------temporary tokens for email  verificrioin and password reset

userSchema.methods.generateTemporaryToken = function(){
    const unHashedToken =  crypto.randomBytes(20).toString('hex');

    const hashedToken = crypto
    .createHash('sha256')
    .update(unHashedToken)
    .digest('hex');

   const tokenExpiry = Date.now() + 20 * 60 * 1000

   return {unHashedToken, hashedToken, tokenExpiry}
}




 const userTable = mongoose.model("User", userSchema);

export {userTable};