import express, { json } from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

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

app.use(cookieParser())//use to perform CRUD operation on cookies_at user device

//import routes
import userRouter from "./routes/user.routes.js"

//routes declaration
app.use('/api/v1/users',userRouter) 

export {app}