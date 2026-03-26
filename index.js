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
const siteConfig = {
    cloudfrontDomain: process.env.CLOUDFRONT_DOMAIN || '',
    layloDropUrl: process.env.LAYLO_DROP_URL || '',
    layloProfileUrl: process.env.LAYLO_PROFILE_URL || 'https://laylo.com/laylo-drainbow',
    discordInviteUrl: process.env.DISCORD_INVITE_URL || '',
    artistName: process.env.ARTIST_NAME || 'Drainbow',
    releaseTitle: process.env.RELEASE_TITLE || 'Life Under Bittherium',
    fanCaptureMode: process.env.FAN_CAPTURE_MODE || ((process.env.LAYLO_DROP_URL || process.env.LAYLO_PROFILE_URL) ? 'laylo_redirect' : 'local'),
    campaignId: process.env.CAMPAIGN_ID || 'life-under-bittherium-drop',
    campaignStatus: process.env.CAMPAIGN_STATUS || 'collecting',
    releaseDate: process.env.RELEASE_DATE || '',
    campaignHeadline: process.env.CAMPAIGN_HEADLINE || 'Join the drop and stay close to the release.',
    campaignGoalSignups: Number(process.env.CAMPAIGN_GOAL_SIGNUPS || 250)
};

function readJsonFile(filename, fallback = []) {
    const file = path.join(DATA_DIR, filename);
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
        return fallback;
    }
}

function writeJsonFile(filename, value) {
    const file = path.join(DATA_DIR, filename);
    fs.writeFileSync(file, JSON.stringify(value, null, 2));
}

