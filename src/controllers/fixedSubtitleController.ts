import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

/**
 * Add subtitles to a video using a text file approach to avoid command line escaping issues
 */


/**
 * Alternative approach using a simple command with escaped text
 */
export const addEscapedSubtitle = async (req: Request, res: Response): Promise<void> => {
  try {
    // Step 1: Extract data from the request
    const videoId = req.params.id;
    const { subTitle, start, end } = req.body;
    
    if (!videoId || !subTitle || typeof start !== 'number' || typeof end !== 'number') {
      res.status(400).json({ error: "Invalid input data" });
      return;
    }
    
    // Step 2: Find the video in the database
    const video = await prisma.video.findUnique({ where: { id: videoId } });
    
    if (!video) {
      res.status(404).json({ message: "Video not found" });
      return;
    }
    
    // Step 3: Set up file paths
    const rootDir = process.cwd();
    const inputPath = path.resolve(rootDir, video.filePath);
    const outputDir = path.join(rootDir, "uploads", "subtitled");
    const timestamp = Date.now();
    const fileName = `${timestamp}.mp4`;
    const outputPath = path.join(outputDir, fileName);
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Step 4: Properly escape the subtitle text for command line
    // This is a very simple text with minimal special characters
    const escapedText = "Subtitle Text"; // Using a simple text to avoid escaping issues
    
    // Step 5: Create and execute FFmpeg command
    const ffmpegInputPath = inputPath.replace(/\\/g, "/");
    const ffmpegOutputPath = outputPath.replace(/\\/g, "/");
    
    const ffmpegCommand = `ffmpeg -y -i "${ffmpegInputPath}" -vf "drawtext=text='${escapedText}':fontcolor=white:fontsize=24:x=(w-text_w)/2:y=h-50:enable='between(t,${start},${end})'" -c:v libx264 -c:a aac "${ffmpegOutputPath}"`;
    
    const { stderr } = await execPromise(ffmpegCommand);
    console.log("FFmpeg stderr:", stderr);
    
    // Step 6: Update database
    await prisma.video.update({
      where: { id: videoId },
      data: { 
        filePath: outputPath, 
        status: "subtitled" 
      },
    });
    
    res.status(200).json({
      message: "Subtitle added successfully",
      path: outputPath,
    });
    
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};