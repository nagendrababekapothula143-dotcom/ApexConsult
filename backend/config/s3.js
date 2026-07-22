const { bucket } = require('./firebase');

const bucketName = process.env.FIREBASE_STORAGE_BUCKET || 'apex-consulting.appspot.com';

const getPresignedUrl = async (key) => {
  if (!bucket || !key) return null;
  try {
    const file = bucket.file(key);
    
    // Link expires in 1 hour (3600 seconds)
    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 3600 * 1000,
    });
    return url;
  } catch (error) {
    console.error(`Error generating signed URL for key ${key}:`, error.message);
    return null;
  }
};

const deleteS3Object = async (key) => {
  if (!bucket || !key) return false;
  try {
    const file = bucket.file(key);
    await file.delete();
    console.log(`Successfully deleted storage object with key: ${key}`);
    return true;
  } catch (error) {
    console.error(`Error deleting storage object with key ${key}:`, error.message);
    return false;
  }
};

module.exports = {
  s3Client: bucket, // Export bucket as s3Client for backwards compatibility
  bucketName,
  getPresignedUrl,
  deleteS3Object,
};
