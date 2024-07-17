import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {User} from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/Cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
  //get user details from frontend
  //validate the data
  //check if user already exist Note:using username and email (unique fields)
  //check for images ,check for avatar
  //upload them to cloudinary , avatar
  //create user object - create entry in DB
  //remove password and refresh token from response
  //check for user creation
  //send response to frontend

  const { fullname, username, password, email } = req.body;
  console.log(username);

  if (
    [fullname, username, password, email].some((field) => field?.trim() === "")
  )
    throw new ApiError(400, "ALL fields are required");
 
    //find for first instence that match entry
    const exitedUser=  User.findOne({
      $or:[{username},{email}]
    })
    if(exitedUser){
      throw new ApiError(409,"user with name or email already exist")
    }

  const avatarLocalPath=  req.files?.avatar[0]?.path // this will fetch the avatar media file from .files (provided by multer) 
  const coverImageeLocalPath=  req.files?.coverImage[0]?.path
   if(!avatarLocalPath){
      throw new ApiError(400,"avatar is required")
   }
   
   const avatar=await uploadOnCloudinary(avatarLocalPath)
   const coverImage=await uploadOnCloudinary(coverImageeLocalPath)
   if(!avatar)
      throw new ApiError(400,"avatar is required")
      
const user =  await User.create({
      fullname,
      avatar:avatar.url,
      coverImage:coverImage?.url || "",
      email,
      password,
      username:username.toLowerCase()
   })

   const  createdUser =await  User.findById(user._id).select(
      "-password -refreshToken" //these field are not selected
   )
   if(!createdUser)
      throw new ApiError(500,"something went wrong  while registering the user.")

   return res.status(201).json( 
      new ApiResponse(200,createdUser,"user registerd successfully")
   )

});

export { registerUser };
