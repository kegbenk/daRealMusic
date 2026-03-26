// Global variables
let listAudio = [];
let currentAudio = null;
let indexAudio = 0;
let siteConfig = {
    cloudfrontDomain: 'dpv15oji5tyx0.cloudfront.net',
    layloDropUrl: '',
    layloProfileUrl: '',
    discordInviteUrl: '',
    artistName: 'Drainbow',
    releaseTitle: 'Life Under Bittherium',
    fanCaptureMode: 'local'
};
let captureContext = {
    placement: 'signup-form',
    intent: 'drop'
};
let dropCampaign = null;

function buildMarketingUrl(url, email) {
    const target = new URL(url, window.location.origin);
    target.searchParams.set('utm_source', 'darealmusic');
    target.searchParams.set('utm_medium', 'owned-site');
    target.searchParams.set('utm_campaign', 'join-the-drop');
    if (email) target.searchParams.set('email', email);
    return target.toString();
}

function formatCampaignStatus(status) {
    const labels = {
        collecting: 'Collecting',
        announced: 'Announced',
        live: 'Live now',
        closed: 'Closed'
    };
    return labels[status] || 'Collecting';
}

// CloudFront URL for audio files
function getSignedUrl(songKey) {
    return `https://${siteConfig.cloudfrontDomain}/${songKey}`;
}

// Format seconds to MM:SS
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Create track item in playlist
function createTrackItem(index, name, duration) {
    const playlistContainer = document.querySelector(".playlist-ctn");
    if (!playlistContainer) return;

    const trackItem = document.createElement("div");
    trackItem.setAttribute("class", "playlist-track-ctn");
    trackItem.setAttribute("id", "ptc-" + index);
    trackItem.setAttribute("data-index", index);
    trackItem.setAttribute("role", "listitem");
    trackItem.setAttribute("tabindex", "0");
    trackItem.setAttribute("aria-label", `${name}, ${duration}`);
    playlistContainer.appendChild(trackItem);

    const playBtnItem = document.createElement("div");
    playBtnItem.setAttribute("class", "playlist-btn-play");
    playBtnItem.setAttribute("id", "pbp-" + index);
    trackItem.appendChild(playBtnItem);

    const btnImg = document.createElement("i");
    btnImg.setAttribute("class", "fas fa-play");
    btnImg.setAttribute("id", "p-img-" + index);
    btnImg.setAttribute("aria-hidden", "true");
    playBtnItem.appendChild(btnImg);

    const trackInfoItem = document.createElement("div");
    trackInfoItem.setAttribute("class", "playlist-info-track");
    trackInfoItem.textContent = name;
    trackItem.appendChild(trackInfoItem);

    const trackDurationItem = document.createElement("div");
    trackDurationItem.setAttribute("class", "playlist-duration");
    trackDurationItem.textContent = duration;
    trackItem.appendChild(trackDurationItem);
}

// Load music list from server
async function loadMusicList() {
    try {
        const response = await fetch('/list-music');
        if (!response.ok) throw new Error('Failed to load music list');

        listAudio = await response.json();

        const playlistContainer = document.querySelector(".playlist-ctn");
        if (!playlistContainer) throw new Error('Playlist container not found');
        playlistContainer.innerHTML = '';

        listAudio.forEach((track, index) => {
            const bitrate = 192000;
            const durationInSeconds = Math.floor((track.size * 8) / bitrate);
            createTrackItem(index, track.name, formatTime(durationInSeconds));
        });

        // Populate the track picker dropdown
        populateTrackPicker();

        // Click and keyboard listeners for playlist items
        const playListItems = document.querySelectorAll(".playlist-track-ctn");
        playListItems.forEach(item => {
            function handleTrackSelect() {
                const clickedIndex = parseInt(item.getAttribute("data-index"));
                if (clickedIndex === indexAudio) {
                    toggleAudio();
                } else {
                    loadNewTrack(clickedIndex);
                }
            }
            item.addEventListener("click", handleTrackSelect);
            item.addEventListener("keydown", (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleTrackSelect();
                }
            });
        });
    } catch (error) {
        console.error('Error loading music list:', error);
    }
}

// Update playlist duration when real metadata is available
function updatePlaylistDuration(index, duration) {
    const trackItem = document.querySelector(`#ptc-${index} .playlist-duration`);
    if (trackItem) {
        trackItem.textContent = formatTime(duration);
    }
}

