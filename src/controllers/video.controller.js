import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { deleteOnCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
// import { verify } from "jsonwebtoken"

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  //TODO: get all videos based on query, sort, pagination
  console.log(req.query);

  return res.status(200).json(new ApiResponse(200, {}, "fetch successfull"));
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  // TODO: get video, upload to cloudinary, create video
  //uploade vedio on coluinery
  //get url strnig
  //create instence in vedio db
  //return res

  if ([title, description].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "title and description is not provided");
  }
  const existVideo = await Video.findOne({
    $or: [{ title }, { description }],
  });
  if (existVideo) {
    throw new ApiError(400, "title and description is already exist");
  }

  console.log(req.file, "-----------", req.files);
  const videoLocalPath = req.files?.videoFile[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail[0]?.path;
  if (!videoLocalPath && !thumbnailLocalPath) {
    throw new ApiError(400, "video and thumbnail is not provided");
  }

  const video = await uploadOnCloudinary(videoLocalPath);
  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
  if (!video || !thumbnail) {
    throw new ApiError(
      500,
      "video and thumbnail is not uploaded on cloudinary"
    );
  }

  // console.log(video, "......?.....", thumbnail);

  const videoInstence = await Video.create({
    title,
    description,
    thumbnail: thumbnail.url,
    video: video.url,
    duration: video.duration,
    Owner: req.user,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, videoInstence, "vedio upload succesfulll"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: get video by id
  //fetch vedio from schema
  //return res
  const video = await Video.findById(videoId);
  console.log(video);

  if (!video) {
    throw new ApiError(400, "video donot exist");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "vedio fetched by ID successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: update video details like title, description, thumbnail
  const { title, description } = req.body;
  if (!title && !description) {
    throw new ApiError(400, "title and description is not provided");
  }
  const thumbnailLocalPath = req.file?.path;
  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
  if (!thumbnail) {
    throw new ApiError(500, "thumbnail is not uploaded on cloudinary");
  }

  //delete the old thumbnial from cloudinary storage
  const video = await Video.findById(videoId);
  function extractPublicId(url) {
    //function to fetch the publicId from a url
    const regex = /\/upload\/[^\/]+\/([^\.]+)\./;
    const match = url.match(regex);
    return match ? match[1] : null;
  }
  console.log(extractPublicId(video.thumbnail));
  const delelteOldThumbnail = await deleteOnCloudinary(
    extractPublicId(video.thumbnail)
  );
  if (!delelteOldThumbnail) {
    throw new ApiError(500, "old thumbnail is not deleted from coludinary");
  }

  const newvideoInstence = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        title: title,
        description: description,
        thumbnail: thumbnail.url,
      },
    },
    { new: true }
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        newvideoInstence,
        "title ,decription,thumbnail updated succesfully"
      )
    );
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video
  const video = await Video.findOneAndDelete(videoId);
  if (!video) throw new ApiError(404, "video not found");

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "video deleted succesfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const stateVideo = await Video.findById(videoId);

  if (!stateVideo) throw new ApiError(404, "video not found");

  stateVideo.isPublished = !stateVideo.isPublished;
  await stateVideo.save();
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "video published status changed"));
});

const getNextVideos = asyncHandler(async (req, res) => {});

const getVideoByIdForGuest = asyncHandler(async (req, res) => {
  //fetch video
  //return res
  const {videoId}=req.params
  const video =await Video.aggregate([
    {
      $match:{
        _id:new mongoose.Types.ObjectId(videoId),
      }
    },
    {
      $lookup:{
        from:"likes",
        localField:"_id",
        foreignField:"video",
        as:"likes"
      }
    },
    {
      $lookup:{
        from:"users",
        localField:"Owner",
        foreignField:"_id",
        as:"owner",
        pipeline:[
          {
            $lookup:{
              from:"subscriptions",
              localField:"_id",
              foreignField:"channel",
              as:"subscribers"
            }
          },
          {
            $addFields:{
              subscriberCount:{
                $size:"$subscribers"
              },
              isSubscribed:false
            }
          },
          {
            $project:{
              subscriberCount:1,
              isSubscribed:1,
            }
          }
        ]
      }
    },
    {
      $addFields:{
        likesCount:{$size:"$likes"},
        owner:"$owner",
        isLiked:false
      }
    },
    {
      $project:{
        video:1,
        username:1,
        fullname:1,
        title:1,
        description:1,
        duration:1,
        likesCount:1,
        owner:1,
        isLiked:1,
        isSubscribed:1,
      }
    }
  ])

  if(!video)
    throw new ApiError(500,"video not found")

  return res.status(200).json(
    new ApiResponse(200,video,"vedio fetched successfully")
  )
   
});

const updateVideoViews = asyncHandler(async (req, res) => {
  //fetch user
  //check in watchhistory if vedioId aalready exist
  //if exists then update last viewd time
  //else increment views by 1 and add vedioId to watchhistory
  //return res
  const { videoId } = req.params;
  console.log(typeof(videoId))
  const userId = req.user._id;
  if (!isValidObjectId(videoId)) throw new ApiError(400, "invalid videoId");
  if (!userId) throw new ApiError(400, "invalid userId");

  const video = await Video.findById(videoId);
  if (!video) throw new ApiError(400, "video  not found ");

  const user = await User.findById(userId);
  console.log(user.watchHistory)
  const inWatchHistory = user.watchHistory.find((item) => item.toString() === videoId);
  console.log(inWatchHistory)
  if (!inWatchHistory) {
    console.log("first time watching");
    user.watchHistory.push(
      videoId,
    );
    await user.save();
    await Video.findByIdAndUpdate(videoId, { $inc: { views: 1 } });
  }
  else{
    console.log("already watched");
  }
  return res.status(200).json(
    new ApiResponse(200,{video,user},"views updated successfully")
  )

});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
  getNextVideos,
  getVideoByIdForGuest,
  updateVideoViews,
};
