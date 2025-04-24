import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const fileName = `${Date.now()}${ext}`; // Fixed typo (extra closing curly brace)
        cb(null, fileName);
    },
});

export const upload = multer({ storage });
