const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { s3Client, bucketName } = require('../config/s3');

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

// Create uploads folder if it doesn't exist (for local fallback)
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
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
  if (s3Client) {
    // Process S3 Upload
    uploadMemory(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }

      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Please upload a resume file' });
      }

      const fileName = `${Date.now()}-${req.file.originalname.replace(/\s+/g, '_')}`;
      
      try {
        const command = new PutObjectCommand({
          Bucket: bucketName,
          Key: fileName,
          Body: req.file.buffer,
          ContentType: req.file.mimetype,
        });

        await s3Client.send(command);

        // Construct S3 URL
        const s3Url = `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${fileName}`;
        
        req.file.location = s3Url;
        req.file.key = fileName;
        
        next();
      } catch (uploadError) {
        console.error('Error uploading file to AWS S3:', uploadError);
        return res.status(500).json({ success: false, message: 'Failed to upload resume to S3' });
      }
    });
  } else {
    // Process Local Upload
    uploadDisk(req, res, (err) => {
      if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }

      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Please upload a resume file' });
      }

      // Set locations mimicking S3
      req.file.location = `/uploads/${req.file.filename}`;
      req.file.key = req.file.filename;

      next();
    });
  }
};

module.exports = handleUpload;
