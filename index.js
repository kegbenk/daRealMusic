const express = require("express");
const path = require("path");
const AWS = require('aws-sdk');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const awsConfig = require('./config/aws');

// Configure AWS
AWS.config.update(awsConfig);

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const port = process.env.PORT || 3000;

// Debug logging
console.log('Environment Variables:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('AWS_REGION:', process.env.AWS_REGION);
console.log('S3_BUCKET_NAME:', process.env.S3_BUCKET_NAME);
console.log('CLOUDFRONT_DOMAIN:', process.env.CLOUDFRONT_DOMAIN);

app.use(express.static(path.join(__dirname, "public")));

// Function to generate signed URL for a music file
async function getSignedUrl(key) {
    const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
        Expires: 3600 // URL expires in 1 hour
    };
    
    try {
        const url = await s3.getSignedUrlPromise('getObject', params);
        return url;
    } catch (error) {
        console.error('Error generating signed URL:', error);
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
    try {
        const key = req.query.key;
        console.log('Requested key:', key);
        
        if (!key) {
            console.error('No key provided in request');
            return res.status(400).json({ error: 'Key parameter is required' });
        }

        const s3 = new AWS.S3();
        const params = {
            Bucket: process.env.S3_BUCKET_NAME,
            Key: key,
            Expires: 3600 // URL expires in 1 hour
        };

        console.log('S3 Params:', JSON.stringify(params, null, 2));

        // Check if the object exists
        try {
            await s3.headObject(params).promise();
            console.log('Object exists in S3');
        } catch (error) {
            console.error('Error checking object in S3:', error);
            return res.status(404).json({ error: 'File not found in S3' });
        }

        const url = await s3.getSignedUrlPromise('getObject', params);
        console.log('Generated signed URL:', url);
        
        res.json({ url });
    } catch (error) {
        console.error('Error generating signed URL:', error);
        res.status(500).json({ error: 'Failed to generate signed URL' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
