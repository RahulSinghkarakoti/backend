import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  // TODO: toggle subscription
  const userId = req.user._id;
  // (userId, channelId);
  
  if (userId == channelId)
    throw new ApiError(400, "You can't subscribe to yourself");

  const isSubscribed = await Subscription.findOne({
    channel: channelId,
    subscriber: userId,
  });

  if (isSubscribed) {
    await Subscription.findByIdAndDelete(isSubscribed?._id);
    return res
      .status(200)
      .json(new ApiResponse(200, "Subscription deleted successfully"));
  } else {
    await Subscription.create({
      channel: channelId,
      subscriber: userId,
    });
    return res
      .status(200)
      .json(new ApiResponse(200, "Subscription created successfully"));
  }
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  const channelSubscribers = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscriber",
        pipeline: [
          {
            $lookup: {
              from: "subscriptions",
              localField: "_id",
              foreignField: "channel",
              as: "subscribedToSubscriber",
            },
          },
          {
            $addFields: {
              subscribedToSubscriber: {
                $cond: {
                  if: {
                    $in: [channelId, "$subscribedToSubscriber.subscriber"],
                  },
                  then: true,
                  else: false,
                },
              },
              subscriberCount: {
                $size: "$subscribedToSubscriber",
              },
            },
          },
        ],
      },
    },
    {
      $unwind: "$subscriber",
    },
    {
      $project: {
        _id: 0,
        subscriber: {
          _id: 1,
          username: 1,
          fullname: 1,
          avatar: 1,
          subscriberCount: 1,
          subscribedToSubscriber: 1,
        },
      },
    },
  ]);

   
  

  if (!channelSubscribers)
    throw new ApiError(500, "failed to fetch subscribers");

  return res
    .status(200)
    .json(
      new ApiResponse(200, channelSubscribers, "subcriber fetched succesfull")
    );
});

 
// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params;
  
    
    const subscribedChannels = await Subscription.aggregate([
      {
        $match: {
          subscriber: new mongoose.Types.ObjectId(subscriberId),
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "channel",
          foreignField: "_id",
          as: "subscribedChannel",
          pipeline: [
            {
              $lookup: {
                from: "videos",
                let: { channelId: "$_id" },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ["$owner", "$$channelId"] },
                          { $eq: ["$isPublished", true] },
                        ],
                      },
                    },
                  },
                  {
                    $sort: { createdAt: -1 },
                  },
                  {
                    $limit: 1,
                  },
                ],
                as: "videos",
              },
            },
            {
              $addFields: {
                latestVideo: {
                  $arrayElemAt: ["$videos", 0],
                },
              },
            },
            {
              $project: {
                videos: 0, // Exclude the "videos" array after extracting "latestVideo"
              },
            },
          ],
        },
      },
      {
        $unwind: "$subscribedChannel",
      },
      {
        $project: {
          _id: 0,
          subscribedChannel: {
            _id: 1,
            username: 1,
            fullname: 1,
            avatar: 1,
            latestVideo: {
              _id: 1,
              video: 1,
              thumbnail: 1,
              owner: 1,
              title: 1,
              description: 1,
              duration: 1,
              createdAt: 1,
              views: 1,
            },
          },
        },
      },
    ]);
    
  
    if (!subscribedChannels)
      throw new ApiError(501, "Failed to fetch Subscribed Channels");
  
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          subscribedChannels,
          "subscribed channels fetched successfully"
        )
      );
  });

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
