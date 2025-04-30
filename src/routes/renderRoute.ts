import { Router } from "express";
import { triggerRender } from "../controllers/videoController";

const renderRoute = Router()


renderRoute.post("/:id/render", triggerRender);

export default renderRoute;