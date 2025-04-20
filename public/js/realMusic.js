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
            return `/${songKey}`;
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

// Function to play a song
async function playSong(songKey) {
    try {
        console.log('Attempting to play song:', songKey);
        
        // Get the CloudFront URL from our backend
        const response = await fetch(`/get-signed-url?key=${encodeURIComponent(songKey)}`);
        if (!response.ok) {
            throw new Error(`Failed to get URL: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        if (!data.url) {
            throw new Error('No URL returned from server');
        }
        
        console.log('Received CloudFront URL:', data.url);
        
        // Create audio element with the CloudFront URL
        const audio = new Audio(data.url);
        
        // Set up event listeners
        audio.addEventListener('loadedmetadata', () => {
            console.log('Audio metadata loaded');
            updateProgressBar(0);
        });
        
        audio.addEventListener('timeupdate', () => {
            updateProgressBar((audio.currentTime / audio.duration) * 100);
        });
        
        audio.addEventListener('ended', () => {
            playNextSong();
        });
        
        // Play the audio
        await audio.play();
        currentAudio = audio;
        updatePlayPauseButton();
        
    } catch (error) {
        console.error('Error playing song:', error);
        // You might want to show an error message to the user here
    }
} 