function getDefaultCampaign() {
    return {
        id: siteConfig.campaignId,
        artistName: siteConfig.artistName,
        releaseTitle: siteConfig.releaseTitle,
        status: siteConfig.campaignStatus,
        releaseDate: siteConfig.releaseDate,
        headline: siteConfig.campaignHeadline,
        goalSignups: siteConfig.campaignGoalSignups,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
}

function getCampaignRecord() {
    const campaigns = readJsonFile('drop-campaigns.json', []);
    const existing = campaigns.find((entry) => entry.id === siteConfig.campaignId);
    if (existing) return existing;

    const created = getDefaultCampaign();
    campaigns.push(created);
    writeJsonFile('drop-campaigns.json', campaigns);
    return created;
}

function saveCampaignRecord(campaign) {
    const campaigns = readJsonFile('drop-campaigns.json', []);
    const next = { ...campaign, updatedAt: new Date().toISOString() };
    const index = campaigns.findIndex((entry) => entry.id === next.id);
    if (index >= 0) {
        campaigns[index] = next;
    } else {
        campaigns.push(next);
    }
    writeJsonFile('drop-campaigns.json', campaigns);
    return next;
}

function getCampaignReport() {
    const campaign = getCampaignRecord();
    const events = readJsonFile('fan-capture-events.json', []);
    const supporters = readJsonFile('supporters.json', []);
    const profiles = readJsonFile('fan-profiles.json', []);

    const relevantEvents = events.filter((event) => event.intent === 'drop');
    const uniqueSignups = new Set(relevantEvents.map((event) => event.email)).size;
    const supporterCount = supporters.filter((supporter) => (supporter.totalPurchases || 0) > 0).length;
    const patronCount = supporters.filter((supporter) => supporter.supporterTier === 'patron').length;
    const buyerEmails = new Set(supporters.filter((supporter) => (supporter.totalPurchases || 0) > 0).map((supporter) => supporter.email));
    const conversionRate = uniqueSignups ? Number(((buyerEmails.size / uniqueSignups) * 100).toFixed(1)) : 0;

    const placements = {};
    relevantEvents.forEach((event) => {
        placements[event.placement] = (placements[event.placement] || 0) + 1;
    });

    return {
        campaign,
        metrics: {
            signups: uniqueSignups,
            listeners: profiles.length,
            buyers: buyerEmails.size,
            supporters: supporterCount,
            patrons: patronCount,
            conversionRate,
            goalProgressPct: campaign.goalSignups ? Math.min(100, Number(((uniqueSignups / campaign.goalSignups) * 100).toFixed(1))) : 0
        },
        placements
    };
}

function upsertFanProfile({ email, name, source, placement, intent, fanStage, tags = [] }) {
    if (!email) return null;

    const normalizedEmail = email.toLowerCase();
    const timestamp = new Date().toISOString();
    const profiles = readJsonFile('fan-profiles.json', []);
    const profile = profiles.find((entry) => entry.email === normalizedEmail) || {
        email: normalizedEmail,
        name: name || '',
        firstSeenAt: timestamp,
        lastSeenAt: timestamp,
        artistName: siteConfig.artistName,
        releaseTitle: siteConfig.releaseTitle,
        signupCount: 0,
        lastIntent: '',
        sources: [],
        placements: [],
        fanStage: 'listener',
        tags: []
    };

    profile.name = profile.name || name || '';
    profile.lastSeenAt = timestamp;
    profile.lastIntent = intent || profile.lastIntent || 'drop';
    if (source && !profile.sources.includes(source)) profile.sources.push(source);
    if (placement && !profile.placements.includes(placement)) profile.placements.push(placement);
    if (intent === 'drop') {
        profile.signupCount = (profile.signupCount || 0) + 1;
    }
    if (fanStage && ['listener', 'subscriber', 'buyer', 'supporter', 'patron'].indexOf(fanStage) > ['listener', 'subscriber', 'buyer', 'supporter', 'patron'].indexOf(profile.fanStage || 'listener')) {
        profile.fanStage = fanStage;
    } else if (!profile.fanStage) {
        profile.fanStage = fanStage || 'listener';
    }
    tags.forEach((tag) => {
        if (tag && !profile.tags.includes(tag)) profile.tags.push(tag);
    });

    const index = profiles.findIndex((entry) => entry.email === normalizedEmail);
    if (index >= 0) {
        profiles[index] = profile;
    } else {
        profiles.push(profile);
    }
    writeJsonFile('fan-profiles.json', profiles);
    return profile;
}

function upsertSupporterProfile({ email, name, source, purchase }) {
    if (!email) return null;

    const normalizedEmail = email.toLowerCase();
    const timestamp = new Date().toISOString();
    const supporters = readJsonFile('supporters.json', []);
    const supporter = supporters.find((entry) => entry.email === normalizedEmail) || {
        email: normalizedEmail,
        name: name || '',
        firstSeenAt: timestamp,
        lastSeenAt: timestamp,
        artistName: siteConfig.artistName,
        releaseTitle: siteConfig.releaseTitle,
        supporterTier: 'listener',
        totalPurchases: 0,
        totalSpendCents: 0,
        purchases: [],
        sources: []
    };

    supporter.name = supporter.name || name || '';
    supporter.lastSeenAt = timestamp;
    if (source && !supporter.sources.includes(source)) supporter.sources.push(source);

    if (purchase) {
        const existingPurchase = supporter.purchases.find((entry) => entry.sessionId === purchase.sessionId);
        if (!existingPurchase) {
            supporter.purchases.push(purchase);
            supporter.totalPurchases += 1;
            supporter.totalSpendCents += purchase.amountCents || 0;
        }
    }

    if (supporter.totalSpendCents >= 2000 || supporter.totalPurchases >= 2) {
        supporter.supporterTier = 'supporter';
    }
    if (supporter.totalSpendCents >= 5000) {
        supporter.supporterTier = 'patron';
    }

    const existingIndex = supporters.findIndex((entry) => entry.email === normalizedEmail);
    if (existingIndex >= 0) {
        supporters[existingIndex] = supporter;
    } else {
        supporters.push(supporter);
    }

    writeJsonFile('supporters.json', supporters);
    upsertFanProfile({
        email: normalizedEmail,
        name,
        source,
        placement: 'purchase',
        intent: 'support',
        fanStage: supporter.supporterTier === 'patron' ? 'patron' : (supporter.supporterTier === 'supporter' ? 'supporter' : 'buyer'),
        tags: ['buyer', supporter.supporterTier]
    });
    return supporter;
}

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
app.get('/api/site-config', (req, res) => {
    res.json({
        ...siteConfig,
        campaign: getCampaignReport().campaign
    });
});

app.get('/api/drop-campaign', (req, res) => {
    res.json(getCampaignReport());
});

app.post('/api/drop-campaign', (req, res) => {
    const body = req.body || {};
    const current = getCampaignRecord();
    const updated = saveCampaignRecord({
        ...current,
        status: body.status || current.status,
        releaseDate: body.releaseDate || current.releaseDate,
        headline: body.headline || current.headline,
        goalSignups: Number(body.goalSignups || current.goalSignups || 0)
    });
    res.json({ campaign: updated });
});

app.post('/api/fan-capture', (req, res) => {
    const {
        email,
        name,
        source,
        placement,
        intent,
        utmSource,
        utmMedium,
        utmCampaign
    } = req.body || {};

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Valid email required' });
    }

    const normalizedEmail = email.toLowerCase();
    const timestamp = new Date().toISOString();
    const layloTarget = siteConfig.layloDropUrl || siteConfig.layloProfileUrl || '';
    const nextUrl = layloTarget
        ? `${layloTarget}${layloTarget.includes('?') ? '&' : '?'}utm_source=${encodeURIComponent(utmSource || 'darealmusic')}&utm_medium=${encodeURIComponent(utmMedium || 'owned-site')}&utm_campaign=${encodeURIComponent(utmCampaign || 'join-the-drop')}&email=${encodeURIComponent(normalizedEmail)}`
        : '';

    const events = readJsonFile('fan-capture-events.json', []);
    const subscribers = readJsonFile('subscribers.json', []);
    const campaign = getCampaignRecord();

    const profile = upsertFanProfile({
        email: normalizedEmail,
        name,
        source: source || 'site',
        placement: placement || 'unknown',
        intent: intent || 'drop',
        fanStage: 'subscriber',
        tags: ['drop-subscriber', campaign.id]
    });

    if (!subscribers.some((subscriber) => subscriber.email === normalizedEmail)) {
        subscribers.push({
            email: normalizedEmail,
            name: name || '',
            source: source || 'site',
            placement: placement || 'unknown',
            date: timestamp
        });
    }

    events.push({
        id: crypto.randomUUID(),
        email: normalizedEmail,
        name: name || '',
        source: source || 'site',
        placement: placement || 'unknown',
        intent: intent || 'drop',
        utmSource: utmSource || 'darealmusic',
        utmMedium: utmMedium || 'owned-site',
        utmCampaign: utmCampaign || 'join-the-drop',
        mode: siteConfig.fanCaptureMode,
        nextUrl,
        referrer: req.get('referer') || '',
        userAgent: req.get('user-agent') || '',
            timestamp
        });

    writeJsonFile('fan-capture-events.json', events);
    writeJsonFile('subscribers.json', subscribers);

    return res.json({
        message: nextUrl ? 'Capture saved. Continue to the drop.' : 'You are in the loop.',
        nextUrl,
        mode: siteConfig.fanCaptureMode,
        profile,
        campaign: getCampaignReport().campaign
    });
});

