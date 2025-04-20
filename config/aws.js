const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

// Load .env file manually
const envPath = path.resolve(__dirname, '../.env');
const envFile = fs.readFileSync(envPath, 'utf8');
const envVars = envFile.split('\n').reduce((acc, line) => {
    const [key, value] = line.split('=');
    if (key && value) {
        acc[key.trim()] = value.trim();
    }
    return acc;
}, {});

console.log('\nEnvironment Variables (loaded manually):');
console.log('--------------------------------------');
console.log('AWS_ACCESS_KEY_ID:', envVars.AWS_ACCESS_KEY_ID);
console.log('AWS_SECRET_ACCESS_KEY:', envVars.AWS_SECRET_ACCESS_KEY ? 'Present' : 'Missing');
console.log('S3_BUCKET_NAME:', envVars.S3_BUCKET_NAME);

const awsConfig = {
    region: envVars.AWS_REGION || 'us-east-1',
    accessKeyId: envVars.AWS_ACCESS_KEY_ID,
    secretAccessKey: envVars.AWS_SECRET_ACCESS_KEY
};

console.log('\nAWS Configuration:');
console.log('------------------');
console.log('Region:', awsConfig.region);
console.log('Access Key ID from awsConfig:', awsConfig.accessKeyId);
console.log('Secret Access Key from awsConfig:', awsConfig.secretAccessKey ? 'Present' : 'Missing');
console.log('S3 Bucket:', envVars.S3_BUCKET_NAME);

AWS.config.update(awsConfig);

const s3 = new AWS.S3();
const cloudfront = new AWS.CloudFront();

async function testS3() {
    try {
        // First, try to list all buckets to verify S3 access
        console.log('\nTesting S3 ListBuckets permission...');
        const buckets = await s3.listBuckets().promise();
        console.log('Successfully listed buckets. Available buckets:');
        buckets.Buckets.forEach(bucket => {
            console.log(`- ${bucket.Name} (Created: ${bucket.CreationDate})`);
        });

        // Then try to access the specific bucket
        console.log('\nTesting access to specific bucket...');
        const params = {
            Bucket: envVars.S3_BUCKET_NAME,
            MaxKeys: 10
        };

        console.log('Attempting to list objects in bucket:', envVars.S3_BUCKET_NAME);
        const data = await s3.listObjectsV2(params).promise();
        
        console.log('\nS3 Test Results:');
        console.log('----------------');
        console.log('Successfully connected to S3');
        console.log('Number of objects found:', data.Contents.length);
        console.log('\nFirst 10 objects:');
        data.Contents.forEach((obj, index) => {
            console.log(`${index + 1}. ${obj.Key} (${obj.Size} bytes)`);
        });
    } catch (error) {
        console.error('\nS3 Test Failed:');
        console.error('----------------');
        console.error('Error Code:', error.code);
        console.error('Error Message:', error.message);
        console.error('Request ID:', error.requestId);
        console.error('Status Code:', error.statusCode);
        console.error('Access Key ID Used:', awsConfig.accessKeyId);
        
        if (error.code === 'NoSuchBucket') {
            console.error('\nThe specified bucket does not exist in this region.');
            console.error('Please verify:');
            console.error('1. The bucket name is correct');
            console.error('2. The bucket exists in region:', awsConfig.region);
        } else if (error.code === 'AccessDenied') {
            console.error('\nAccess denied to the bucket.');
            console.error('Please verify:');
            console.error('1. The IAM user has S3 permissions');
            console.error('2. The bucket policy allows access');
            console.error('3. The bucket is not blocked by public access settings');
        }
        
        process.exit(1);
    }
}

// Export the configuration and clients
module.exports = {
    awsConfig,
    s3,
    cloudfront,
    bucketName: envVars.S3_BUCKET_NAME,
    cloudfrontDomain: process.env.CLOUDFRONT_DOMAIN,
    testS3
}; 