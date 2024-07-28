import mongoose from "mongoose"
import {Video} from "../models/video.model.js"
import {Subscription} from "../models/subscription.model.js"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
    const userId=req.user?._id
    
    const totalSubscribers=await Subscription.aggregate([
        {
            $match:{
                channel:new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $group:{
                _id:null,// Group all documents into a single group.
                subscribersCount:{
                    $sum:1 // Count each document by adding 1 for each.
                }
            }
        }
    ])

    if(!totalSubscribers)
        throw new ApiError(500,"failed to fetch total subscriber")

    const videoStats=await Video.aggregate([
        {
            $match:{
                Owner:new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup:{
                from:"likes",
                localField:"_id",
                foreignField:"video",
                as:"Likes"
            },
        },
        {
            $project:{           //it for a single video
                totalVideo:1,
                totalLikes:{
                    $size:"$Likes"
                },
                totalViews:"$views"
            }
        },
        {
            $group:{
                _id:null,
                totalVideo:{
                    $sum:1
                },
                totalLikes:{
                    $sum:"$totalLikes"
                },
                totalViews:{
                    $sum:"$totalViews"
                }
            }
        }
    ])

    if(!videoStats)
        throw new ApiError(500,"failed to fetch total video, likes and views")

    console.log(videoStats,totalSubscribers)

    const channelStats={
        totalSubscribers:totalSubscribers[0]?.subscribersCount || 0,
        totalViews:videoStats[0]?.totalViews || 0,
        totalLikes:videoStats[0]?.totalLikes || 0,
        totalVideo:videoStats[0]?.totalVideo || 0,
    };

    return res.status(200).json(
        new ApiResponse(200,channelStats,"stats fetched successfully")
    )
})

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel
    const userId=req.user?._id

    try {
        const channelVideos=await Video.aggregate([
            {
                $match:{
                    Owner:new mongoose.Types.ObjectId(userId)
                }
            },
            {
                $lookup:{
                    from:"likes",
                    localField:"_id",
                    foreignField:"video",
                    as:"Likes"
                }
            },
            {
                $addFields:{
                    totalLikes:{
                        $size:"$Likes"
                    }
                }
            },
            {
                $sort:{
                    createdAt:-1.
                }
            },
            {
                $project:{
                    _id:1,
                    video:1,
                    thumbnail:1,
                    duration:1,
                    views:1,
                    title:1,
                    isPublished:1,
                    createdAt:1,
                }
            }
        ])
    
        if(!channelVideos)
            throw new ApiError(500,"failed to fetch channel videos")
    
        return res.status(200).json(
            new ApiResponse(200,channelVideos,"channel videos fetching successfull")
        )
    } catch (error) {
        throw new ApiError(500,"error in pipeline",error)
        
    }
})

export {
    getChannelStats, 
    getChannelVideos
    }