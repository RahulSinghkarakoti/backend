import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  console.log(videoId)
  //TODO: toggle like on video
  const userId = req.user;
  let likeVideo = await Like.findOne({ video: videoId, likedBy: userId });
  if (likeVideo) {
    await Like.findByIdAndDelete(likeVideo._id);
    return res.status(200).json(new ApiResponse(200, null, "video unliked "));
  } else {
    likeVideo = await Like.create({ video: videoId, likedBy: userId });
    return res.status(200).json(new ApiResponse(200, null, "video liked "));
  }
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  console.log(commentId)
  //TODO: toggle like on comment
  const userId = req.user;
  try {
    let commentLike = await Like.findOne({
      comment: commentId,
      likedBy: userId,
    });
    if (commentLike) {
      await Like.findByIdAndDelete(commentLike._id);
      return res
        .status(200)
        .json(new ApiResponse(200, null, "comment unliked "));
    } else {
      commentLike = await Like.create({ comment: commentId, likedBy: userId });
      return res.status(200).json(new ApiResponse(200, null, "comment liked "));
    }
  } catch (error) {
    throw new ApiError(500, "failed to fetch the user/comment info ");
  }
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  //TODO: toggle like on tweet
  const userId = req.user;
  try {
    let tweetLike = await Like.findOne({ tweet: tweetId, likedBy: userId });
    if (tweetLike) {
      await Like.findByIdAndDelete(tweetLike._id);
      return res
        .status(200)
        .json(new ApiResponse(200, null, "comment unliked "));
    } else {
      tweetLike = await Like.create({ tweet: tweetId, likedBy: userId });
      return res.status(200).json(new ApiResponse(200, null, "comment liked "));
    }
  } catch (error) {
    throw new ApiError(500, "failed to fetch the user/tweet info ");
  }
});

const getLikedVideos = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  console.log(userId);
  try {
    const likedVideos = await Like.aggregate([
      {
        $match: {
          likedBy: userId, // Ensure userId is an ObjectId
          video: { $exists: true, $ne: null },
        },
      },
      {
        $lookup: {
          from: "videos",
          localField: "video",
          foreignField: "_id",
          as: "likedVideo",
          pipeline: [
            {
              $match: {
                isPublished: true,
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "Owner",
                foreignField: "_id",
                as: "ownerDetail",
              },
            },
            {
              $unwind: "$ownerDetail",
            },
            {
              $project: {
                _id: 1,
                title: 1,
                description: 1,
                thumbnail: 1,
                duration: 1,
                views: 1,
                isPublished: 1,
                "ownerDetail._id": 1,
                "ownerDetail.username": 1,
                "ownerDetail.fullname": 1,
                "ownerDetail.avatar": 1,
              },
            },
          ],
        },
      },
      {
        $unwind: "$likedVideo",
      },

      {
        $project: {
          likedVideo: 1, 
          // 'ownerDetail.username':1
        },
      },
    ]);

    console.log(likedVideos);
    if (!likedVideos) throw new ApiError(500, "error in vediolike agrregation");

    return res
      .status(200)
      .json(
        new ApiResponse(200, likedVideos, "liked vedio fetched sucesfully")
      );
  } catch (error) {
    throw new ApiError(500, "error in  fetching data");
  }
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
