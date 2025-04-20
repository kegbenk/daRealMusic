const AWS = require('aws-sdk');

// Configure AWS
const awsConfig = {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
};

// Initialize AWS with the configuration
AWS.config.update(awsConfig);

// Create S3 client
const s3 = new AWS.S3();
const cloudfront = new AWS.CloudFront();

// Export the configuration and clients
module.exports = {
    awsConfig,
    s3,
    cloudfront,
    bucketName: process.env.S3_BUCKET_NAME || 'hotntastymusic',
    cloudfrontDomain: process.env.CLOUDFRONT_DOMAIN || 'https://dpv15oji5tyx0.cloudfront.net'
}; 