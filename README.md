# 🎬 Video Editing Platform – Backend

A scalable and modular backend system for a web-based video editing platform, built with **Node.js**, **Express**, **PostgreSQL**, and **FFmpeg**. This backend allows users to upload videos, perform editing operations like trimming, subtitle overlay, and rendering, and download the final video—all through clean, RESTful APIs.

> 💡 Built with extensibility, modularity, and production-readiness in mind.

---

## 🚀 Features

- ✅ Upload videos via API
- ✂️ Trim videos with customizable timestamps
- 📝 Add subtitles with precise time intervals
- 🧩 Render final video with applied edits
- ⬇️ Download the final processed video
- 🗃️ Local or cloud (S3-ready) storage support
- 🛠️ Prisma ORM for PostgreSQL
- 📦 Multer for file uploads
- 🎞️ FFmpeg (via fluent-ffmpeg) for video transformations

---

## 📁 Project Structure

video-editor-backend/ ├── controllers/ # API logic (upload, trim, subtitle, render, download) ├── routes/ # API endpoint definitions ├── services/ # FFmpeg logic, subtitle generator, video processing helpers ├── prisma/ # Prisma schema and migrations ├── uploads/ # Video storage (local dev) ├── utils/ # Utility functions ├── app.ts # Express server setup ├── ffmpeg.ts # FFmpeg config and wrappers ├── prismaClient.ts # Singleton Prisma client ├── README.md

yaml
Copy
Edit

---

## ⚙️ Tech Stack

| Tech         | Purpose                        |
|--------------|--------------------------------|
| Node.js      | Backend runtime                |
| Express.js   | API routing                    |
| Prisma       | PostgreSQL ORM                 |
| Multer       | Video file handling            |
| FFmpeg       | Core video editing engine      |
| PostgreSQL   | Database                       |
| BullMQ + Redis *(optional)* | Background video rendering |

---

## 📦 API Endpoints

### 📤 Upload Video
**`POST /api/videos/upload`**

- Upload `.mp4`, `.mov` formats
- Metadata saved to DB
- Video saved to `/uploads/` or S3

---

### ✂️ Trim Video
**`POST /api/videos/:id/trim`**

- Accepts `start` and `end` time in seconds
- Trims and saves new video
- DB is updated with the trimmed file path

---

### 📝 Add Subtitles
**`POST /api/videos/:id/subtitles`**

- Accepts `subtitleText`, `start`, `end`
- Generates temporary `.srt` file
- Uses FFmpeg to burn subtitles into the video

---

### 🧩 Render Final Video
**`POST /api/videos/:id/render`**

- Merges all changes (trimmed + subtitles)
- Saves the final edited video
- Updates video `status = rendered`
- (Optional) Triggers via background queue (BullMQ)

---

### ⬇️ Download Video
**`GET /api/videos/:id/download`**

- Returns final rendered video file
- Set appropriate headers for video download

---

## 🛠️ Local Setup

### 1. Clone the Repo
```bash
git clone https://github.com/your-username/video-editor-backend.git
cd video-editor-backend
2. Install Dependencies
bash
Copy
Edit
yarn install
3. Setup Environment Variables
Create a .env file with the following:

env
Copy
Edit
DATABASE_URL=postgresql://user:password@localhost:5432/video_editor
PORT=3000
4. Setup Prisma & DB
bash
Copy
Edit
npx prisma migrate dev --name init
5. Start the Server
bash
Copy
Edit
yarn dev
📽️ Demo Video
📹 Google Drive Demo (with voice-over)

Includes full walk-through:

Uploading a video

Trimming

Subtitle overlay

Rendering and downloading final video

Explanation of folder structure and challenges

🧠 Architectural Highlights
Modular service structure: Easy to extend with new features like audio editing or overlays.

Clean Prisma integration: All video metadata managed with robust DB schema.

FFmpeg abstraction: Central utility to handle all command pipelines cleanly.

Error-handling and edge-case resilience: Handles missing inputs, invalid formats, and unexpected failures.

📌 Future Enhancements
 Add support for image overlays and audio tracks

 AWS S3 integration for uploads/downloads

 Add BullMQ + Redis job queue for rendering tasks

 Add Swagger documentation

 Role-based auth system for video access

👨‍💻 Author
Devesh
Backend Developer
🌍 Mandsaur, India
📧 Email
📱 LinkedIn