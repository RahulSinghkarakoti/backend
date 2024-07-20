import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/Cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt, { decode } from "jsonwebtoken";
import mongoose from "mongoose";

const genrateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false }); //this will only update the refreshtoken part of scehma and not affect the other stored data

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Internal Server Error || Access and refresh token "
    );
  }
};

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
  // console.log(req);

  if (
    [fullname, username, password, email].some((field) => field?.trim() === "")
  )
    throw new ApiError(400, "ALL fields are required");

  //find for first instence that match entry
  const exitedUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (exitedUser) {
    throw new ApiError(409, "user with name or email already exist");
  }

  console.log(req.files);

  const avatarLocalPath = req.files?.avatar[0]?.path; // this will fetch the avatar media file from .files (provided by multer)
  //   const coverImageeLocalPath=  req.files?.coverImage[0]?.path   //this is causing error ,if coverImage is not sent

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "avatar is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!avatar) throw new ApiError(400, "avatar is required");

  const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken" //these field are not selected
  );
  if (!createdUser)
    throw new ApiError(
      500,
      "something went wrong  while registering the user."
    );

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "user registerd successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  //get the data from frontend
  //check for username and email and validata
  //check if user already exist
  // chek for password
  //genr8 access and refresh token
  //send the token in secure cookies
  //send response of successfull login

  const { username, password, email } = req.body;
  console.log(username);
  if (!username && !email) {
    throw new ApiError(400, "username and email is required");
  }
  const user = await User.findOne({
    $or: [{ username }, { email }], //find either username andd email and return the first entry that matches
  });

  if (!user) throw new ApiError(404, "username or email is incorrect");

  const isPasswordCorrect = await user.isPasswordCorrect(password);

  if (!isPasswordCorrect) throw new ApiError(401, "password is incorrect");

  const { accessToken, refreshToken } = await genrateAccessAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  ); //we are fetching new User data without password and refreshtoken for safety . we  donot have used 'user' because it includes password

  const options = {
    httpOnly: true, //only server can modify this cookie
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: accessToken,
          refreshToken,
          loggedInUser, //in case user want to store these token
        },
        "user logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  //remove access and refresh token from cookies
  //send response of logout successfull

  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { refreshToken: undefined },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true, //only server can modify this cookie
    secure: true,
  };

  res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "user logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  //get refresh token from cookies
  //verify
  //genrate new acces token
  //return access token
   
  const incomingRefreshToken =  req.cookies.refreshToken || req.body.refreshToken;
  if (!incomingRefreshToken) {
    throw new ApiError(400, "unauthorized request");
  }
  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedToken._id);
    if (!user) throw new ApiError(401, "invalid refresh token");
    if (incomingRefreshToken !== user?.refreshToken)
      throw new ApiError(401, "invalid or expired refresh token");

    const { accessToken, newrefreshToken } = await genrateAccessAndRefreshToken(
      user._id
    );

    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newrefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken:newrefreshToken },
          "access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401,error?.message|| "invalid or expired refresh token");
  }
});

const changeCurrentPassword=asyncHandler(async (req,res)=>{
   const {oldPassword,newPassword}=req.body
  //  console.log(req)
   const user=await User.findById(req.user?._id)  //get the user
   console.log(user)
   const isPasswordCorrect=await user.isPasswordCorrect(oldPassword)//check the old password 
   if(!isPasswordCorrect){
    throw new ApiError(400,"old password is incorrect")
   }
   user.password=newPassword
   await user.save({validateBeforeSave:false})
   return res
   .status(200)
   .json(
    new ApiResponse(
         200,
         {},
         "password changed successfully"
    )
   )
})  

const getCurrentUser=asyncHandler(async(req,res)=>{
  return res.status(200).json(
    new ApiResponse(
      200,
      req.user,
      "user fetched successfully"
    )
  )
})

const updateAccountDetails=asyncHandler(async(req,res)=>{
  const {fullname,email,username}=req.body
  if(!fullname && !email && !username){
    throw new ApiError(400,"please provide username , email, and fullname")
  }
  // const user=await User.findById(req.user?._id)
  // user.fullname=fullname
  // user.username=username
  // user.email=email
  // user.save({validateBeforeSave:false})

  //2nd approch
  const user=await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set:{
        fullname:fullname,
        username:username,
        email:email
      }
    },
    {new:true}).select("-password")  //return the updated user

  return res.status(200).json(
    new ApiResponse(
      200,
      user,
      "Account details updated successfully"
    )
  )
})

