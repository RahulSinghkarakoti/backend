import mongoose from "mongoose";
import bcrypt from  "bcrypt"; 
import jwt  from "jsonwebtoken"

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique:true,
    lowercase:true,
    trim:true,
    index:true,
  },
  email: {
    type: String,
    required: true,
    unique:true,
    lowercase:true,
  },
  fullname:{
    type: String,
    required:true,
    trim:true,
    index:true,
  },
  avatar:{
    type:String,//cloudnery service url
    required:true,
  },
  coverImage:{
    type:String,
  },
  watchHistory:[
    {
        type: mongoose.Schema.Types.ObjectId,
        ref:'vedio'
    }
  ],
  password: {
    type: String,
    required: [true,"password is required"],
  },
  refreshToken:{
    type:String,
  }
  
},{timestamps:true});

//encryptinng password
userSchema.pre("save",async function(next){
    if(!this.isModified("password")) return next();

    this.password= await bcrypt.hash(this.password,10)
    next();
})

userSchema.methods.isPasswordCorrect=async function (password){
return await bcrypt.compare(password,this.password)
}

userSchema.methods.generateAccessToken=async function(){
 return jwt.sign(
    {
      _id:this._id,
      email:this.email,
      fullname:this.fullname,
      username:this.username,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn:process.env.ACCESS_TOKEN_EXPIRY,
    }
)
}
userSchema.methods.generateRefreshToken=async function(){
  return jwt.sign(
    {
      _id:this._id, 
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn:process.env.REFRESH_TOKEN_EXPIRY,
    }
)
}
export const User = mongoose.model("User", userSchema);
