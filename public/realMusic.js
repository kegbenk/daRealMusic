// Global variables
let listAudio = []; // Initialize as empty array
let currentAudio = null;
let indexAudio = 0;

// Function to get signed URL for a song
async function getSignedUrl(songKey) {
    try {
        if (!songKey) {
            console.error('No song key provided to getSignedUrl');
            throw new Error('Song key is required');
        }
        
        console.log('Requesting signed URL for:', songKey);
        
        // Always use CloudFront URL in both development and production
        const cloudfrontUrl = `https://dpv15oji5tyx0.cloudfront.net/${songKey}`;
        console.log('Using CloudFront URL:', cloudfrontUrl);
        return cloudfrontUrl;
        
    } catch (error) {
        console.error('Error in getSignedUrl:', error);
        throw error;
    }
}

// Function to format time
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Function to create track item
function createTrackItem(index, name, duration) {
    const playlistContainer = document.querySelector(".playlist-ctn");
    if (!playlistContainer) {
        console.error('Playlist container not found');
        return;
    }

    var trackItem = document.createElement("div");
    trackItem.setAttribute("class", "playlist-track-ctn");
    trackItem.setAttribute("id", "ptc-" + index);
    trackItem.setAttribute("data-index", index);
    playlistContainer.appendChild(trackItem);

    var playBtnItem = document.createElement("div");
    playBtnItem.setAttribute("class", "playlist-btn-play");
    playBtnItem.setAttribute("id", "pbp-" + index);
    trackItem.appendChild(playBtnItem);

    var btnImg = document.createElement("i");
    btnImg.setAttribute("class", "fas fa-play");
    btnImg.setAttribute("height", "40");
    btnImg.setAttribute("width", "40");
    btnImg.setAttribute("id", "p-img-" + index);
    playBtnItem.appendChild(btnImg);

    var trackInfoItem = document.createElement("div");
    trackInfoItem.setAttribute("class", "playlist-info-track");
    trackInfoItem.innerHTML = name;
    trackItem.appendChild(trackInfoItem);

    var trackDurationItem = document.createElement("div");
    trackDurationItem.setAttribute("class", "playlist-duration");
    trackDurationItem.innerHTML = duration;
    trackItem.appendChild(trackDurationItem);
}

// Function to load music list from metadata
async function loadMusicList() {
    try {
        const response = await fetch('/list-music');
        if (!response.ok) {
            throw new Error('Failed to load music list');
        }
        
        listAudio = await response.json();
        console.log('Loaded music metadata:', listAudio);
        
        // Clear existing playlist
        const playlistContainer = document.querySelector(".playlist-ctn");
        if (!playlistContainer) {
            throw new Error('Playlist container not found');
        }
        playlistContainer.innerHTML = '';
        
        // Create track items for each song
        listAudio.forEach((track, index) => {
            createTrackItem(index, track.name, "00:00");
        });
        
        // Set up event listeners for playlist items
        const playListItems = document.querySelectorAll(".playlist-track-ctn");
        playListItems.forEach(item => {
            item.addEventListener("click", (event) => {
                const clickedIndex = parseInt(event.currentTarget.getAttribute("data-index"));
                if (clickedIndex === indexAudio) {
                    toggleAudio();
                } else {
                    loadNewTrack(clickedIndex);
                }
            });
        });
        
    } catch (error) {
        console.error('Error loading music list:', error);
    }
}

// Initialize the player when the page loads
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Player initializing...');
    try {
        // Initialize audio element
        currentAudio = document.getElementById("myAudio");
        if (!currentAudio) {
            throw new Error('Audio element not found');
        }

        // Set up audio event listeners
        currentAudio.addEventListener('timeupdate', onTimeUpdate);
        currentAudio.addEventListener('ended', () => {
            if (indexAudio < listAudio.length - 1) {
                loadNewTrack(indexAudio + 1);
            }
        });

        // Load the music list
        await loadMusicList();
        
        // Initialize the first track but don't play automatically
        if (listAudio.length > 0) {
            const firstTrackUrl = await getSignedUrl(listAudio[0].file.split('/').pop());
            document.querySelector("#source-audio").src = firstTrackUrl;
            document.querySelector(".title").innerHTML = listAudio[0].name;
            currentAudio.load();
            
            // Set initial UI state
            document.querySelector("#icon-play").style.display = "block";
            document.querySelector("#icon-pause").style.display = "none";
        }
        
        console.log('Player initialized');
    } catch (error) {
        console.error('Error initializing player:', error);
    }
});