const updateAvatar=asyncHandler(async(req,res)=>{
  const avatarLocalPath=req.file?.path
  if(!avatarLocalPath)
    throw new ApiError(400,"please provide a valid image")

  const avatar= await uploadOnCloudinary(avatarLocalPath)
  if(!avatar.url)
    throw new ApiError(500,"could not upload image on cloudinary")

 const user= await  User.findByIdAndUpdate(req.user?._id,{
    $set:{
      avatar:avatar.url,
    }
   },{new:true}).select("-password")

   return res.status(200).json(
    new ApiResponse(
      200,
      user,
      "avatar updated successfully"
    )
   )
})

const updateCoverImage=asyncHandler(async(req,res)=>{
  const coverLocalPath=req.file?.path
  if(!coverLocalPath)
    throw new ApiError(400,"please provide a valid cover image")

  const coverImage= await uploadOnCloudinary(coverLocalPath)
  if(!coverImage.url)
    throw new ApiError(500,"could not upload image on cloudinary")

   const user=awaitUser.findByIdAndUpdate(req.user?._id,{
    $set:{
      coverImage:coverImage.url,
    }
   },{new:true}).select("-password")

   return res.status(200).json(
    new ApiResponse(
      200,
      user,
      "coverImage updated successfully"
    )
   )
})

const getUserChannelProfile=asyncHandler(async (req, res)=>{
  console.log(req.params)
  const {username}=req.params
  if(!username?.trim())
    throw new ApiError(400,"username is missing")

  // User.find({username})

  // using aggreagation pipeline
  const channel =await User.aggregate(
    [
      {
        $match:{
          username:username?.toLowerCase(),
        }
      },
      {
        $lookup:{
          from:"subscriptions",
          localField:"_id",
          foreignField:"channel",
          as:"subscribers"   //this will filter the detailes of user's subscriber
        }
      },
      {
        $lookup:{
          from:"subscriptions",
          localField:"_id",
          foreignField:"subscriber",
          as:"subscribedTo"   //this will filter the detailes of user's suscribed channel
        }
      },
      {
        $addFields:{
          subscribersCount:{
            $size:"$subscribers"
          },
          channelsSubscribedToCount:{
            $size:"$subscribedTo"
          },
          isSubscribed:{
            $cond:{
              if:{$in:[req.user?._id,"$subscribers.subscriber"]},
              then:true,
              else:false
            }
          }
        }
      },
      {
        $project:{ //selction the feild to be send
          fullname:1,
          username:1,
          subscribersCount:1,
          channelsSubscribedToCount:1,
          isSubscribed:1,
          avatar:1,
          coverImage:1,
          email:1
        }
      }
    ]
  )
console.log(channel)
  if(!channel?.length)
  {
    throw new ApiError(500,"chennel doesnot exist")
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      channel[0],
      "user channel details"
    )
  )
})

const getWatchHistory=asyncHandler(async (req,res)=>{
const user=await User.aggregate([
  {
    $match:{
      _id:new mongoose.Types.ObjectId(req.user._id)
    }
  },
  {
    $lookup:{
      from:"vedios"
      ,localField:"watchHistory"
      ,foreignField:"_id"
      ,as:"watchHistory",
      pipeline:[
        {
          $lookup:{
            from:"users",
            localField:"Owner",
            foreignField:"_id",
            as:"owner",
            pipeline:[
              {
                $project:{
                  fullname:1,
                  username:1,
                  avatar:1,                }
              }
            ]
          }
        },
        {
          $addFields:{
            owner:{
              $first:"$owner"
            }
          }
        }
      ]
    }
  }
])

return res.status(200).json(
  new ApiResponse(
    200,
    user[0].watchHistory,
    "Watch History fetched"
  )
)
})

export { 
  registerUser,
   loginUser, 
   logoutUser,
   refreshAccessToken,
   updateAccountDetails,
   updateAvatar,
   updateCoverImage,
   getUserChannelProfile,
   getWatchHistory,
   changeCurrentPassword,
   getCurrentUser
   };
