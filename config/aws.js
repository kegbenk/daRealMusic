const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const s3 = new AWS.S3();
const cloudfront = new AWS.CloudFront();

module.exports = {
    s3,
    cloudfront,
    bucketName: process.env.S3_BUCKET_NAME || 'your-music-bucket',
    cloudfrontDomain: process.env.CLOUDFRONT_DOMAIN || 'your-cloudfront-domain.cloudfront.net'
}; 