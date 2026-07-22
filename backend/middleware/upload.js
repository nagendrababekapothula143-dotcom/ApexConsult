const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { bucket } = require('../config/firebase');

// File filter to allow only PDFs and Docs
const fileFilter = (req, file, cb) => {
  const filetypes = /pdf|doc|docx/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (extname || mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only resumes (.pdf, .doc, .docx) are allowed!'));
  }
};

// Memory storage for S3 uploads
const memoryStorage = multer.memoryStorage();
const uploadMemory = multer({
  storage: memoryStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter,
}).single('resume');

// Create uploads folder if it doesn't exist (for local fallback - DISABLED on Vercel)
const uploadsDir = path.join(__dirname, '../uploads');
const isServerless = process.env.VERCEL || process.env.NODE_ENV === 'production';
if (!isServerless && !fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Disk storage for local fallback
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`);
  },
});

const uploadDisk = multer({
  storage: diskStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter,
}).single('resume');

const handleUpload = (req, res, next) => {
  if (bucket) {
    // Process Firebase Storage Upload
    uploadMemory(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }

      if (!req.file && req.body.requestAssistance !== 'true') {
        return res.status(400).json({ success: false, message: 'Please upload a resume file' });
      }

      if (req.body.requestAssistance === 'true' && !req.file) {
        return next();
      }

      const fileName = `${Date.now()}-${req.file.originalname.replace(/\s+/g, '_')}`;
      
      try {
        const file = bucket.file(fileName);
        await file.save(req.file.buffer, {
          metadata: {
            contentType: req.file.mimetype,
          }
        });

        // Make file public to get a direct URL (or use getSignedUrl if needed)
        // Here we just construct the public URL format for Firebase Storage
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
        
        req.file.location = publicUrl;
        req.file.key = fileName;
        
        next();
      } catch (uploadError) {
        console.error('Error uploading file to Firebase Storage:', uploadError);
        return res.status(500).json({ success: false, message: 'Failed to upload resume to Storage' });
      }
    });
  } else {
    // Process Local Upload
    uploadDisk(req, res, (err) => {
      if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }

      if (!req.file && req.body.requestAssistance !== 'true') {
        return res.status(400).json({ success: false, message: 'Please upload a resume file' });
      }

      if (req.body.requestAssistance === 'true' && !req.file) {
        return next();
      }

      // Set locations mimicking S3
      req.file.location = `/uploads/${req.file.filename}`;
      req.file.key = req.file.filename;

      next();
    });
  }
};

module.exports = handleUpload;
