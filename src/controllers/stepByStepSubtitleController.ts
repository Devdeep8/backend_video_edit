import { Request, Response } from "express";
import ffmpeg from "fluent-ffmpeg";
import { prisma } from "../lib/prisma";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

/**
 * Add subtitles to a video using a step-by-step approach
 */
export const addSubtitle = async (req: Request, res: Response): Promise<void> => {
  try {
    // Step 1: Extract data from the request
    console.log("Step 1: Extracting data from request");
    const videoId = req.params.id;
    const { subTitle, start, end } = req.body;
    
    // Validate input data
    if (!videoId || !subTitle || typeof start !== 'number' || typeof end !== 'number') {
      console.error("Invalid input data:", { videoId, subTitle, start, end });
      res.status(400).json({ 
        error: "Invalid input data", 
        message: "Please provide videoId, subTitle, start and end time" 
      });
      return;
    }
    
    console.log("Request data:", { videoId, subTitle, start, end });

    // Step 2: Find the video in the database
    console.log("Step 2: Finding video in database");
    const video = await prisma.video.findUnique({ where: { id: videoId } });
    
    if (!video) {
      console.error("Video not found with ID:", videoId);
      res.status(404).json({ message: "Video not found" });
      return;
    }
    
    console.log("Video found:", video);

    // Step 3: Set up file paths
    console.log("Step 3: Setting up file paths");
    const rootDir = process.cwd();
    console.log("Root directory:", rootDir);
    
    // Get input video path (use the stored path directly)
    const inputPath = video.filePath;
    console.log("Input video path:", inputPath);
    
    // Check if input file exists
    if (!fs.existsSync(inputPath)) {
      console.error("Input video file not found at path:", inputPath);
      res.status(404).json({ error: "Video file not found on disk" });
      return;
    }
    
    // Set up output directory and file name
    const outputDir = path.join(rootDir, "uploads", "subtitled");
    const timestamp = Date.now();
    const fileName = `subtitled_${timestamp}.mp4`;
    const outputPath = path.join(outputDir, fileName);
    
    console.log("Output directory:", outputDir);
    console.log("Output file path:", outputPath);

    // Step 4: Ensure output directory exists
    console.log("Step 4: Ensuring output directory exists");
    if (!fs.existsSync(outputDir)) {
      console.log("Creating output directory:", outputDir);
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Step 5: Set up font path
    console.log("Step 5: Setting up font path");
    const fontPath = path.join(rootDir, "font", "OpenSans-Regular.ttf");
    console.log("Font path:", fontPath);
    
    // Check if font file exists
    if (!fs.existsSync(fontPath)) {
      console.error("Font file not found at path:", fontPath);
      res.status(500).json({ error: "Font file not found" });
      return;
    }

    // Step 6: Prepare subtitle text (clean and escape)
    console.log("Step 6: Preparing subtitle text");
    // Remove problematic characters and escape quotes
    const cleanText = subTitle
      .replace(/[\\]/g, "") // Remove backslashes
      .replace(/'/g, "") // Remove single quotes
      .replace(/"/g, "") // Remove double quotes
      .replace(/:/g, "\\:"); // Escape colons for FFmpeg
    
    console.log("Original subtitle text:", subTitle);
    console.log("Cleaned subtitle text:", cleanText);

    // Step 7: Create FFmpeg command
    console.log("Step 7: Creating FFmpeg command");
    
    // Convert Windows paths to FFmpeg-compatible paths (forward slashes)
    const ffmpegFontPath = fontPath.replace(/\\/g, "/");
    const ffmpegInputPath = inputPath.replace(/\\/g, "/");
    const ffmpegOutputPath = outputPath.replace(/\\/g, "/");
    
    // Create the FFmpeg command
    const ffmpegCommand = `ffmpeg -y -i "${ffmpegInputPath}" -vf "drawtext=fontfile=${ffmpegFontPath}:text=${cleanText}:fontcolor=white:fontsize=24:x=(w-text_w)/2:y=h-50:enable='between(t,${start},${end})'" -c:v libx264 -c:a aac "${ffmpegOutputPath}"`;
    
    console.log("FFmpeg command:", ffmpegCommand);

    // Step 8: Execute FFmpeg command
    console.log("Step 8: Executing FFmpeg command");
    try {
      const { stdout, stderr } = await execPromise(ffmpegCommand);
      
      if (stdout) console.log("FFmpeg stdout:", stdout);
      if (stderr) console.log("FFmpeg stderr:", stderr);
      
      // Check if output file was created
      if (!fs.existsSync(outputPath)) {
        throw new Error("FFmpeg did not create output file");
      }
      
      console.log("FFmpeg processing completed successfully");
    } catch (error : any) {
      console.error("FFmpeg execution error:", error.message);
      res.status(500).json({ 
        error: "Failed to process video with FFmpeg", 
        details: error.message 
      });
      return;
    }

    // Step 9: Update database with new video path
    console.log("Step 9: Updating database with new video path");
    try {
      const updatedVideo = await prisma.video.update({
        where: { id: videoId },
        data: { 
          filePath: outputPath, 
          status: "subtitled" 
        },
      });
      
      console.log("Database updated successfully:", updatedVideo);
    } catch (error : any) {
      console.error("Database update error:", error);
      res.status(500).json({ 
        error: "Failed to update database", 
        details: error.message 
      });
      return;
    }

    // Step 10: Send success response
    console.log("Step 10: Sending success response");
    res.status(200).json({
      message: "Subtitle added successfully",
      path: outputPath,
    });
    
  } catch (error : any) {
    console.error("Unexpected error:", error);
    res.status(500).json({ 
      error: "Internal server error", 
      details: error.message 
    });
  }
};