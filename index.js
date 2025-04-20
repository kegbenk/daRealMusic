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

// Route to get signed URL for a song
app.get('/get-signed-url', async (req, res) => {
  try {
    const key = req.query.key;
    if (!key) {
      console.error('Missing key parameter');
      return res.status(400).json({ error: 'Missing key parameter' });
    }

    console.log('=== S3 Operation Debug ===');
    console.log('Requested key:', key);
    console.log('Environment variables:', {
      NODE_ENV: process.env.NODE_ENV,
      AWS_REGION: process.env.AWS_REGION,
      S3_BUCKET_NAME: process.env.S3_BUCKET_NAME,
      CLOUDFRONT_DOMAIN: process.env.CLOUDFRONT_DOMAIN
    });
    
    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key
    };
    
    console.log('S3 HeadObject Parameters:', JSON.stringify(params, null, 2));
    console.log('Attempting to check if object exists...');

    try {
      const headObject = await s3.headObject(params).promise();
      console.log('Object exists in S3:', {
        ContentType: headObject.ContentType,
        ContentLength: headObject.ContentLength,
        LastModified: headObject.LastModified
      });
      
      // Return direct CloudFront URL
      const directUrl = `https://${process.env.CLOUDFRONT_DOMAIN}/${key}`;
      console.log('Generated direct URL:', directUrl);
      res.json({ url: directUrl });
    } catch (error) {
      console.error('S3 operation failed:', {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
        time: error.time,
        requestId: error.requestId
      });
      if (error.code === 'NotFound') {
        return res.status(404).json({ 
          error: 'File not found',
          details: `The file ${key} does not exist in the bucket`
        });
      }
      return res.status(500).json({ 
        error: 'Failed to generate URL',
        details: error.message
      });
    }
  } catch (error) {
    console.error('Error in get-signed-url:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Endpoint to get music metadata
app.get('/get-music-metadata', async (req, res) => {
    try {
        const params = {
            Bucket: process.env.S3_BUCKET_NAME,
            Key: 'music_metadata.json'
        };

        try {
            // Try to get the metadata file
            const data = await s3.getObject(params).promise();
            res.json(JSON.parse(data.Body.toString()));
        } catch (error) {
            if (error.code === 'NoSuchKey') {
                // If metadata file doesn't exist, create it
                const listParams = {
                    Bucket: process.env.S3_BUCKET_NAME
                };
                
                const listData = await s3.listObjectsV2(listParams).promise();
                const mp3Files = listData.Contents.filter(item => item.Key.endsWith('.mp3'));
                
                // Create metadata array
                const metadata = mp3Files.map(file => ({
                    file: file.Key,
                    name: file.Key.replace('.mp3', ''),
                    lastModified: file.LastModified,
                    size: file.Size
                }));

                // Sort by last modified date
                metadata.sort((a, b) => b.lastModified - a.lastModified);

                // Upload metadata file
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
        console.error('Error getting music metadata:', error);
        res.status(500).json({ error: 'Failed to get music metadata' });
    }
});

// Modify the existing list-music endpoint to use metadata
app.get('/list-music', async (req, res) => {
    try {
        const response = await fetch(`${process.env.API_URL}/get-music-metadata`);
        const metadata = await response.json();
        res.json(metadata);
    } catch (error) {
        console.error('Error listing music:', error);
        res.status(500).json({ error: 'Failed to list music' });
    }
});

// Start the server
app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on port ${port}`);
    console.log(`Accessible at: http://localhost:${port}`);
    console.log(`External access: http://hotntasty.info:${port}`);
    if (!isProduction) {
        console.log('Development mode: CORS enabled');
        console.log('Access the application at: http://localhost:3000');
        console.log('Test S3 connectivity at: http://localhost:3000/test-s3');
    }
});
