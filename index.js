const express = require("express");
const path = require("path");
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { s3, bucketName, cloudfrontDomain, awsConfig } = require('./config/aws');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const port = process.env.PORT || 3000;

// Comprehensive debug logging
console.log('=== Server Startup Debug Information ===');
console.log('Environment:', process.env.NODE_ENV);
console.log('Port:', port);
console.log('AWS Configuration:');
console.log('- Region:', awsConfig.region);
console.log('- Access Key ID:', awsConfig.accessKeyId ? 'Present' : 'Missing');
console.log('- Secret Access Key:', awsConfig.secretAccessKey ? 'Present' : 'Missing');
console.log('- Bucket Name:', bucketName);
console.log('- CloudFront Domain:', cloudfrontDomain);
console.log('=====================================');

app.use(express.static(path.join(__dirname, "public")));

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

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
