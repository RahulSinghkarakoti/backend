import express, { json } from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import bodyParser from "body-parser"
const app=express()

//use method is used to implement midelwears (cors,cookieparse)
app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true,
}))

app.use(express.json({limit:"50kb"}))//limit the json resp from user

app.use(express.urlencoded({   
extended:true//used to send nestedd object ........ not necesary
,limit:'16kb'
}))

app.use(express.static('public'))


app.use(bodyParser.json());

app.use(cookieParser());//use to perform CRUD operation on cookies_at user device

//import routes
import userRouter from "./routes/user.routes.js"
import videoRouter from "./routes/video.routes.js"
import commentRouter from "./routes/comment.routes.js"
import likeRouter from "./routes/like.routes.js"
import tweetRouter from "./routes/tweet.routes.js"

//routes declaration
app.use('/api/v1/users',userRouter) 
app.use('/api/v1/video',videoRouter) 
app.use("/api/v1/comments", commentRouter)
app.use("/api/v1/like", likeRouter)
app.use("/api/v1/tweet", tweetRouter)

export {app}