// Announce track change for screen readers
function announceTrack(name) {
    const el = document.getElementById('track-announcement');
    if (el) el.textContent = `Now playing: ${name}`;
}

// Update Media Session metadata
function updateMediaSession(track) {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
        title: track.name,
        artist: 'Drainbow',
        album: 'Life Under Bittherium',
        artwork: [
            { src: '/img/album.png', sizes: '960x642', type: 'image/png' }
        ]
    });

    navigator.mediaSession.setActionHandler('play', () => {
        if (currentAudio.paused) toggleAudio();
    });
    navigator.mediaSession.setActionHandler('pause', () => {
        if (!currentAudio.paused) toggleAudio();
    });
    navigator.mediaSession.setActionHandler('previoustrack', () => previous());
    navigator.mediaSession.setActionHandler('nexttrack', () => next());
    navigator.mediaSession.setActionHandler('seekbackward', () => rewind());
    navigator.mediaSession.setActionHandler('seekforward', () => forward());
}

// Initialize the player
document.addEventListener('DOMContentLoaded', async function() {
    try {
        currentAudio = document.getElementById("myAudio");
        if (!currentAudio) throw new Error('Audio element not found');

        try {
            const response = await fetch('/api/site-config');
            if (response.ok) {
                siteConfig = { ...siteConfig, ...(await response.json()) };
            }
        } catch (error) {
            console.warn('Falling back to default site config:', error);
        }

        currentAudio.addEventListener('timeupdate', onTimeUpdate);
        currentAudio.addEventListener('ended', () => {
            if (indexAudio < listAudio.length - 1) {
                loadNewTrack(indexAudio + 1);
            }
        });

        await loadDropCampaign();

        await loadMusicList();

        if (listAudio.length > 0) {
            const firstTrackUrl = getSignedUrl(listAudio[0].file.split('/').pop());
            document.querySelector("#source-audio").src = firstTrackUrl;
            document.querySelector(".title").textContent = listAudio[0].name;
            currentAudio.load();

            document.querySelector("#icon-play").style.display = "block";
            document.querySelector("#icon-pause").style.display = "none";
        }

        setupClickToSeek();
        setupKeyboardNav();
        setupNavToggle();
        setupSmoothScroll();
        setupMarketingLinks();
        setupTracklistToggle();
        setupCaptureModal();
        setupCaptureForm();
        setupEmailForm();
        setupLicensingForm();
    } catch (error) {
        console.error('Error initializing player:', error);
    }
});

// Update playlist icons
function updatePlaylistIcons(playingIndex) {
    const allIcons = document.querySelectorAll('.playlist-btn-play i');
    allIcons.forEach((icon, index) => {
        if (index === playingIndex) {
            icon.classList.remove('fa-play');
            icon.classList.add('fa-pause');
        } else {
            icon.classList.remove('fa-pause');
            icon.classList.add('fa-play');
        }
    });
}

async function loadDropCampaign() {
    try {
        const response = await fetch('/api/drop-campaign');
        if (!response.ok) {
            throw new Error('Failed to load campaign');
        }
        dropCampaign = await response.json();
        renderDropCampaign();
    } catch (error) {
        console.warn('Unable to load campaign report:', error);
    }
}

function renderDropCampaign() {
    if (!dropCampaign) return;

    const campaign = dropCampaign.campaign || {};
    const metrics = dropCampaign.metrics || {};

    const statusChip = document.getElementById('campaign-status-chip');
    const goalChip = document.getElementById('campaign-goal-chip');
    const signupCount = document.getElementById('signup-count-stat');
    const buyerCount = document.getElementById('buyer-count-stat');
    const conversion = document.getElementById('conversion-stat');
    const signupSubtitle = document.querySelector('.signup-subtitle');

    if (statusChip) {
        statusChip.textContent = formatCampaignStatus(campaign.status);
    }
    if (goalChip) {
        const goal = campaign.goalSignups || 0;
        goalChip.textContent = goal
            ? `${metrics.signups || 0}/${goal} drop signups`
            : `${metrics.signups || 0} drop signups`;
    }
    if (signupCount) signupCount.textContent = String(metrics.signups || 0);
    if (buyerCount) buyerCount.textContent = String(metrics.buyers || 0);
    if (conversion) conversion.textContent = `${metrics.conversionRate || 0}%`;
    if (signupSubtitle && campaign.headline) {
        signupSubtitle.textContent = campaign.headline;
    }
}

