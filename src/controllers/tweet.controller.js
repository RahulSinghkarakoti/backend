import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {
  //TODO: create tweet
  // console.log(req);
  const { content } = req.body;
  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(400, "User not found");
  const tweet = await Tweet.create({ content, owner: user });
  if (!tweet) throw new ApiError(500, "failed to create tweet");

  return res
    .status(200)
    .json(new ApiResponse(200, tweet, "Tweet created successfully"));
});

const getUserTweets = asyncHandler(async (req, res) => {
  // TODO: get user tweets
  const { userId } = req.params;
  const userTweet = await Tweet.find({ owner: userId });

  if (!userTweet) throw new ApiError(500, "error to aggregate users tweets");

  return res
    .status(200)
    .json(new ApiResponse(200, userTweet, "users tweet fetched successfully"));
});

const getAllTweets = asyncHandler(async (req, res) => {
  //TODO: get all tweets
  const tweets = await Tweet.aggregate([
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
      },
    },
    {
        $lookup:{
            from: "likes",
            localField: "_id",
            foreignField: "tweet",
            as: "likes",
            // pipeline:[
            //     {
            //         $match:{
            //             likedBy:req.user._id
            //         }
            //     }
            // ]
        }
    },
    {
      $sort: {
        updatedAt: -1,
      },
    },
    {
        $addFields:{
            likesCount:{$size:"$likes"},
            isLiked:{$in:[req.user._id,"$likes.likedBy"]}

        }
    },
    {
      $project: {
        content: 1,
        createdAt: 1,
        updatedAt: 1,
        owner: {
          _id: 1,
          username: 1,
          avatar: 1,
        },
        likesCount:1,
        isLiked:1,
      },
    },
  ]);
  if (!tweets) throw new ApiError(500, "error to aggregate all tweets");

  return res
    .status(200)
    .json(new ApiResponse(200, tweets, "all tweets fetched successfully"));
});

const updateTweet = asyncHandler(async (req, res) => {
  //TODO: update tweet
  const { tweetId } = req.params;
  const { content } = req.body;
  if (!tweetId || !content)
    throw new ApiError(400, "invalid tweetId or content");
  const tweet = await Tweet.findByIdAndUpdate(tweetId, { content: content });
  if (!tweet) throw new ApiError(500, "failed to update tweet");

  return res
    .status(200)
    .json(new ApiResponse(200, "tweet updated successfully"));
});

const deleteTweet = asyncHandler(async (req, res) => {
  //TODO: delete tweet
  const { tweetId } = req.params;
  if (!tweetId) throw new ApiError(400, "invalid tweetId ");
  const tweet = await Tweet.findByIdAndDelete(tweetId);
  if (!tweet) throw new ApiError(500, "failed to delete tweet");

  return res
    .status(200)
    .json(new ApiResponse(200, "tweet deleted successfully"));
});

export { createTweet, getUserTweets, updateTweet, deleteTweet, getAllTweets };
