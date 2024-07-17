import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/Cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const genrateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });//this will only update the refreshtoken part of scehma and not affect the other stored data
    return {accessToken,refreshToken}

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
  //   console.log(username);

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

  const { username, email, password } = req.body;
  if (!username && !email) {
    throw new ApiError(400, "username and email is required");
  }
  const user = User.findOne({
    $or: [{ username }, { email }], //find either username andd email and return the first entry that matches
  });
  if (!user) throw new ApiError(404, "username or email is incorrect");

  const isPasswordCorrect = await user.isPasswordCorrect(password);
  if (!isPasswordCorrect) throw new ApiError(401, "password is incorrect");

 const {accessToken,refreshToken}= await genrateAccessAndRefreshToken(user._id)

 const loggedInUser=await User.findById(user._id).select("-password -refreshToken")  //we are fetching new User data without password and refreshtoken for safety . we  donot have used 'user' because it includes password 

 const options={
  httpOnly:true, //only server can modify this cookie
  secure:true,
 }

 return res
 .status(200)
 .cookie("accessToken",accessToken,options)
 .cookie("refreshToken",refreshToken,options)
 .json(
  new ApiResponse(200,{
    user:accessToken,refreshToken,loggedInUser  //in case user want to store these token 
  },
  "user logged in successfully"
)
 )

});

const logoutUser=asyncHandler(async (req,res)=>{
  //remove access and refresh token from cookies
  //send response of logout successfull
  
 await User.findByIdAndUpdate(
    req.user._id,
    {
      $set:{refreshToken:undefined}
    },
    {
      new:true,
    }
  )

  const options={
    httpOnly:true, //only server can modify this cookie
    secure:true,
   }

   res.status(200)
   .clearCookie("accessToken",options)
   .clearCookie("refreshToken",options)
   .json(
    new ApiResponse(200,{},"user logged out successfully")
   )


})
export { registerUser, loginUser,logoutUser };
