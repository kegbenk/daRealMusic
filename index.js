require('dotenv').config();
const express = require("express");
const path = require("path");
const fs = require("fs");
const { s3, testS3 } = require('./config/aws');
const crypto = require('crypto');
const stripe = process.env.STRIPE_SECRET_KEY
    ? require('stripe')(process.env.STRIPE_SECRET_KEY)
    : null;

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

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

// Email signup
app.post('/api/subscribe', (req, res) => {
    const { email } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Valid email required' });
    }

    const file = path.join(DATA_DIR, 'subscribers.json');
    let subscribers = [];
    try { subscribers = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}

    if (subscribers.some(s => s.email === email)) {
        return res.json({ message: 'Already subscribed' });
    }

    subscribers.push({ email, date: new Date().toISOString() });
    fs.writeFileSync(file, JSON.stringify(subscribers, null, 2));
    res.json({ message: 'Subscribed' });
});

// Licensing inquiry
app.post('/api/licensing', (req, res) => {
    const { name, email, project, message } = req.body;
    if (!email || !message) {
        return res.status(400).json({ error: 'Email and message required' });
    }

    const file = path.join(DATA_DIR, 'licensing-inquiries.json');
    let inquiries = [];
    try { inquiries = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}

    inquiries.push({ name, email, project, message, date: new Date().toISOString() });
    fs.writeFileSync(file, JSON.stringify(inquiries, null, 2));
    res.json({ message: 'Inquiry received' });
});

// Stripe checkout
app.post('/api/checkout', async (req, res) => {
    if (!stripe) {
        return res.status(503).json({ error: 'Payments not configured yet' });
    }
    try {
        const { type, trackName } = req.body;
        const baseUrl = `${req.protocol}://${req.get('host')}`;

        let lineItems;
        if (type === 'album') {
            lineItems = [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: 'Life Under Bittherium (Full Album)',
                        description: 'Full album download - High-quality MP3 (320kbps)',
                        images: [`${baseUrl}/img/album.png`],
                    },
                    unit_amount: 1000, // $10.00
                },
                quantity: 1,
            }];
        } else if (type === 'single') {
            lineItems = [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: trackName || 'Single Track',
                        description: 'Single track download - High-quality MP3 (320kbps)',
                        images: [`${baseUrl}/img/album.png`],
                    },
                    unit_amount: 100, // $1.00
                },
                quantity: 1,
            }];
        } else if (type === 'custom') {
            lineItems = [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: 'Life Under Bittherium (Support)',
                        description: 'Full album + extras - Name your price',
                        images: [`${baseUrl}/img/album.png`],
                    },
                    unit_amount: 500, // $5.00 minimum
                },
                quantity: 1,
                adjustable_quantity: { enabled: false },
            }];
        } else {
            return res.status(400).json({ error: 'Invalid purchase type' });
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            success_url: `${baseUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${baseUrl}/#buy`,
            metadata: { type, trackName: trackName || '' },
            ...(type === 'custom' && {
                custom_fields: [{
                    key: 'tip_amount',
                    label: { type: 'custom', custom: 'Want to add more? Enter extra amount' },
                    type: 'numeric',
                    optional: true,
                }],
            }),
        });

        res.json({ url: session.url });
    } catch (error) {
        console.error('Stripe checkout error:', error.message);
        res.status(500).json({ error: 'Failed to create checkout session' });
    }
});

// Build download links for a purchase type
async function getDownloadLinks(type, trackName) {
    const cloudfrontDomain = process.env.CLOUDFRONT_DOMAIN;

    if (type === 'album' || type === 'custom') {
        const params = { Bucket: process.env.S3_BUCKET_NAME, Key: 'music_metadata.json' };
        const data = await s3.getObject(params).promise();
        const tracks = JSON.parse(data.Body.toString());
        return tracks.map(track => ({
            name: track.name,
            url: `https://${cloudfrontDomain}/${track.file}`
        }));
    } else if (type === 'single') {
        return [{ name: trackName, url: `https://${cloudfrontDomain}/${trackName}.mp3` }];
    }
    return [];
}

// Generate a unique download token and save the purchase
function createPurchaseToken(email, type, trackName, sessionId) {
    const token = crypto.randomBytes(32).toString('hex');
    const file = path.join(DATA_DIR, 'purchases.json');
    let purchases = [];
    try { purchases = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}

    // If this session already has a token, return it
    const existing = purchases.find(p => p.sessionId === sessionId);
    if (existing) return existing.token;

    purchases.push({
        token,
        email: (email || '').toLowerCase(),
        type,
        trackName: trackName || '',
        sessionId,
        date: new Date().toISOString()
    });
    fs.writeFileSync(file, JSON.stringify(purchases, null, 2));
    return token;
}

// Verify purchase via Stripe and issue a download token
app.get('/api/download', async (req, res) => {
    if (!stripe) {
        return res.status(503).json({ error: 'Payments not configured yet' });
    }
    try {
        const { session_id } = req.query;
        if (!session_id) {
            return res.status(400).json({ error: 'Missing session ID' });
        }

        const session = await stripe.checkout.sessions.retrieve(session_id);
        if (session.payment_status !== 'paid') {
            return res.status(402).json({ error: 'Payment not completed' });
        }

        const type = session.metadata.type;
        const downloads = await getDownloadLinks(type, session.metadata.trackName);
        const token = createPurchaseToken(
            session.customer_details?.email, type, session.metadata.trackName, session.id
        );

        res.json({ downloads, token, type: type === 'single' ? 'single' : 'album' });
    } catch (error) {
        console.error('Download verification error:', error.message);
        res.status(500).json({ error: 'Failed to verify purchase' });
    }
});

// Re-download using a unique token
app.get('/api/redownload', async (req, res) => {
    try {
        const { token } = req.query;
        if (!token) {
            return res.status(400).json({ error: 'Missing download token' });
        }

        const file = path.join(DATA_DIR, 'purchases.json');
        let purchases = [];
        try { purchases = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}

        const purchase = purchases.find(p => p.token === token);
        if (!purchase) {
            return res.status(404).json({ error: 'Invalid download link' });
        }

        const downloads = await getDownloadLinks(purchase.type, purchase.trackName);
        res.json({ downloads });
    } catch (error) {
        console.error('Redownload error:', error.message);
        res.status(500).json({ error: 'Failed to look up purchase' });
    }
});

// Start the server
app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${port}`);
});