app.get('/api/fan-capture-report', (req, res) => {
    const profiles = readJsonFile('fan-profiles.json', []);
    const events = readJsonFile('fan-capture-events.json', []);
    const sourceCounts = {};
    const placementCounts = {};

    events.forEach((event) => {
        sourceCounts[event.source] = (sourceCounts[event.source] || 0) + 1;
        placementCounts[event.placement] = (placementCounts[event.placement] || 0) + 1;
    });

    res.json({
        fans: profiles.length,
        captureEvents: events.length,
        sourceCounts,
        placementCounts,
        latestEventAt: events.length ? events[events.length - 1].timestamp : null
    });
});

// Email signup
app.post('/api/subscribe', (req, res) => {
    const { email } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Valid email required' });
    }

    const subscribers = readJsonFile('subscribers.json', []);

    if (subscribers.some(s => s.email === email)) {
        return res.json({ message: 'Already subscribed' });
    }

    subscribers.push({ email, date: new Date().toISOString() });
    writeJsonFile('subscribers.json', subscribers);
    res.json({ message: 'Subscribed' });
});

// Licensing inquiry
app.post('/api/licensing', (req, res) => {
    const { name, email, project, message } = req.body;
    if (!email || !message) {
        return res.status(400).json({ error: 'Email and message required' });
    }

    const inquiries = readJsonFile('licensing-inquiries.json', []);

    inquiries.push({ name, email, project, message, date: new Date().toISOString() });
    writeJsonFile('licensing-inquiries.json', inquiries);
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
// token is optional — if provided, links go through the download proxy
async function getDownloadLinks(type, trackName, token) {
    if (type === 'album' || type === 'custom') {
        const params = { Bucket: process.env.S3_BUCKET_NAME, Key: 'music_metadata.json' };
        const data = await s3.getObject(params).promise();
        const tracks = JSON.parse(data.Body.toString());
        return tracks.map(track => ({
            name: track.name,
            url: token
                ? `/api/download-file?token=${token}&file=${encodeURIComponent(track.file)}`
                : `https://${process.env.CLOUDFRONT_DOMAIN}/${track.file}`
        }));
    } else if (type === 'single') {
        const file = `${trackName}.mp3`;
        return [{
            name: trackName,
            url: token
                ? `/api/download-file?token=${token}&file=${encodeURIComponent(file)}`
                : `https://${process.env.CLOUDFRONT_DOMAIN}/${file}`
        }];
    }
    return [];
}

// Generate a unique download token and save the purchase
function createPurchaseToken(email, type, trackName, sessionId) {
    const token = crypto.randomBytes(32).toString('hex');
    const purchases = readJsonFile('purchases.json', []);

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
    writeJsonFile('purchases.json', purchases);
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
        const amountCents = session.amount_total || 0;
        const token = createPurchaseToken(
            session.customer_details?.email, type, session.metadata.trackName, session.id
        );
        const downloads = await getDownloadLinks(type, session.metadata.trackName, token);
        const supporter = upsertSupporterProfile({
            email: session.customer_details?.email || '',
            name: session.customer_details?.name || '',
            source: 'stripe-checkout',
            purchase: {
                sessionId: session.id,
                token,
                type,
                trackName: session.metadata.trackName || '',
                amountCents,
                purchasedAt: new Date().toISOString()
            }
        });

        res.json({
            downloads,
            token,
            type: type === 'single' ? 'single' : 'album',
            supporter,
            libraryUrl: token ? `/library.html?token=${token}` : ''
        });
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

        const purchases = readJsonFile('purchases.json', []);

        const purchase = purchases.find(p => p.token === token);
        if (!purchase) {
            return res.status(404).json({ error: 'Invalid download link' });
        }

        const downloads = await getDownloadLinks(purchase.type, purchase.trackName, token);
        const supporters = readJsonFile('supporters.json', []);
        const supporter = supporters.find((entry) => entry.email === purchase.email) || null;
        res.json({
            downloads,
            purchase,
            supporter,
            libraryUrl: `/library.html?token=${token}`
        });
    } catch (error) {
        console.error('Redownload error:', error.message);
        res.status(500).json({ error: 'Failed to look up purchase' });
    }
});

