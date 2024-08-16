import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { deleteOnCloudinary, uploadOnCloudinary } from "../utils/Cloudinary.js";
// import { verify } from "jsonwebtoken"

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  //TODO: get all videos based on query, sort, pagination
  console.log(req.query);
  const pageNumber = parseInt(page, 10);
  const limitNumber = parseInt(limit, 10);
  const sortDirection = sortType === "asc" ? 1 : -1;

  // Build the filter query
  const filter = {};
  if (query) {
    filter.title = { $regex: query, $options: "i" }; // Assuming you want to search by title, case insensitive
  }
  if (userId) {
    filter.userId = userId;
  }

  try {
    // Fetch the videos with pagination, filtering, and sorting
    // const videos = await Video.find(filter)
    //   .sort({ [sortBy]: sortDirection })
    //   .skip((pageNumber - 1) * limitNumber)
    //   .limit(limitNumber);
    const videos = await Video.aggregate([
      // Match stage: Apply the filter criteria
      {
        $match: {
          ...filter,
          isPublished: true,
        },
      },
      // Lookup stage: Join with the users collection to fetch owner details
      {
        $lookup: {
          from: "users",
          localField: "Owner",
          foreignField: "_id",
          as: "ownerDetail",
        },
      },
      // Unwind the ownerDetail array to have a single object
      {
        $unwind: "$ownerDetail",
      },
      // Sort stage: Sort the results based on sortBy and sortDirection
      {
        $sort: { [sortBy]: sortDirection },
      },
      // Skip stage: Implement pagination (skip documents)
      {
        $skip: (pageNumber - 1) * limitNumber,
      },
      // Limit stage: Limit the number of documents returned
      {
        $limit: limitNumber,
      },
      // Project stage: Select the fields to return
      {
        $project: {
          _id: 1,
          title: 1,
          description: 1,
          thumbnail: 1,
          video: 1,
          views: 1,
          duration: 1,
          "ownerDetail.username": 1,
          "ownerDetail.avatar": 1,
          "ownerDetail._id": 1,
        },
      },
    ]);
    
    

    // Get the total count of videos that match the filter
    const totalVideos = await Video.countDocuments(filter);

    // Send the response
    res.status(200).json(
      new ApiResponse(200, "Data send successfully", {
        success: true,
        data: videos,
        totalVideos,
        totalPages: Math.ceil(totalVideos / limitNumber),
        currentPage: pageNumber,
      })
    );
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }

  // return res.status(200).json(new ApiResponse(200, {}, "fetch successfull"));
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  // console.log(req)
  // TODO: get video, upload to cloudinary, create video
  //uploade vedio on coluinery
  //get url strnig
  //create instence in vedio db
  //return res

  if ([title, description].some((field) => field?.trim() === "")) {
    throw new ApiError(401, "title and description is not provided");
  }
  const existVideo = await Video.findOne({
    $or: [{ title }, { description }],
  });
  if (existVideo) {
    throw new ApiError(402, "title and description is already exist");
  }

  console.log("file recieved: ", req.files);
  console.log("Body received:", req.body);
  const videoLocalPath = req.files?.video[0]?.path;
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
    .json(new ApiResponse(200, videoInstence, "video upload succesfulll"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: get video by id
  //fetch vedio from schema
  //return res
  console.log(req.user._id)
  const video = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId),
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
      $lookup:{
        from:"likes",
        localField:"_id",
        foreignField:"video",
        as:"likes"
      },
    }, 
    {
      $addFields: {
        likeCount: { $size: "$likes" }, // Count the number of likes
        isLikedByUser: {
          $cond: {
            if: {
              $gt: [
                {
                  $size: {
                    $filter: {
                      input: "$likes",
                      as: "like",
                      cond: { $eq: ["$$like.likedBy", req.user._id] }, // Check if the current user has liked the video
                    },
                  },
                },
                0,
              ],
            },
            then: true,
            else: false,
          },
        },
      },
    },
     
    {
      $project: {
        _id: 1,
        title: 1,
        description: 1,
        thumbnail: 1,
        video: 1,
        views: 1,
        duration: 1,
        likeCount:1,
        isLikedByUser:1,
        "ownerDetail.username": 1,
        "ownerDetail.avatar": 1,
        "ownerDetail._id": 1,
      },
    },
  ]);

  if (!video.length) {
    throw new ApiError(400, "video donot exist");
  }
  const user=await User.findById(req.user._id)

  const inWatchHistory = user.watchHistory.find(
    (item) => item.toString() === videoId
  );

  if (!inWatchHistory) {
    console.log("first time watching");
    user.watchHistory.push(videoId);
    await user.save();
    await Video.findByIdAndUpdate(
      videoId,
      { $inc: { views: 1 } },
      { new: true }
    );
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
  const { videoId } = req.params;
  const video = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "Owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $lookup: {
              from: "subscriptions",
              localField: "_id",
              foreignField: "channel",
              as: "subscribers",
            },
          },
          {
            $addFields: {
              subscriberCount: {
                $size: "$subscribers",
              },
              isSubscribed: false,
            },
          },
          {
            $project: {
              subscriberCount: 1,
              isSubscribed: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        likesCount: { $size: "$likes" },
        owner: "$owner",
        isLiked: false,
      },
    },
    {
      $project: {
        video: 1,
        username: 1,
        fullname: 1,
        title: 1,
        description: 1,
        duration: 1,
        likesCount: 1,
        owner: 1,
        isLiked: 1,
        isSubscribed: 1,
      },
    },
  ]);

  if (!video) throw new ApiError(500, "video not found");

  return res
    .status(200)
    .json(new ApiResponse(200, video, "vedio fetched successfully"));
});

const updateVideoViews = asyncHandler(async (req, res) => {
  //fetch user
  //check in watchhistory if vedioId aalready exist
  //if exists then update last viewd time
  //else increment views by 1 and add vedioId to watchhistory
  //return res
  console.log("in update views")
  const { videoId } = req.params;
  console.log(videoId)
  // console.log(typeof videoId);
  // console.log(req.user);
  const userId = req.user._id;
  if (!isValidObjectId(videoId)) throw new ApiError(400, "invalid videoId");
  if (!userId) throw new ApiError(400, "invalid userId");

  const video = await Video.findById(videoId);
  if (!video) throw new ApiError(400, "video  not found ");

  const user = await User.findById(userId);
  // console.log(user.watchHistory);
  const inWatchHistory = user.watchHistory.find(
    (item) => item.toString() === videoId
  );
  // console.log(inWatchHistory);
  if (!inWatchHistory) {
    console.log("first time watching");
    user.watchHistory.push(videoId);
    await user.save();
    await Video.findByIdAndUpdate(
      videoId,
      { $inc: { views: 1 } },
      { new: true }
    );
  } else {
    // console.log("");
    return res
    .status(200)
    .json(new ApiResponse(200, { }, "already watched"));
  }
  return res
    .status(200)
    .json(new ApiResponse(200, { video, user }, "views updated successfully"));
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
