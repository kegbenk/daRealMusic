const AWS = require('aws-sdk');
require('dotenv').config();

const awsConfig = {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
};

console.log('\nAWS Configuration:');
console.log('------------------');
console.log('Region:', awsConfig.region);
console.log('Access Key ID:', awsConfig.accessKeyId ? 'Present' : 'Missing');
console.log('Secret Access Key:', awsConfig.secretAccessKey ? 'Present' : 'Missing');
console.log('S3 Bucket:', process.env.S3_BUCKET_NAME);

AWS.config.update(awsConfig);

const s3 = new AWS.S3();

async function testS3() {
    try {
        console.log('\nTesting S3 connectivity...');
        const params = {
            Bucket: process.env.S3_BUCKET_NAME,
            MaxKeys: 10
        };

        console.log('Listing objects in bucket...');
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

module.exports = {
    s3,
    testS3
}; 