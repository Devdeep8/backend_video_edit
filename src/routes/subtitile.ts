import express from "express";
import { addSubtitle } from "../controllers/videoController";


const subTitleRouter = express.Router();

// Original subtitle endpoint
subTitleRouter.post("/:id/subtitles", addSubtitle);

export default subTitleRouter;
