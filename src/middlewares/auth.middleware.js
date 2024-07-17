import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

export const verifyJWT = asyncHandler(async (req, rep, next) => {
  try {
    //second condtion fetch from  the cookies of modile
    const token =
      (await req.cookies?.accessToken) ||
      req.header("Authorization")?.replace("Bearer", "");
    if (!token) throw new ApiError(401, "unauthorized request");

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET); //decode the info stored in accestoken
    const user = User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );
    if (!user) {
      throw new ApiError(401, "Invalid access token");
    }
    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401,error?.message|| "Invalid access token");
  }
});
