import { Worker, Job } from "bullmq";
import { prisma } from "../lib/prisma";
import { redisConnection } from "../lib/redis";
import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs";

// Create the worker that processes render jobs
const renderWorker = new Worker(
  "render",
  async (job: Job) => {
    const { videoId } = job.data;

    console.log("workin new time ")
    // Fetch video data from database
    const video = await prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      throw new Error(`Video with ID ${videoId} not found.`);
    }

    // Define the input path for the video (trimmedPath or original filePath)
    const inputPath = video.trimmedPath
      ? path.isAbsolute(video.trimmedPath)  // Check if it's absolute
        ? video.trimmedPath  // Use as-is
        : path.join(process.cwd(), video.trimmedPath)  // Otherwise, prepend with cwd
      : path.join(process.cwd(), "uploads", video.filePath);

    const outputFilename = `rendered-${Date.now()}.mp4`;
    const outputPath = path.join(process.cwd(), "renders", outputFilename);

    console.log("Input path:", inputPath);
    console.log("Output path:", outputPath);

    // Ensure the 'renders' directory exists
    if (!fs.existsSync(path.dirname(outputPath))) {
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    }

    // Run FFmpeg to render the video
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          "-c:v libx264", // Video codec
          "-preset veryfast", // Speed/quality preset
          "-crf 23", // Constant Rate Factor for quality
          "-c:a aac", // Audio codec
        ])
        .on("start", (cmd) => {
          console.log("FFmpeg started with command:", cmd); // Log FFmpeg command
        })
        .on("end", () => {
          console.log("FFmpeg render completed successfully");
          resolve(); // Mark render as complete
        })
        .on("error", (err) => {
          console.error("FFmpeg error:", err); // Log any errors
          reject(err); // Reject the promise if there's an error
        })
        .save(outputPath); // Save the rendered file
    });

    // Update the database status and store the rendered file path
    await prisma.video.update({
      where: { id: videoId },
      data: {
        status: "rendered", // Mark as rendered
        trimmedPath: outputFilename, // Save the rendered video path
      },
    });

    console.log(`Video ${videoId} rendered successfully`);
  },
  { connection: redisConnection }
);

// Event listeners for job completion and failure
renderWorker.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

renderWorker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);
});
