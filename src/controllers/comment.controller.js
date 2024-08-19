import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
  //TODO: get all comments for a video
  console.log(req.user._id);
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  if (!isValidObjectId(videoId)) throw new ApiError(400, "Invalid video id");

  const video = await Video.findById(videoId);
  if (!video) throw new ApiError(500, "video not found");

  const commentAggregate = Comment.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
      },
    }, 
    {
      $lookup: {
        from: "likes",
        let: { commentId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                    { $eq: ["$comment", "$$commentId"] },
              
                  {
                    $eq: ["$likedBy", req.user._id],
                  },
                ],
              },
            },
          },
        ],
        as: "userLike",
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "comment",
        as: "likes",
      },
    },
    {
      $addFields: {
        likesCount: {
          $size: "$likes",
        },
        owner: {
          $first: "$owner",
        },
        isLikedByUser: {
          $cond: {
            if: { $gt: [{ $size: "$userLike" }, 0] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $project: {
        content: 1,
        createdAt: 1,
        likesCount: 1,
        isLikedByUser: 1,
        owner: {
          _id: 1,
          username: 1,
          fullname: 1,
          avatar: 1,
        },
      },
    },
  ]);

  if (!commentAggregate) throw new ApiError(500, "failed to fetch comments");

  const option = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };
  const comment = await Comment.aggregatePaginate(commentAggregate, option);

  return res
    .status(200)
    .json(new ApiResponse(200, comment, "video comment fetch successfull"));
});

const addComment = asyncHandler(async (req, res) => {
  // TODO: add a comment to a video
  // console.log(req)
  const { videoId } = req.params;
  const { comment } = req.body;
  // console.log(comment)

  const video = await Video.findById(videoId);
  // console.log(video)
  if (!video) throw new ApiError(500, "video not found");

  const newComment = await Comment.create({
    content: comment,
    video: videoId,
    owner: req.user._id,
  });
  if (!newComment) throw new ApiError(400, "Failed to add comment");

  return res
    .status(200)
    .json(new ApiResponse(200, newComment, "comment added succesfully"));
});

const updateComment = asyncHandler(async (req, res) => {
  // TODO: update a comment
  const { commentId } = req.params;
  const { comment } = req.body;
  const newComment = await Comment.findByIdAndUpdate(
    commentId,
    {
      $set: {
        content: comment,
      },
    },
    { new: true }
  );
  if (!newComment) throw new ApiError(500, "Failed to update comment");
  return res
    .status(200)
    .json(new ApiResponse(200, newComment, "comment updated succesfully"));
});

const deleteComment = asyncHandler(async (req, res) => {
  // TODO: delete a comment
  const { commentId } = req.params;
  const deletedComment = await Comment.findByIdAndDelete(commentId);
  if (!deletedComment) throw new ApiError(500, "Failed to delete comment");
  return res
    .status(200)
    .json(new ApiResponse(200, deletedComment, "comment deleted succesfully"));
});

export { getVideoComments, addComment, updateComment, deleteComment };
