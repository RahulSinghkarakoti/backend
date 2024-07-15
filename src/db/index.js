import mongoose from "mongoose";
import { DB_NAME } from "../constant.js";

const connectDB=async ()=>{
    try {
       const connectionInstance = await mongoose.connect(`${process.env.MONOGO_URI}/${DB_NAME}`)
       console.log(`\n MongoDB connected !! DB HOST :${connectionInstance.connection.host}`)

    } catch (error) {
        console.log("MONGODB conection FAILED:",error);
        process.exit(1)
    }
}

export default connectDB;