import { Router } from "express"
import { upload } from "../middlewares/multer.middleware.js"
import { loginUser, logoutUser, registerUser,refreshAccessToken } from "../controllers/user.controller.js"
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

// router.route("/login").post(loginUser)

router.route("/login").post(loginUser)

//secured route
router.route("/logout").post(verifyJWT,  logoutUser)
router.route("/refresh-token").post(refreshAccessToken)

export default router