// Function to update all playlist icons
function updatePlaylistIcons(playingIndex = -1) {
    // Reset all icons to play state
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

// Function to update playlist styling
function updateStylePlaylist(oldIndex, newIndex) {
    // Remove active class from old track
    const oldTrack = document.querySelector("#ptc-" + oldIndex);
    if (oldTrack) {
        oldTrack.classList.remove("active-track");
    }
    
    // Add active class to new track
    const newTrack = document.querySelector("#ptc-" + newIndex);
    if (newTrack) {
        newTrack.classList.add("active-track");
    }
    
    // Update play/pause icons
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

async function loadNewTrack(index) {
    try {
        if (!listAudio[index]) {
            throw new Error('Track not found at index: ' + index);
        }
        
        const filename = listAudio[index].file.split('/').pop();
        const audioUrl = await getSignedUrl(filename);
        
        const player = document.querySelector("#source-audio");
        const titleElement = document.querySelector(".title");
        
        if (!player || !titleElement || !currentAudio) {
            throw new Error('Required audio elements not found');
        }
        
        player.src = audioUrl;
        titleElement.innerHTML = listAudio[index].name;
        currentAudio.load();
        
        // Update UI
        updateStylePlaylist(indexAudio, index);
        indexAudio = index;
        
        // Don't automatically play on mobile
        if (window.innerWidth > 768) { // Only autoplay on desktop
            toggleAudio();
        } else {
            // On mobile, just update the UI
            document.querySelector("#icon-play").style.display = "block";
            document.querySelector("#icon-pause").style.display = "none";
        }
    } catch (error) {
        console.error('Error loading track:', error);
    }
}

function toggleAudio() {
    if (!currentAudio) {
        console.error('Audio element not found');
        return;
    }
    
    const playIcon = document.querySelector("#icon-play");
    const pauseIcon = document.querySelector("#icon-pause");
    const currentTrack = document.querySelector("#ptc-" + indexAudio);
    
    if (!playIcon || !pauseIcon || !currentTrack) {
        console.error('Required UI elements not found');
        return;
    }
    
    if (currentAudio.paused) {
        playIcon.style.display = "none";
        pauseIcon.style.display = "block";
        currentTrack.classList.add("active-track");
        playToPause(indexAudio);
        
        // iOS requires user interaction to start audio
        const playPromise = currentAudio.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.error('Error playing audio:', error);
                // Reset UI on error
                playIcon.style.display = "block";
                pauseIcon.style.display = "none";
                pauseToPlay(indexAudio);
            });
        }
    } else {
        playIcon.style.display = "block";
        pauseIcon.style.display = "none";
        pauseToPlay(indexAudio);
        currentAudio.pause();
    }
}

function pauseAudio() {
    if (currentAudio) {
        currentAudio.pause();
        clearInterval(interval1);
    }
}

var timer = document.getElementsByClassName("timer")[0];

var barProgress = document.getElementById("myBar");

var width = 0;

function onTimeUpdate() {
    if (!currentAudio) return;
    
    const t = currentAudio.currentTime;
    timer.innerHTML = formatTime(t);
    setBarProgress();
    
    if (currentAudio.ended) {
        document.querySelector("#icon-play").style.display = "block";
        document.querySelector("#icon-pause").style.display = "none";
        pauseToPlay(indexAudio);
        if (indexAudio < listAudio.length - 1) {
            const nextIndex = indexAudio + 1;
            loadNewTrack(nextIndex);
        }
    }
}

function setBarProgress() {
    if (!currentAudio) return;
    const progress = (currentAudio.currentTime / currentAudio.duration) * 100;
    document.getElementById("myBar").style.width = progress + "%";
}

var interval1;

function playToPause(index) {
    updatePlaylistIcons(index);
}

function pauseToPlay(index) {
    updatePlaylistIcons(-1); // -1 means no track is playing
}

function toggleMute() {
    var btnMute = document.querySelector("#toggleMute");
    var volUp = document.querySelector("#icon-vol-up");
    var volMute = document.querySelector("#icon-vol-mute");
    if (currentAudio.muted == false) {
        currentAudio.muted = true;
        volUp.style.display = "none";
        volMute.style.display = "block";
    } else {
        currentAudio.muted = false;
        volMute.style.display = "none";
        volUp.style.display = "block";
    }
}

// Add touch event support for mobile
function setupMobileSupport() {
    const playPauseBtn = document.querySelector("#btn-faws-play-pause");
    if (playPauseBtn) {
        playPauseBtn.addEventListener('touchstart', function(e) {
            e.preventDefault(); // Prevent double-tap zoom
            toggleAudio();
        });
    }
    
    // Add touch support for playlist items
    const playlistItems = document.querySelectorAll(".playlist-track-ctn");
    playlistItems.forEach(item => {
        item.addEventListener('touchstart', function(e) {
            e.preventDefault(); // Prevent double-tap zoom
            const clickedIndex = parseInt(this.getAttribute("data-index"));
            if (clickedIndex === indexAudio) {
                toggleAudio();
            } else {
                loadNewTrack(clickedIndex);
            }
        });
    });
}

// Call setupMobileSupport after DOM is loaded
document.addEventListener('DOMContentLoaded', setupMobileSupport);
