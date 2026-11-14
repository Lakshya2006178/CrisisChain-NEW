import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Uploads directory: server/uploads/incidents
const UPLOADS_DIR = path.resolve(__dirname, '../uploads/incidents');

// Ensure upload directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    // Generate safe, unique filename: incident-<timestamp>-<random><ext>
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `incident-${uniqueSuffix}${ext}`);
  }
});

// File filter: Accept common image formats only
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg'];
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedMimes.includes(file.mimetype) && allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, WEBP, and GIF images are permitted.'), false);
  }
};

// Multer upload instance
export const uploadIncidentImage = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Wrapper middleware to gracefully catch Multer errors (file size, format) and return 400
export const handleIncidentUpload = (fieldName = 'image') => {
  const upload = uploadIncidentImage.single(fieldName);
  return (req, res, next) => {
    upload(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'Uploaded image exceeds maximum size of 10MB.' });
        }
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      } else if (err) {
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  };
};

export default handleIncidentUpload;