app.get('/api/supporter-library', async (req, res) => {
    try {
        const { token } = req.query;
        if (!token) {
            return res.status(400).json({ error: 'Missing supporter token' });
        }

        const purchases = readJsonFile('purchases.json', []);
        const purchase = purchases.find((entry) => entry.token === token);
        if (!purchase) {
            return res.status(404).json({ error: 'Invalid supporter token' });
        }

        const supporters = readJsonFile('supporters.json', []);
        const supporter = supporters.find((entry) => entry.email === purchase.email);
        const downloads = await Promise.all((supporter?.purchases || []).map(async (entry) => ({
            ...entry,
            downloads: await getDownloadLinks(entry.type, entry.trackName, entry.token)
        })));

        res.json({
            supporter: supporter || null,
            downloads,
            discordInviteUrl: siteConfig.discordInviteUrl || '',
            layloDropUrl: siteConfig.layloDropUrl || siteConfig.layloProfileUrl || ''
        });
    } catch (error) {
        console.error('Supporter library error:', error.message);
        res.status(500).json({ error: 'Failed to build supporter library' });
    }
});

// Proxy file download with Content-Disposition: attachment
// Requires a valid purchase token so only buyers can download
app.get('/api/download-file', async (req, res) => {
    try {
        const { token, file: fileKey } = req.query;
        if (!token || !fileKey) {
            return res.status(400).json({ error: 'Missing token or file' });
        }

        // Verify the token is valid
        const purchases = readJsonFile('purchases.json', []);

        const purchase = purchases.find(p => p.token === token);
        if (!purchase) {
            return res.status(403).json({ error: 'Invalid download token' });
        }

        // Stream the file from S3 with attachment headers
        const params = { Bucket: process.env.S3_BUCKET_NAME, Key: fileKey };
        const filename = fileKey.split('/').pop();

        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'audio/mpeg');

        const stream = s3.getObject(params).createReadStream();
        stream.on('error', (err) => {
            console.error('Download stream error:', err.message);
            if (!res.headersSent) {
                res.status(404).json({ error: 'File not found' });
            }
        });
        stream.pipe(res);
    } catch (error) {
        console.error('File download error:', error.message);
        res.status(500).json({ error: 'Download failed' });
    }
});

// Start the server
app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${port}`);
});
