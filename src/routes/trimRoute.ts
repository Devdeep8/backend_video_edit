import express from 'express';
import { trimVideo } from '../controllers/videoController';

const trimRouter = express.Router();

trimRouter.post('/:id/trim', trimVideo);

export default trimRouter;
