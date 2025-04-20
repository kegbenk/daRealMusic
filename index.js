const express = require("express");
const path = require("path");
const AWS = require('aws-sdk');
const { s3, bucketName, cloudfrontDomain } = require('./config/aws');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

// Function to generate signed URL for a music file
async function getSignedUrl(key) {
    const params = {
        Bucket: bucketName,
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

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
