import express from 'express';
import dotenv from 'dotenv';
import router from './routes/videoRoutes';
import trimRouter from './routes/trimRoute';
import subTitleRouter from './routes/subtitile';
import renderRoute from './routes/renderRoute';



dotenv.config();
const app = express();


app.use(express.json());
app.use('/api/videos',router);
app.use('/api/videos' , trimRouter)
app.use('/api/videos' , subTitleRouter)
app.use('/api/videos' , renderRoute)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));