// Update playlist styling for active track
function updateStylePlaylist(oldIndex, newIndex) {
    const oldTrack = document.querySelector("#ptc-" + oldIndex);
    if (oldTrack) oldTrack.classList.remove("active-track");

    const newTrack = document.querySelector("#ptc-" + newIndex);
    if (newTrack) newTrack.classList.add("active-track");

    const oldIcon = document.querySelector("#p-img-" + oldIndex);
    if (oldIcon) {
        oldIcon.classList.remove("fa-pause");
        oldIcon.classList.add("fa-play");
    }

    const newIcon = document.querySelector("#p-img-" + newIndex);
    if (newIcon) {
        newIcon.classList.remove("fa-play");
        newIcon.classList.add("fa-pause");
    }
}

// Load a new track by index
async function loadNewTrack(index) {
    try {
        if (!listAudio[index]) throw new Error('Track not found at index: ' + index);

        const filename = listAudio[index].file.split('/').pop();
        const audioUrl = getSignedUrl(filename);

        const player = document.querySelector("#source-audio");
        const titleElement = document.querySelector(".title");

        if (!player || !titleElement || !currentAudio) throw new Error('Required elements not found');

        player.src = audioUrl;
        titleElement.textContent = listAudio[index].name;

        currentAudio.addEventListener('loadedmetadata', function() {
            if (!isNaN(currentAudio.duration)) {
                updatePlaylistDuration(index, currentAudio.duration);
            }
        }, { once: true });

        currentAudio.load();

        updateStylePlaylist(indexAudio, index);
        indexAudio = index;

        announceTrack(listAudio[index].name);
        updateMediaSession(listAudio[index]);

        if (window.innerWidth > 768) {
            toggleAudio();
        } else {
            document.querySelector("#icon-play").style.display = "block";
            document.querySelector("#icon-pause").style.display = "none";
        }
    } catch (error) {
        console.error('Error loading track:', error);
    }
}

// Play/pause toggle
function toggleAudio() {
    if (!currentAudio) return;

    const playIcon = document.querySelector("#icon-play");
    const pauseIcon = document.querySelector("#icon-pause");
    const currentTrack = document.querySelector("#ptc-" + indexAudio);

    if (!playIcon || !pauseIcon || !currentTrack) return;

    if (currentAudio.paused) {
        playIcon.style.display = "none";
        pauseIcon.style.display = "block";
        currentTrack.classList.add("active-track");
        updatePlaylistIcons(indexAudio);
        updateMediaSession(listAudio[indexAudio]);

        const playPromise = currentAudio.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.error('Error playing audio:', error);
                playIcon.style.display = "block";
                pauseIcon.style.display = "none";
                updatePlaylistIcons(-1);
            });
        }
    } else {
        playIcon.style.display = "block";
        pauseIcon.style.display = "none";
        updatePlaylistIcons(-1);
        currentAudio.pause();
    }
}

function pauseAudio() {
    if (currentAudio) currentAudio.pause();
}

// Skip forward/backward
function next() {
    if (indexAudio < listAudio.length - 1) loadNewTrack(indexAudio + 1);
}

function previous() {
    if (indexAudio > 0) loadNewTrack(indexAudio - 1);
}

function forward() {
    if (currentAudio) currentAudio.currentTime = Math.min(currentAudio.currentTime + 10, currentAudio.duration);
}

function rewind() {
    if (currentAudio) currentAudio.currentTime = Math.max(currentAudio.currentTime - 10, 0);
}

// Progress bar updates
function onTimeUpdate() {
    if (!currentAudio) return;

    const t = currentAudio.currentTime;
    const d = currentAudio.duration;

    document.querySelector(".timer").textContent = formatTime(t);
    if (!isNaN(d)) {
        document.querySelector(".duration").textContent = formatTime(d);
    }

    setBarProgress();

    if (currentAudio.ended) {
        document.querySelector("#icon-play").style.display = "block";
        document.querySelector("#icon-pause").style.display = "none";
        updatePlaylistIcons(-1);

        if (indexAudio < listAudio.length - 1) {
            loadNewTrack(indexAudio + 1);
        }
    }
}

