import mongoose, { mongo, Schema } from "mongoose"

const subscriptionSchema=new mongoose.Schema(
    {
       suscriber:{
        type:Schema.Types.ObjectId,//one who is subscribing
        ref:'User' 
       },
       channel:{
        type:Schema.Types.ObjectId,//one to who is subscriber is subscribing (a user subscribing a user)
        ref:'User' 
       }
       
    }
    ,{timestamps:true})

export const Subscription = mongoose.model("Sunscription",subscriptionSchema)