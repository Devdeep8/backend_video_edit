import { Request, Response } from "express";
import ffmpeg from "fluent-ffmpeg"; // Import fluent-ffmpeg
import { prisma } from "../lib/prisma";
import path from "path";
import fs from "fs";

export const uploadVideo = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    console.log(req.body);
    const file = req.file;

    if (!file) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }

    // Get the file path (the location where the file is stored)
    const filePath = file.path;

    // Get video duration using fluent-ffmpeg
    const getVideoDuration = (filePath: string): Promise<number> => {
      return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
          if (err) {
            reject(err);
          } else {
            const duration = metadata.format.duration; // In seconds
            resolve(duration as number);
          }
        });
      });
    };

    // Get the video duration
    const duration = await getVideoDuration(filePath);

    // Create the video record in the database
    const newVideo = await prisma.video.create({
      data: {
        name: file.originalname,
        size: file.size,
        filePath: file.path,
        duration: duration // Store the duration
      }
    });

    res.status(201).json(newVideo);
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Failed to upload video" });
  }
};

export const trimVideo = async (req: Request, res: Response): Promise<void> => {
  try {
    const videoId = req.params.id;
    const { start, end } = req.body;

    if (typeof start !== "number" || typeof end !== "number" || end <= start) {
      res.status(400).json({ error: "Invalid start/end times" });
      return;
    }

    const video = await prisma.video.findUnique({ where: { id: videoId } });

    if (!video) {
      res.status(404).json({ error: "Video not found" });
      return;
    }

    console.log(video);

    const inputPath = video.filePath;
    const trimmedDir = path.join(__dirname, "../../uploads/trimmed");
    const trimmedFilename = `trimmed-${Date.now()}-${path.basename(inputPath)}`;
    const outputPath = path.join(trimmedDir, trimmedFilename);

    if (!fs.existsSync(trimmedDir)) {
      fs.mkdirSync(trimmedDir, { recursive: true });
    }

    ffmpeg(inputPath)
      .setStartTime(start)
      .setDuration(end - start)
      .output(outputPath)
      .on("end", async () => {
        await prisma.video.update({
          where: { id: videoId },
          data: { trimmedPath: outputPath }
        });

        res
          .status(200)
          .json({ message: "Video trimmed", trimmedPath: outputPath });
      })
      .on("error", err => {
        console.error("FFmpeg error:", err);
        res.status(500).json({ error: "Trimming failed" });
      })
      .run();
  } catch (error) {
    console.error("Trim error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