function setBarProgress() {
    if (!currentAudio || isNaN(currentAudio.duration)) return;
    const progress = (currentAudio.currentTime / currentAudio.duration) * 100;
    const bar = document.getElementById("myBar");
    if (bar) bar.style.width = progress + "%";

    const progressEl = document.getElementById("myProgress");
    if (progressEl) progressEl.setAttribute("aria-valuenow", Math.round(progress));
}

// Click-to-seek on progress bar
function setupClickToSeek() {
    const progressBar = document.getElementById("myProgress");
    if (!progressBar) return;

    progressBar.addEventListener("click", (e) => {
        if (!currentAudio || isNaN(currentAudio.duration)) return;
        const rect = progressBar.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const pct = clickX / rect.width;
        currentAudio.currentTime = pct * currentAudio.duration;
    });
}

// Keyboard navigation for the progress bar
function setupKeyboardNav() {
    const progressBar = document.getElementById("myProgress");
    if (!progressBar) return;

    progressBar.addEventListener("keydown", (e) => {
        if (!currentAudio || isNaN(currentAudio.duration)) return;
        if (e.key === 'ArrowRight') {
            e.preventDefault();
            forward();
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            rewind();
        }
    });
}

// Mute toggle
function toggleMute() {
    if (!currentAudio) return;
    const volUp = document.querySelector("#icon-vol-up");
    const volMute = document.querySelector("#icon-vol-mute");

    currentAudio.muted = !currentAudio.muted;
    volUp.style.display = currentAudio.muted ? "none" : "block";
    volMute.style.display = currentAudio.muted ? "block" : "none";
}

// Mobile nav toggle
function setupNavToggle() {
    const toggle = document.querySelector('.nav-toggle');
    const links = document.querySelector('.nav-links');
    if (!toggle || !links) return;

    toggle.addEventListener('click', () => {
        const isOpen = links.classList.toggle('open');
        toggle.setAttribute('aria-expanded', isOpen);
    });

    // Close nav when a link is clicked
    links.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            links.classList.remove('open');
            toggle.setAttribute('aria-expanded', 'false');
        });
    });
}

// Smooth scroll for nav links and CTA
function setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            const target = document.querySelector(targetId);
            if (target) {
                e.preventDefault();
                const navHeight = document.querySelector('.main-nav')?.offsetHeight || 56;
                const targetPos = target.getBoundingClientRect().top + window.scrollY - navHeight;
                window.scrollTo({ top: targetPos, behavior: 'smooth' });
            }
        });
    });
}

function setupTracklistToggle() {
    const toggle = document.getElementById('tracklist-toggle');
    const panel = document.getElementById('playlist-panel');
    if (!toggle || !panel) return;

    toggle.addEventListener('click', () => {
        const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!isExpanded));
        panel.hidden = isExpanded;
        const label = toggle.querySelector('span');
        if (label) {
            label.textContent = isExpanded ? 'Show tracklist' : 'Hide tracklist';
        }
    });
}

function setupMarketingLinks() {
    const dropLinkIds = ['join-drop-hero-link', 'join-drop-community-link'];
    dropLinkIds.forEach((id) => {
        const link = document.getElementById(id);
        if (!link) return;
        link.setAttribute('href', '#signup');
    });

    if (siteConfig.discordInviteUrl) {
        const discordLink = document.getElementById('discord-community-link');
        if (discordLink) {
            discordLink.setAttribute('href', buildMarketingUrl(siteConfig.discordInviteUrl));
        }
    }
}

function openCaptureModal({ placement = 'unknown', intent = 'drop' } = {}) {
    captureContext = { placement, intent };
    const modal = document.getElementById('capture-modal');
    const placementInput = document.getElementById('capture-placement');
    const intentInput = document.getElementById('capture-intent');
    const status = document.getElementById('capture-status');
    if (!modal || !placementInput || !intentInput) return;

    placementInput.value = placement;
    intentInput.value = intent;
    if (status) status.textContent = '';
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');

    const emailInput = document.getElementById('capture-email');
    if (emailInput) {
        emailInput.focus();
    }
}

function closeCaptureModal() {
    const modal = document.getElementById('capture-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
}

function setupCaptureModal() {
    document.querySelectorAll('[data-capture-trigger="true"]').forEach((trigger) => {
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            openCaptureModal({
                placement: trigger.getAttribute('data-placement') || 'unknown',
                intent: trigger.getAttribute('data-intent') || 'drop'
            });
        });
    });

    document.querySelectorAll('[data-capture-close="true"]').forEach((node) => {
        node.addEventListener('click', closeCaptureModal);
    });

    const closeButton = document.getElementById('capture-close');
    if (closeButton) closeButton.addEventListener('click', closeCaptureModal);

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeCaptureModal();
        }
    });
}

