const express = require("express");
const path = require("path");
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { s3, bucketName, cloudfrontDomain, awsConfig } = require('./config/aws');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const port = process.env.PORT || 3000;

// Debug logging
console.log('AWS Configuration:');
console.log('Region:', awsConfig.region);
console.log('Bucket Name:', bucketName);
console.log('CloudFront Domain:', cloudfrontDomain);

app.use(express.static(path.join(__dirname, "public")));

// Function to generate signed URL for a music file
async function getSignedUrl(key) {
    const params = {
        Bucket: bucketName,
        Key: key,
        Expires: 3600 // URL expires in 1 hour
    };
    
    try {
        console.log('Attempting to get signed URL with params:', JSON.stringify(params, null, 2));
        
        // Check if the object exists
        await s3.headObject(params).promise();
        console.log('Object exists in S3:', key);
        
        // Generate signed URL
        const url = await s3.getSignedUrlPromise('getObject', params);
        console.log('Generated signed URL for:', key);
        return url;
    } catch (error) {
        console.error('Error in getSignedUrl:', error);
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

        const signedUrl = await getSignedUrl(key);
        res.json({ url: signedUrl });
    } catch (error) {
        console.error('Error in get-signed-url route:', error);
        if (error.code === 'NotFound') {
            res.status(404).json({ error: 'File not found in S3' });
        } else {
            res.status(500).json({ error: 'Failed to generate signed URL', details: error.message });
        }
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
