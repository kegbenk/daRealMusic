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
        
        // Check if we're in development mode
        const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        
        if (isDevelopment) {
            console.log('Development mode: Using CloudFront URL');
            // In development, use the CloudFront URL
            return `https://dpv15oji5tyx0.cloudfront.net/${songKey}`;
        } else {
            // In production, get signed URL from the server
            const response = await fetch(`/get-signed-url?key=${encodeURIComponent(songKey)}`);
            
            if (!response.ok) {
                let errorMessage = 'Failed to get signed URL';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorMessage;
                } catch (e) {
                    console.error('Error parsing error response:', e);
                }
                throw new Error(errorMessage);
            }
            
            const data = await response.json();
            console.log('Received signed URL:', data.url);
            return data.url;
        }
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
    const trackItem = document.createElement("div");
    trackItem.className = "playlist-track-ctn";
    trackItem.id = `ptc-${index}`;
    trackItem.setAttribute("data-index", index);
    
    const playBtnItem = document.createElement("div");
    playBtnItem.className = "playlist-btn-play";
    playBtnItem.id = `pbp-${index}`;
    
    const btnImg = document.createElement("i");
    btnImg.className = "fas fa-play";
    btnImg.id = `p-img-${index}`;
    
    const trackInfoItem = document.createElement("div");
    trackInfoItem.className = "playlist-info-track";
    trackInfoItem.textContent = name;
    
    const trackDurationItem = document.createElement("div");
    trackDurationItem.className = "playlist-duration";
    trackDurationItem.textContent = duration;
    
    playBtnItem.appendChild(btnImg);
    trackItem.appendChild(playBtnItem);
    trackItem.appendChild(trackInfoItem);
    trackItem.appendChild(trackDurationItem);
    
    document.querySelector(".playlist-ctn").appendChild(trackItem);
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
        document.querySelector(".playlist-ctn").innerHTML = '';
        
        // Create track items for each song
        listAudio.forEach((track, index) => {
            createTrackItem(index, track.name, "00:00"); // We'll update duration when needed
        });
        
        // Set up event listeners for playlist items
        const playListItems = document.querySelectorAll(".playlist-track-ctn");
        playListItems.forEach(item => {
            item.addEventListener("click", getClickedElement);
        });
        
    } catch (error) {
        console.error('Error loading music list:', error);
    }
}

// Initialize the player when the page loads
window.onload = async function() {
    console.log('Player initializing...');
    await loadMusicList();
    console.log('Player initialized');
};

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

async function loadNewTrack(index) {
    try {
        console.log('Loading new track, index:', index);
        const track = listAudio[index];
        if (!track) {
            throw new Error('Track not found');
        }
        
        // Reset all icons to play state
        updatePlaylistIcons(-1);
        
        // Get or create audio element
        let audio = document.getElementById("myAudio");
        if (!audio) {
            console.log('Creating new audio element');
            audio = document.createElement('audio');
            audio.id = 'myAudio';
            audio.preload = 'none'; // Changed from 'metadata' to 'none' for better iOS compatibility
            document.body.appendChild(audio);
        }
        
        // If there was a previously playing track, ensure it's paused and reset
        if (currentAudio) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
        }
        
        console.log('Getting signed URL for:', track.file);
        const audioUrl = await getSignedUrl(track.file);
        if (!audioUrl) {
            throw new Error('Failed to get signed URL');
        }
        console.log('Received signed URL:', audioUrl);
        
        // Clear any existing source
        audio.src = '';
        
        // Set up event listeners
        const canPlayPromise = new Promise((resolve, reject) => {
            const handleCanPlay = () => {
                console.log('Audio can play');
                // Update duration display
                const duration = formatTime(audio.duration);
                document.querySelector(".duration").textContent = duration;
                document.querySelector(`#ptc-${index} .playlist-duration`).textContent = duration;
                
                audio.removeEventListener('canplay', handleCanPlay);
                audio.removeEventListener('error', handleError);
                resolve();
            };
            
            const handleError = (error) => {
                console.error('Audio error in canPlayPromise:', error);
                console.error('Audio element state:', {
                    src: audio.src,
                    error: audio.error,
                    networkState: audio.networkState,
                    readyState: audio.readyState
                });
                audio.removeEventListener('canplay', handleCanPlay);
                audio.removeEventListener('error', handleError);
                reject(error);
            };
            
            audio.addEventListener('canplay', handleCanPlay);
            audio.addEventListener('error', handleError);
        });
        
        // Set the new source
        audio.src = audioUrl;
        
        // Wait for the audio to be ready
        await canPlayPromise;
        
        currentAudio = audio;
        indexAudio = index;
        
        // Update UI
        document.querySelector(".title").textContent = track.name;
        
        // Update active track in playlist
        const playlistItems = document.querySelectorAll(".playlist-track-ctn");
        playlistItems.forEach(item => item.classList.remove("active-track"));
        const currentItem = document.querySelector(`#ptc-${index}`);
        if (currentItem) {
            currentItem.classList.add("active-track");
        }
        
        // Update play/pause button
        document.querySelector("#icon-play").style.display = "block";
        document.querySelector("#icon-pause").style.display = "none";
        
        console.log('Track loaded successfully');
        
    } catch (error) {
        console.error('Error loading track:', error);
        // Reset the audio element on error
        const audio = document.getElementById("myAudio");
        if (audio) {
            audio.src = '';
        }
        // Show error to user
        document.querySelector(".title").textContent = "Error loading track";
    }
}

function getClickedElement(event) {
    const clickedItem = event.currentTarget;
    const clickedIndex = parseInt(clickedItem.getAttribute("data-index"));
    
    if (clickedIndex === indexAudio && currentAudio) {
        // If clicking the currently playing track, toggle play/pause
        toggleAudio();
    } else {
        // If clicking a different track, load and play it
        loadNewTrack(clickedIndex).then(() => {
            // After loading, play the track and update UI
            if (currentAudio) {
                currentAudio.play();
                // Update main play/pause button
                document.querySelector("#icon-play").style.display = "none";
                document.querySelector("#icon-pause").style.display = "block";
                // Update playlist icon
                updatePlaylistIcons(clickedIndex);
            }
        }).catch(error => {
            console.error('Error playing track:', error);
        });
    }
}

function toggleAudio() {
    if (!currentAudio) {
        console.error('No audio element available');
        return;
    }
    
    if (currentAudio.paused) {
        document.querySelector("#icon-play").style.display = "none";
        document.querySelector("#icon-pause").style.display = "block";
        updatePlaylistIcons(indexAudio);
        
        // iOS requires user interaction to start audio
        const playPromise = currentAudio.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.error('Error playing audio:', error);
                // Reset UI on error
                document.querySelector("#icon-play").style.display = "block";
                document.querySelector("#icon-pause").style.display = "none";
                updatePlaylistIcons(-1);
            });
        }
    } else {
        document.querySelector("#icon-play").style.display = "block";
        document.querySelector("#icon-pause").style.display = "none";
        updatePlaylistIcons(-1);
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