async function submitFanCapture({ email, name, placement, intent }) {
    const params = new URLSearchParams(window.location.search);
    const res = await fetch('/api/fan-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email,
            name,
            placement,
            intent,
            source: 'darealmusic',
            utmSource: params.get('utm_source') || 'darealmusic',
            utmMedium: params.get('utm_medium') || 'owned-site',
            utmCampaign: params.get('utm_campaign') || 'join-the-drop'
        })
    });

    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.error || 'Capture failed');
    }
    return data;
}

// Email signup form
function setupEmailForm() {
    const form = document.getElementById('email-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const status = document.getElementById('email-status');
        const email = document.getElementById('signup-email').value;
        const name = document.getElementById('signup-name')?.value || '';

        try {
            const data = await submitFanCapture({
                email,
                name,
                placement: 'signup-form',
                intent: 'drop'
            });
            status.textContent = data.message || 'You are in the loop.';
            form.reset();
            if (data.campaign) {
                await loadDropCampaign();
            }
            if (data.nextUrl) {
                window.open(data.nextUrl, '_blank', 'noopener,noreferrer');
            }
        } catch {
            status.textContent = 'Something went wrong. Try again.';
        }
    });
}

function setupCaptureForm() {
    const form = document.getElementById('capture-form');
    if (!form) return;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const status = document.getElementById('capture-status');
        const email = document.getElementById('capture-email')?.value || '';
        const name = document.getElementById('capture-name')?.value || '';

        try {
            const data = await submitFanCapture({
                email,
                name,
                placement: captureContext.placement,
                intent: captureContext.intent
            });
            if (status) {
                status.textContent = data.message || 'You are in the loop.';
            }
            form.reset();
            if (data.campaign) {
                await loadDropCampaign();
            }
            if (data.nextUrl) {
                window.open(data.nextUrl, '_blank', 'noopener,noreferrer');
            }
            window.setTimeout(closeCaptureModal, 300);
        } catch (error) {
            if (status) {
                status.textContent = error.message || 'Something went wrong. Try again.';
            }
        }
    });
}

// Licensing inquiry form
function setupLicensingForm() {
    const form = document.getElementById('licensing-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const status = document.getElementById('licensing-status');

        const body = {
            name: document.getElementById('lic-name').value,
            email: document.getElementById('lic-email').value,
            project: document.getElementById('lic-project').value,
            message: document.getElementById('lic-message').value
        };

        try {
            const res = await fetch('/api/licensing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await res.json();
            status.textContent = data.message || 'Inquiry sent!';
            if (res.ok) form.reset();
        } catch {
            status.textContent = 'Something went wrong. Try again.';
        }
    });
}

// Populate track picker and wire up enable/disable on buy button
function populateTrackPicker() {
    const picker = document.getElementById('track-picker');
    const buyBtn = document.getElementById('buy-single-btn');
    if (!picker || !listAudio.length) return;

    // Clear existing options except the placeholder
    picker.innerHTML = '<option value="">Choose a track</option>';

    listAudio.forEach((track) => {
        const opt = document.createElement('option');
        opt.value = track.name;
        opt.textContent = track.name;
        picker.appendChild(opt);
    });

    // Enable/disable buy button based on selection
    picker.addEventListener('change', () => {
        if (buyBtn) buyBtn.disabled = !picker.value;
    });
}

// Stripe Checkout purchase handler
async function handlePurchase(type) {
    const btn = event.currentTarget;
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = 'Loading...';

    try {
        let trackName;
        if (type === 'single') {
            const picker = document.getElementById('track-picker');
            trackName = picker ? picker.value : '';
            if (!trackName) {
                alert('Please choose a track first.');
                btn.disabled = false;
                btn.innerHTML = originalText;
                return;
            }
        }

        const res = await fetch('/api/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, trackName })
        });

        const data = await res.json();
        if (data.url) {
            window.location.href = data.url;
        } else {
            throw new Error(data.error || 'Checkout failed');
        }
    } catch (err) {
        console.error('Purchase error:', err);
        alert('Something went wrong. Please try again.');
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}
