require('dotenv').config();
const express = require("express");
const path = require("path");
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { s3, bucketName, cloudfrontDomain, awsConfig } = require('./config/aws');
const AWS = require('aws-sdk');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const port = process.env.PORT || 3000;

// Debug logging
console.log('=== Server Startup Debug Information ===');
console.log('Environment:', process.env.NODE_ENV);
console.log('Port:', port);
console.log('AWS Configuration:');
console.log('- Region:', process.env.AWS_REGION);
console.log('- Access Key ID:', process.env.AWS_ACCESS_KEY_ID ? 'Present' : 'Missing');
console.log('- Secret Access Key:', process.env.AWS_SECRET_ACCESS_KEY ? 'Present' : 'Missing');
console.log('- Bucket Name:', process.env.S3_BUCKET_NAME);
console.log('- CloudFront Domain:', process.env.CLOUDFRONT_DOMAIN);
console.log('=====================================');

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// CORS for local development
if (!isProduction) {
    app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        next();
    });
}

// Test endpoint to verify S3 connectivity
app.get('/test-s3', async (req, res) => {
    try {
        console.log('Testing S3 connectivity...');
        
        // List objects in the bucket
        const params = {
            Bucket: process.env.S3_BUCKET_NAME,
            MaxKeys: 5
        };
        
        console.log('Listing objects in bucket:', process.env.S3_BUCKET_NAME);
        const data = await s3.listObjectsV2(params).promise();
        
        console.log('S3 test successful. Found objects:', data.Contents.map(obj => obj.Key));
        res.json({
            success: true,
            bucket: process.env.S3_BUCKET_NAME,
            objects: data.Contents.map(obj => ({
                key: obj.Key,
                size: obj.Size,
                lastModified: obj.LastModified
            }))
        });
    } catch (error) {
        console.error('S3 test failed:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            code: error.code
        });
    }
});

// Test endpoint to verify CloudFront connectivity
app.get('/test-cloudfront', async (req, res) => {
    try {
        const testKey = req.query.key || 'daPreacher3.0.mp3'; // Use a known existing file
        const cloudfrontUrl = `https://${process.env.CLOUDFRONT_DOMAIN}/${testKey}`;
        
        console.log('Testing CloudFront URL:', cloudfrontUrl);
        
        // Try to fetch the file
        const response = await fetch(cloudfrontUrl);
        const status = response.status;
        
        console.log('CloudFront test response:', {
            status,
            headers: Object.fromEntries(response.headers.entries())
        });
        
        res.json({
            success: status === 200,
            url: cloudfrontUrl,
            status,
            headers: Object.fromEntries(response.headers.entries())
        });
    } catch (error) {
        console.error('CloudFront test failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Function to generate signed URL for a music file
async function getSignedUrl(key) {
    console.log('\n=== S3 Operation Debug ===');
    console.log('Requested key:', key);
    
    const headParams = {
        Bucket: bucketName,
        Key: key
    };
    
    console.log('S3 HeadObject Parameters:', JSON.stringify(headParams, null, 2));
    
    try {
        console.log('Attempting to check if object exists...');
        await s3.headObject(headParams).promise();
        console.log('Object exists in S3');
        
        console.log('Generating signed URL...');
        const signedUrlParams = {
            Bucket: bucketName,
            Key: key,
            Expires: 3600
        };
        const url = await s3.getSignedUrlPromise('getObject', signedUrlParams);
        console.log('Signed URL generated successfully');
        return url;
    } catch (error) {
        console.error('S3 Operation Error:', {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode,
            time: error.time,
            requestId: error.requestId
        });
        throw error;
    }
}

app.get("/", async (req, res) => {
    res.sendFile(path.join(__dirname, "public", "home.html"));
});

// Endpoint to get a direct CloudFront URL for a song
app.get('/get-signed-url', async (req, res) => {
    try {
        const key = req.query.key;
        if (!key) {
            return res.status(400).json({ error: 'Key parameter is required' });
        }

        console.log('=== S3 Operation Debug ===');
        console.log('Requested key:', key);
        console.log('Environment variables:', {
            NODE_ENV: process.env.NODE_ENV,
            AWS_REGION: process.env.AWS_REGION,
            S3_BUCKET_NAME: process.env.S3_BUCKET_NAME,
            CLOUDFRONT_DOMAIN: process.env.CLOUDFRONT_DOMAIN
        });

        // Check if the object exists in S3
        const headParams = {
            Bucket: process.env.S3_BUCKET_NAME,
            Key: key
        };
        console.log('S3 HeadObject Parameters:', JSON.stringify(headParams, null, 2));
        console.log('Attempting to check if object exists...');

        try {
            const headData = await s3.headObject(headParams).promise();
            console.log('Object exists in S3:', headData);

            // Construct the direct CloudFront URL
            const cloudfrontDomain = process.env.CLOUDFRONT_DOMAIN.replace(/^https?:\/\//, '');
            const directUrl = `https://${cloudfrontDomain}/${key}`;
            console.log('Generated direct URL:', directUrl);

            res.json({ url: directUrl });
        } catch (s3Error) {
            console.error('S3 HeadObject Error:', s3Error);
            res.status(404).json({ error: 'File not found in S3' });
        }
    } catch (error) {
        console.error('Error in get-signed-url:', error);
        res.status(500).json({ error: 'Failed to generate URL' });
    }
});

// Endpoint to list all music files in S3
app.get('/list-music', async (req, res) => {
    try {
        console.log('Listing music files from bucket:', process.env.S3_BUCKET_NAME);
        
        const params = {
            Bucket: process.env.S3_BUCKET_NAME
        };

        console.log('S3 ListObjectsV2 params:', params);
        const data = await s3.listObjectsV2(params).promise();
        console.log('Found objects:', data.Contents.length);
        
        // Filter for MP3 files and format the response
        const musicFiles = data.Contents
            .filter(item => item.Key.toLowerCase().endsWith('.mp3'))
            .map(item => ({
                name: item.Key.replace('.mp3', ''),
                file: item.Key,
                duration: 'Unknown',  // Will be updated when played
                lastModified: item.LastModified
            }))
            .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));

        console.log('Returning music files:', musicFiles.length);
        res.json(musicFiles);
    } catch (error) {
        console.error('Error listing music files:', error);
        res.status(500).json({ 
            error: 'Failed to list music files',
            details: error.message
        });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    if (!isProduction) {
        console.log('Development mode: CORS enabled');
        console.log('Access the application at: http://localhost:3000');
        console.log('Test S3 connectivity at: http://localhost:3000/test-s3');
    }
});
