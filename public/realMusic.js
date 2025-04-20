// Global variables
let listAudio = [];
let currentAudio = null;
let indexAudio = 0;

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

// Function to preload metadata for a song
async function preloadSongMetadata(track, index) {
    try {
        const audioUrl = await getSignedUrl(track.file);
        const tempAudio = new Audio();
        
        return new Promise((resolve) => {
            tempAudio.addEventListener('loadedmetadata', function() {
                const duration = formatTime(tempAudio.duration);
                // Update the duration in the playlist
                const durationElement = document.querySelector(`#ptc-${index} .playlist-duration`);
                if (durationElement) {
                    durationElement.textContent = duration;
                }
                // Update the track in listAudio
                listAudio[index].duration = duration;
                resolve();
            });
            
            tempAudio.src = audioUrl;
            tempAudio.load();
        });
    } catch (error) {
        console.error(`Error preloading metadata for ${track.name}:`, error);
    }
}

// Function to load music list from S3
async function loadMusicList() {
    try {
        const response = await fetch('/list-music');
        if (!response.ok) {
            throw new Error('Failed to load music list');
        }
        
        listAudio = await response.json();
        console.log('Loaded music list:', listAudio);
        
        // Clear existing playlist
        document.querySelector(".playlist-ctn").innerHTML = '';
        
        // Create track items for each song
        listAudio.forEach((track, index) => {
            createTrackItem(index, track.name, track.duration);
        });
        
        // Set up event listeners for playlist items
        const playListItems = document.querySelectorAll(".playlist-track-ctn");
        playListItems.forEach(item => {
            item.addEventListener("click", getClickedElement);
        });
        
        // Preload metadata for all songs
        const preloadPromises = listAudio.map((track, index) => preloadSongMetadata(track, index));
        await Promise.all(preloadPromises);
        
    } catch (error) {
        console.error('Error loading music list:', error);
    }
}

// Function to toggle audio playback
function toggleAudio() {
    const audio = document.getElementById("myAudio");
    if (!audio) {
        console.error('Audio element not found');
        return;
    }

    if (audio.paused) {
        document.querySelector("#icon-play").style.display = "none";
        document.querySelector("#icon-pause").style.display = "block";
        audio.play();
    } else {
        document.querySelector("#icon-play").style.display = "block";
        document.querySelector("#icon-pause").style.display = "none";
        audio.pause();
    }
}

// Function to load a new track
async function loadNewTrack(index) {
    try {
        const track = listAudio[index];
        const audioUrl = await getSignedUrl(track.file);
        
        // Update audio source
        const audio = document.getElementById("myAudio");
        if (!audio) {
            console.error('Audio element not found');
            return;
        }
        
        audio.src = audioUrl;
        currentAudio = audio;
        
        // Update UI
        document.querySelector(".title").textContent = track.name;
        updateStylePlaylist(indexAudio, index);
        indexAudio = index;
        
        // Load and play the audio
        audio.load();
        toggleAudio();
        
    } catch (error) {
        console.error('Error loading track:', error);
    }
}

// Function to handle playlist item clicks
function getClickedElement(event) {
    const clickedItem = event.currentTarget;
    const clickedIndex = parseInt(clickedItem.getAttribute("data-index"));
    
    if (clickedIndex === indexAudio) {
        toggleAudio();
    } else {
        loadNewTrack(clickedIndex);
    }
}

// Initialize the player when the page loads
window.onload = async function() {
    console.log('Player initializing...');
    
    // Set up audio element
    const audio = document.getElementById("myAudio");
    if (!audio) {
        console.error('Audio element not found during initialization');
        return;
    }
    
    // Set up event listeners for audio element
    audio.addEventListener('loadedmetadata', function() {
        const duration = formatTime(audio.duration);
        document.querySelector(".duration").textContent = duration;
    });
    
    // Load the music list (which will preload all metadata)
    await loadMusicList();
    
    // Set up progress bar
    const progressbar = document.querySelector("#myProgress");
    if (progressbar) {
        progressbar.addEventListener("click", seek);
    }
    
    console.log('Player initialized');
};

var interval1;

function pauseAudio() {
  this.currentAudio.pause();
  clearInterval(interval1);
}

var timer = document.getElementsByClassName("timer")[0];

var barProgress = document.getElementById("myBar");

var width = 0;

