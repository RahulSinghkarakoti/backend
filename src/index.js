import mongoose from "mongoose";
import { DB_NAME } from "./constant.js";
import dotenv from "dotenv"
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
    path: "./.env"
})

connectDB()
.then(()=>{
    app.listen(process.env.PORT ||3000,()=>{
        console.log(`server is running at port :${process.env.PORT}`)
    })
})
.catch((err)=>console.log("MONGO DB connection Failed :: src/index.js",err))

/*
(async()=>{
    try{
  
       await mongoose.connect(`${process.env.MONOGO_URI}/${DB_NAME}`)
        app.on("error",(error)=>{
            console.log("error:",error)
            throw error
        })
        app.listen(process.env.PORT,()=>{
            console.log(`APP is listening at port: ${process.env.PORT}`)
        })
    }catch(error){
console.log("ERROR:",error)
    }
})()

*/