require('dotenv').config();
const express = require("express");
const path = require("path");
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { s3, bucketName, cloudfrontDomain, awsConfig } = require('./config/aws');

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
            Bucket: bucketName,
            MaxKeys: 5
        };
        
        console.log('Listing objects in bucket:', bucketName);
        const data = await s3.listObjectsV2(params).promise();
        
        console.log('S3 test successful. Found objects:', data.Contents.map(obj => obj.Key));
        res.json({
            success: true,
            bucket: bucketName,
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

// API endpoint to get signed URL for a music file
app.get("/api/music/:filename", async (req, res) => {
    if (!isProduction) {
        return res.status(404).json({ error: 'API not available in development mode' });
    }
    
    try {
        const filename = req.params.filename;
        const signedUrl = await getSignedUrl(`music/${filename}`);
        res.json({ url: signedUrl });
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate signed URL' });
    }
});

// Route to get signed URL for a song
app.get('/get-signed-url', async (req, res) => {
    console.log('\n=== API Request Debug ===');
    console.log('Request received at:', new Date().toISOString());
    console.log('Query parameters:', req.query);
    
    try {
        const key = req.query.key;
        if (!key) {
            console.error('No key provided in request');
            return res.status(400).json({ error: 'Key parameter is required' });
        }

        console.log('Processing request for key:', key);
        const signedUrl = await getSignedUrl(key);
        console.log('Request completed successfully');
        res.json({ url: signedUrl });
    } catch (error) {
        console.error('API Error:', {
            code: error.code,
            message: error.message,
            stack: error.stack
        });
        
        if (error.code === 'NotFound') {
            res.status(404).json({ error: 'File not found in S3' });
        } else {
            res.status(500).json({ 
                error: 'Failed to generate signed URL', 
                details: error.message,
                code: error.code
            });
        }
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
