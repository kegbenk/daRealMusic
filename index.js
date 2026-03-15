require('dotenv').config();
const express = require("express");
const path = require("path");
const { s3, testS3 } = require('./config/aws');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const port = process.env.PORT || 3000;

console.log(`Starting server [${process.env.NODE_ENV || 'development'}] on port ${port}`);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public"), {
    maxAge: isProduction ? '1d' : 0,
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache');
        }
    }
}));

// CORS for local development
if (!isProduction) {
    app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        next();
    });
}

// Test endpoints (development only)
if (!isProduction) {
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
} // end dev-only test endpoints

// Route to get CloudFront URL for a song
app.get('/get-signed-url', async (req, res) => {
    try {
        const key = req.query.key;
        if (!key) {
            return res.status(400).json({ error: 'Missing key parameter' });
        }

        const params = { Bucket: process.env.S3_BUCKET_NAME, Key: key };
        await s3.headObject(params).promise();

        const directUrl = `https://${process.env.CLOUDFRONT_DOMAIN}/${key}`;
        res.json({ url: directUrl });
    } catch (error) {
        console.error('Error in get-signed-url:', error.code, error.message);
        if (error.code === 'NotFound') {
            return res.status(404).json({ error: 'File not found' });
        }
        res.status(500).json({ error: 'Failed to generate URL' });
    }
});

// Shared handler for music metadata endpoints
async function fetchMusicMetadata(req, res) {
    try {
        const params = {
            Bucket: process.env.S3_BUCKET_NAME,
            Key: 'music_metadata.json'
        };

        try {
            const data = await s3.getObject(params).promise();
            res.json(JSON.parse(data.Body.toString()));
        } catch (error) {
            if (error.code === 'NoSuchKey') {
                const listData = await s3.listObjectsV2({
                    Bucket: process.env.S3_BUCKET_NAME
                }).promise();
                const mp3Files = listData.Contents.filter(item => item.Key.endsWith('.mp3'));

                const metadata = mp3Files.map(file => ({
                    file: file.Key,
                    name: file.Key.replace('.mp3', ''),
                    lastModified: file.LastModified,
                    size: file.Size
                }));
                metadata.sort((a, b) => b.lastModified - a.lastModified);

                await s3.putObject({
                    Bucket: process.env.S3_BUCKET_NAME,
                    Key: 'music_metadata.json',
                    Body: JSON.stringify(metadata),
                    ContentType: 'application/json'
                }).promise();

                res.json(metadata);
            } else {
                throw error;
            }
        }
    } catch (error) {
        console.error('Error fetching music metadata:', error.message);
        res.status(500).json({ error: 'Failed to get music metadata' });
    }
}

app.get('/get-music-metadata', fetchMusicMetadata);
app.get('/list-music', fetchMusicMetadata);

// Start the server
app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${port}`);
});
