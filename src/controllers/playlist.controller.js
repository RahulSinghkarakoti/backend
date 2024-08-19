import mongoose, { isValidObjectId, mongo, Query } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  //TODO: create playlist
  const userId = req.user._id;
  if (!isValidObjectId(userId)) throw new ApiError(400, "invalid user id");

  const isPlaylist = await Playlist.findOne({ name: name });
  if (isPlaylist) {
    throw new ApiError("playlist already exist");
  } else {
    const newPlaylist = await Playlist.create({
      name: name,
      description: description,
      owner: userId,
    });
    if (!newPlaylist) {
      throw new ApiError(500, "error in making new playlist");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, newPlaylist, "Playlist created successfully"));
  }
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  //TODO: get user playlists
  if (!userId) throw new ApiError(400, "userId is required");

  const userPlaylists = await Playlist.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos",
      },
    },
    {
      $addFields: {
        totalVideos: {
          $size: "$videos",
        },
        totalViews: {
          $size: "$videos.views",
        },
        totalDuration: {
          $size: "$videos.duration",
        },
      },
    },
    {
      $project: {
        _id: 1,
        owner: 1,
        name: 1,
        description: 1,
        totalDuration: 1,
        totalVideos: 1,
        totalViews: 1,
        videos: 1,
        updatedAt: 1,
      },
    },
  ]);

  if (!userPlaylists) throw new ApiError("failed to fetch playlist");
  if (userPlaylists.length <= 0){
    return res
    .status(200)
    .json(new ApiResponse(400, {},"no playlists are available"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, userPlaylists, "playlist fetched successfully"));
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  //TODO: get playlist by id
  if (!playlistId) throw new ApiError("playlist Id is required");

  try {
    // const playlist = await Playlist.aggregate([
    //   {
    //     $match: {
    //       _id: new mongoose.Types.ObjectId(playlistId),
    //     },
    //   }, 
    //   {

    //     $lookup: {
    //       from: "videos",
    //       localField: "videos",
    //       foreignField: "_id",
    //       as: "videos",
    //     },
    //   },
    //   {
    //     $match: {
    //       "videos.isPublished": true,
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: "users",
    //       localField: "owner",
    //       foreignField: "_id",
    //       as: "owner",
    //     },
    //   },
    //   {
    //     $addFields: {
    //       totalVideos: {
    //         $size: "$videos",
    //       },
    //       totalViews: {
    //         $cond:{
    //           if:{$gt:[{$size:"$videos"},0]},
    //           then:{$sum:"$videos.views"},
    //           else:0
    //         }
    //       },
    //       totalDuration: {
    //         $cond:{
    //           if:{$gt:[{$size:"$videos"},0]},
    //           then:{$sum: "$videos.duration"},
    //           else:0
    //         }
    //       },
    //     },
    //   },
    //   {
    //     $unwind:{
    //       path:"$owner",
    //       preserveNullAndEmptyArrays: true
    //     }

    //   },
    //   {
    //     $project: {
    //       _id: 1,
    //       name: 1,
    //       description: 1,
    //       totalDuration: 1,
    //       totalVideos: 1,
    //       totalViews: 1,
    //       createdAt: 1,
    //       updatedAt: 1,
    //       videos: {
    //         _id: 1,
    //         title: 1, 
    //         thumbnail: 1,
    //         duration: 1,
    //         views: 1,
    //       },
    //       owner: {
    //         _id: 1,
    //         avatar: 1,
    //         username: 1,
    //         fullname: 1,
    //       },
    //     },
    //   },
    // ]);

    const playlist = await Playlist.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(playlistId),
        },
      },
      {
        $addFields: {
          hasVideos: { $gt: [{ $size: "$videos" }, 0] },
        },
      },
      {
        $lookup: {
          from: "videos",
          let: { videoIds: "$videos", hasVideos: "$hasVideos" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$isPublished", true] },
                    { $in: ["$_id", "$$videoIds"] },
                  ],
                },
              },
            },
          ],
          as: "videos",
        },
      },
      {
        $match: {
          $or: [
            { hasVideos: false },
            { "videos.isPublished": true },
          ],
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
        $addFields: {
          totalVideos: {
            $size: "$videos",
          },
          totalViews: {
            $cond: {
              if: { $gt: [{ $size: "$videos" }, 0] },
              then: { $sum: "$videos.views" },
              else: 0,
            },
          },
          totalDuration: {
            $cond: {
              if: { $gt: [{ $size: "$videos" }, 0] },
              then: { $sum: "$videos.duration" },
              else: 0,
            },
          },
        },
      },
      {
        $unwind: {
          path: "$owner",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          description: 1,
          totalDuration: 1,
          totalVideos: 1,
          totalViews: 1,
          createdAt: 1,
          updatedAt: 1,
          videos: {
            _id: 1,
            title: 1,
            thumbnail: 1,
            duration: 1,
            views: 1,
          },
          owner: {
            _id: 1,
            avatar: 1,
            username: 1,
            fullname: 1,
          },
        },
      },
    ]);
    
    

    
  
   
    // const playlist=await Playlist.findById(playlistId)
    // console.log(playlist);
    if (!playlist) throw new ApiError(500, "failed to fetch playlist");
  
    return res
      .status(200)
      .json(new ApiResponse(200, playlist, "playlist fetched successfully"));
  } catch (error) {
    new ApiError(500,"pipeline failed "+error)
    
  }
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

  if (!isValidObjectId(playlistId))
    throw new ApiError(400, "invalid playlist Id");
  if (!isValidObjectId(videoId)) throw new ApiError(400, "invalid video Id");

  const checkPlaylist = await Playlist.findById(playlistId);
  if (!checkPlaylist) throw new ApiError(500, "playlist not found");

  const checkVideo = await Video.findById(videoId);
  if (!checkVideo) throw new ApiError(500, "Video not found");

  if (checkPlaylist.owner?._id.toString() !== req.user?._id.toString())
    throw new ApiError(400, "only owner can add video to their playlist");

  const updatePlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    { $addToSet: { videos: videoId } },
    { new: true }
  );

  if (!updatePlaylist)
    throw new ApiError(500, "failed to add video to the playlist");

  return res
    .status(200)
    .json(new ApiResponse(200, updatePlaylist, "video is added to playlist "));
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  // TODO: remove video from playlist
  if (!isValidObjectId(playlistId))
    throw new ApiError(400, "invalid playlist Id");
  if (!isValidObjectId(videoId)) throw new ApiError(400, "invalid video Id");

  const checkPlaylist = await Playlist.findById(playlistId);
  if (!checkPlaylist) throw new ApiError(500, "playlist not found");

  const checkVideo = await Video.findById(videoId);
  if (!checkVideo) throw new ApiError(500, "Video not found");

  if (checkPlaylist.owner?._id.toString() !== req.user?._id.toString())
    throw new ApiError(400, "only owner can remove video from  their playlist");

  const updatePlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    { $pull: { videos: videoId } },
    { new: true }
  );

  if (!updatePlaylist)
    throw new ApiError(500, "failed to remove video from the playlist");

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatePlaylist, "video is removed from playlist ")
    );
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  // TODO: delete playlist
  if (!isValidObjectId(playlistId))
    throw new ApiError(400, "invalid playlist Id");

  const checkPlaylist = await Playlist.findById(playlistId);
  if (!checkPlaylist) throw new ApiError(500, "playlist not found");

  if (checkPlaylist.owner?._id.toString() !== req.user?._id.toString())
    throw new ApiError(400, "only owner can remove video to their playlist");

  const deletePlaylist = await Playlist.findByIdAndDelete(playlistId);

  if (!deletePlaylist) throw new ApiError(500, "failed to delete playlist");

  return res
    .status(200)
    .json(new ApiResponse(200, deletePlaylist, "playlist is deleted "));
});

const updatePlaylist = asyncHandler(async (req, res) => {
  //TODO: update playlist
  const { playlistId } = req.params;
  const { name, description } = req.body;

  if (!isValidObjectId(playlistId))
    throw new ApiError(400, "invalid playlist Id");

  const checkPlaylist = await Playlist.findById(playlistId);
  if (!checkPlaylist) throw new ApiError(500, "playlist not found");

  if (checkPlaylist.owner?._id.toString() !== req.user?._id.toString())
    throw new ApiError(400, "only owner can update their playlist");

  const updatePlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    { name, description },
    { new: true }
  );
  if (!updatePlaylist) throw new ApiError(500, "failed to fetch playlist");
  return res.status(200).json(new ApiResponse(200, updatePlaylist, "done"));
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
