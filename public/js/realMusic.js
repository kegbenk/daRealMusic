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
            console.log('Development mode: Using local file path');
            // In development, use the local file path
            return `/music/${songKey}`;
        } else {
            // In production, get signed URL from the server
            const url = `/get-signed-url?key=music/${songKey}`;
            console.log('Making request to:', url);
            
            const response = await fetch(url);
            
            if (!response.ok) {
                const errorData = await response.json();
                console.error('Failed to get signed URL:', errorData);
                throw new Error(errorData.error || 'Failed to get signed URL');
            }
            
            const data = await response.json();
            console.log('Received signed URL:', data.url);
            return data.url;
        }
    } catch (error) {
        console.error('Error getting signed URL:', error);
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