const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

let s3Client = null;

const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const region = process.env.AWS_REGION;
const bucketName = process.env.AWS_BUCKET_NAME;

if (accessKeyId && secretAccessKey && bucketName) {
  try {
    s3Client = new S3Client({
      region: region || 'us-east-1',
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
    console.log('AWS S3 Client initialized successfully.');
  } catch (error) {
    console.error('Error initializing AWS S3 Client:', error.message);
  }
} else {
  console.log('AWS credentials or bucket name missing. S3 client will fallback to local storage uploads.');
}

const getPresignedUrl = async (key) => {
  if (!s3Client || !key) return null;
  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
      ResponseContentDisposition: 'attachment'
    });
    // Link expires in 1 hour (3600 seconds)
    return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  } catch (error) {
    console.error(`Error generating signed URL for key ${key}:`, error.message);
    return null;
  }
};

module.exports = {
  s3Client,
  bucketName,
  getPresignedUrl,
};
