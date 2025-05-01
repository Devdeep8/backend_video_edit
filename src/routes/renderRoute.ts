import { Router } from "express";
import { downloadVideo, triggerRender } from "../controllers/videoController";

const renderRoute = Router()


renderRoute.post("/:id/render", triggerRender);
renderRoute.get("/:id/download" , downloadVideo)

export default renderRoute;