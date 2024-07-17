import { Router } from "express"
import { upload } from "../middlewares/multer.middleware.js"
import { loginUser, logoutUser, registerUser } from "../controllers/user.controller.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"

const router=Router()

router.route("/register").post(
    upload.fields([    //middleware
        {
            name: "avatar",
            maxCount:1
        },
        {
            name: "coverImage",
            maxCount:1
        }
]),

    registerUser  
)

router.route("/login").post(loginUser)

//secured route
router.route("/logOut").post(
    verifyJWT          //middleware
    ,logoutUser)

export default router