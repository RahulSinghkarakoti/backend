import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
  getNextVideos,
  getVideoByIdForGuest,
  updateVideoViews
} from "../controllers/video.controller.js";

const router = Router();
// router
//   .use(verifyJWT)

router
  .route("/")
  .get(getAllVideos)
  .post(
    upload.fields([ 
      {
        name: "videoFile",
        maxCount: 1,
      },
      {
        name: "thumbnail",
        maxCount: 1,
      },
    ]),
      publishAVideo
  );



router
  .route("/:videoId")
  .get(verifyJWT,getVideoById)
  .delete(verifyJWT,deleteVideo)
  .patch(verifyJWT,upload.single("thumbnail"), updateVideo);

router.route("/toggle/publish/:videoId").patch(verifyJWT,togglePublishStatus);
router.route("/update/views/:videoId").patch( updateVideoViews);

router.route("/next/:videoId").get(getNextVideos);
router.route("/v/guest/:videoId").get(getVideoByIdForGuest);


export default router;
