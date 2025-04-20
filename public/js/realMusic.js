// Function to get signed URL for a song
async function getSignedUrl(songKey) {
    try {
        if (!songKey) {
            console.error('No song key provided to getSignedUrl');
            throw new Error('Song key is required');
        }
        
        console.log('Requesting signed URL for:', songKey);
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
        const signedUrl = await getSignedUrl(songKey);
        console.log('Created audio element with URL:', signedUrl);
        
        const audio = new Audio(signedUrl);
        
        // Set up event listeners
        audio.addEventListener('loadedmetadata', () => {
            console.log('Audio metadata loaded');
            updateProgressBar(0);
            updateTimeDisplay(0, audio.duration);
        });
        
        audio.addEventListener('error', (e) => {
            console.error('Audio error:', e);
            console.error('Audio error details:', audio.error);
        });
        
        audio.addEventListener('timeupdate', () => {
            updateProgressBar(audio.currentTime / audio.duration);
            updateTimeDisplay(audio.currentTime, audio.duration);
        });
        
        // Play the audio
        console.log('Attempting to play audio');
        await audio.play();
        console.log('Audio playback started');
        return audio;
    } catch (error) {
        console.error('Error playing song:', error);
        throw error;
    }
} 