// Global variables
let listAudio = [];
let currentAudio = null;
let indexAudio = 0;

// CloudFront URL for audio files
function getSignedUrl(songKey) {
    return `https://dpv15oji5tyx0.cloudfront.net/${songKey}`;
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
        artist: 'DrainBow',
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

        currentAudio.addEventListener('timeupdate', onTimeUpdate);
        currentAudio.addEventListener('ended', () => {
            if (indexAudio < listAudio.length - 1) {
                loadNewTrack(indexAudio + 1);
            }
        });

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

// Email signup form
function setupEmailForm() {
    const form = document.getElementById('email-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const status = document.getElementById('email-status');
        const email = document.getElementById('signup-email').value;

        try {
            const res = await fetch('/api/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            status.textContent = data.message || 'Subscribed!';
            if (res.ok) form.reset();
        } catch {
            status.textContent = 'Something went wrong. Try again.';
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

// Purchase handler (placeholder for Stripe integration)
function handlePurchase(type) {
    // TODO: Replace with Stripe Checkout or payment link
    // For now, redirect to email with purchase intent
    const subject = encodeURIComponent(
        type === 'album' ? 'Album Purchase - Life Under Bittherium' :
        type === 'single' ? 'Single Track Purchase' :
        'Support / Name Your Price'
    );
    const body = encodeURIComponent(
        `I'd like to purchase: ${type === 'album' ? 'Full Album' : type === 'single' ? 'Single Track' : 'Name Your Price'}\n\nPlease send payment details.`
    );
    window.location.href = `mailto:contact@pleromallc.com?subject=${subject}&body=${body}`;
}
