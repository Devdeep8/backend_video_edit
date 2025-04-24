import express from 'express';
import { upload } from '../middleware/uploadMiddleware';
import { uploadVideo } from '../controllers/videoController';


const router = express.Router();

router.post('/upload', upload.single('file'), uploadVideo);

export default router;
