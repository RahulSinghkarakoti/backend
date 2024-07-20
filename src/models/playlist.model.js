import mongoose, { Schema } from "mongoose";

const playlistSchema = new Schema(
  {
     name:{
        type:String,
        required:true,
     },
     description:{
        type:String,

     },
     vedios:[
        {
            type:Schema.Types.ObjectId,
            ref:"vedio"
        }
     ],
     owner:{
        type:Schema.Types.ObjectId,
        ref:"user"
        }
  },
  { timestamps: true }
);

export const Playlist = mongoose.model("Playlist", playlistSchema);