function onTimeUpdate() {
    if (!currentAudio) {
        console.error('No audio element available');
        return;
    }

    const t = currentAudio.currentTime;
    timer.innerHTML = getMinutes(t);
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

function getMinutes(t) {
    const min = Math.floor(t / 60);
    const sec = Math.floor(t % 60);
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

var progressbar = document.querySelector("#myProgress");
progressbar.addEventListener("click", seek.bind(this));

function seek(event) {
    if (!currentAudio) return;
    const percent = event.offsetX / progressbar.offsetWidth;
    currentAudio.currentTime = percent * currentAudio.duration;
    barProgress.style.width = percent * 100 + "%";
}

function forward() {
    if (!currentAudio) return;
    currentAudio.currentTime = currentAudio.currentTime + 5;
    setBarProgress();
}

function rewind() {
    if (!currentAudio) return;
    currentAudio.currentTime = currentAudio.currentTime - 5;
    setBarProgress();
}

function next() {
    if (indexAudio < listAudio.length - 1) {
        const oldIndex = indexAudio;
        indexAudio++;
        updateStylePlaylist(oldIndex, indexAudio);
        loadNewTrack(indexAudio);
    }
}

function previous() {
    if (indexAudio > 0) {
        const oldIndex = indexAudio;
        indexAudio--;
        updateStylePlaylist(oldIndex, indexAudio);
        loadNewTrack(indexAudio);
    }
}

function updateStylePlaylist(oldIndex, newIndex) {
    document.querySelector("#ptc-" + oldIndex).classList.remove("active-track");
    pauseToPlay(oldIndex);
    document.querySelector("#ptc-" + newIndex).classList.add("active-track");
    playToPause(newIndex);
}

function playToPause(index) {
    const ele = document.querySelector("#p-img-" + index);
    ele.classList.remove("fa-play");
    ele.classList.add("fa-pause");
}

function pauseToPlay(index) {
    const ele = document.querySelector("#p-img-" + index);
    ele.classList.remove("fa-pause");
    ele.classList.add("fa-play");
}

function toggleMute() {
    if (!currentAudio) return;
    const btnMute = document.querySelector("#toggleMute");
    const volUp = document.querySelector("#icon-vol-up");
    const volMute = document.querySelector("#icon-vol-mute");
    
    if (currentAudio.muted === false) {
        currentAudio.muted = true;
        volUp.style.display = "none";
        volMute.style.display = "block";
    } else {
        currentAudio.muted = false;
        volMute.style.display = "none";
        volUp.style.display = "block";
    }
}

// Function to get signed URL for a song
async function getSignedUrl(songKey) {
    try {
        if (!songKey) {
            console.error('No song key provided to getSignedUrl');
            throw new Error('Song key is required');
        }
        
        console.log('Requesting signed URL for:', songKey);
        
        // Always use the server endpoint to get the CloudFront URL
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
        console.log('Received CloudFront URL:', data.url);
        return data.url;
    } catch (error) {
        console.error('Error in getSignedUrl:', error);
        throw error;
    }
}

// Function to play a song
async function playSong(songKey) {
    try {
        if (!songKey) {
            console.error('No song key provided to playSong');
            throw new Error('Song key is required');
        }
        
        console.log('Attempting to play song:', songKey);
        const audioUrl = await getSignedUrl(songKey);
        console.log('Created audio element with URL:', audioUrl);
        
        // Stop current audio if playing
        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
        }
        
        // Create new audio element
        currentAudio = new Audio(audioUrl);
        
        // Set up event listeners
        currentAudio.addEventListener('loadedmetadata', () => {
            console.log('Audio metadata loaded');
            updateProgressBar(0);
            updateTimeDisplay(0, currentAudio.duration);
            document.querySelector('.title').textContent = songKey;
            document.querySelector('.duration').textContent = formatTime(currentAudio.duration);
        });
        
        currentAudio.addEventListener('error', (e) => {
            console.error('Audio error:', e);
            console.error('Audio error details:', currentAudio.error);
        });
        
        currentAudio.addEventListener('timeupdate', () => {
            updateProgressBar(currentAudio.currentTime / currentAudio.duration);
            updateTimeDisplay(currentAudio.currentTime, currentAudio.duration);
        });
        
        // Play the audio
        console.log('Attempting to play audio');
        await currentAudio.play();
        console.log('Audio playback started');
        
        // Update play/pause button
        document.getElementById('icon-play').style.display = 'none';
        document.getElementById('icon-pause').style.display = 'inline';
        
    } catch (error) {
        console.error('Error playing song:', error);
        throw error;
    }
}
