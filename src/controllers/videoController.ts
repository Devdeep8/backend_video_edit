import { Request, Response } from "express";
import ffmpeg from "fluent-ffmpeg"; // Import fluent-ffmpeg
import { prisma } from "../lib/prisma";
import path from "path";
import fs from "fs";
import { renderQueue } from "../queues/render.queue";

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
        duration: duration, // Store the duration
      },
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
          data: { trimmedPath: outputPath },
        });

        res
          .status(200)
          .json({ message: "Video trimmed", trimmedPath: outputPath });
      })
      .on("error", (err) => {
        console.error("FFmpeg error:", err);
        res.status(500).json({ error: "Trimming failed" });
      })
      .run();
  } catch (error) {
    console.error("Trim error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
export const addSubtitle = async (req: Request, res: Response): Promise<void> => {
  const videoId = req.params.id;
  const { subtitleText, start, end } = req.body;

  try {
    // Fetch video record
    const video = await prisma.video.findUnique({ where: { id: videoId } });
    if (!video) {
      res.status(404).json({ message: "Video not found" });
      return;
    }

    // Prepare paths
    const inputPath = path.resolve(video.filePath);
    const subsDir = path.resolve("uploads", "subtitles");
    const srtName = `subtitle_${Date.now()}.srt`;
    const srtPath = path.join(subsDir, srtName);
    const outDir = path.resolve("uploads", "subtitled");
    const outName = `subtitled_${Date.now()}.mp4`;
    const outputPath = path.join(outDir, outName);

    // Ensure directories exist
    [subsDir, outDir].forEach((dir) => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });

    // Write SRT file
    const toTimestamp = (s: number) =>
      new Date(s * 1000).toISOString().substr(11, 12).replace(".", ",");
    const srtContent = `1
${toTimestamp(start)} --> ${toTimestamp(end)}
${subtitleText}
`;
    fs.writeFileSync(srtPath, srtContent);

    console.log("Input:", inputPath);
    console.log("SRT Path:", srtPath);
    console.log("Output:", outputPath);

    // Run FFmpeg to burn subtitles into the video
    ffmpeg(inputPath)
      .outputOptions([
        "-vf", `subtitles='${srtPath.replace(/\\/g, "/")}'`, // IMPORTANT: Burn subtitles
        "-c:v libx264",
        "-preset veryfast",
        "-crf 23",
        "-c:a copy",
        "-y", // Overwrite output
      ])
      .on("start", (commandLine) => {
        console.log("FFmpeg command:", commandLine);
      })
      .on("stderr", (stderrLine) => {
        console.log("FFmpeg stderr:", stderrLine);
      })
      .on("error", (err) => {
        console.error("FFmpeg error:", err.message);
        res.status(500).json({ error: "Failed to add subtitles" });
      })
      .on("end", async () => {
        // Update video record
        await prisma.video.update({
          where: { id: videoId },
          data: { filePath: outputPath, status: "subtitled" },
        });
        res.status(200).json({ message: "Subtitles added and burned", path: outputPath });
      })
      .save(outputPath);
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const triggerRender = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    // Find the video by ID
    const video = await prisma.video.findUnique({
      where: { id },
    });

    // Handle case where video is not found
    if (!video) {
      res.status(404).json({ error: "Video not found" });
      return;
    }

    // Add render job to queue
    await renderQueue.add("render", {
      videoId: id,
    });

    // Optional: Update video status to "processing"
    await prisma.video.update({
      where: { id },
      data: {
        status: "processing",
      },
    });

    // Respond to client with success message
    res.json({ message: "Render job queued successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};


export const downloadVideo = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const video = await prisma.video.findUnique({
      where: { id },
    });

    if (!video) {
      res.status(404).json({ error: "Video not found" });
      return;
    }

    if (!video.trimmedPath) {
      res.status(400).json({ error: "Rendered video not available yet" });
      return;
    }

    const renderedPath = path.join(process.cwd(), "renders", video.trimmedPath);

    if (!fs.existsSync(renderedPath)) {
      res.status(404).json({ error: "Rendered file not found on server" });
      return;
    }

    res.download(renderedPath, (err) => {
      if (err) {
        console.error("Error sending file:", err);
        res.status(500).json({ error: "Error sending file" });
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};


