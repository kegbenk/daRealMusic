// Function to get signed URL for a song
async function getSignedUrl(songKey) {
    try {
        const response = await fetch(`/get-signed-url?key=${encodeURIComponent(songKey)}`);
        if (!response.ok) {
            throw new Error('Failed to get signed URL');
        }
        const data = await response.json();
        return data.url;
    } catch (error) {
        console.error('Error getting signed URL:', error);
        throw error;
    }
}

// Function to play a song
async function playSong(songKey) {
    try {
        const signedUrl = await getSignedUrl(songKey);
        const audio = new Audio(signedUrl);
        
        // Set up event listeners
        audio.addEventListener('loadedmetadata', () => {
            updateProgressBar(0);
            updateTimeDisplay(0, audio.duration);
        });
        
        audio.addEventListener('timeupdate', () => {
            updateProgressBar(audio.currentTime / audio.duration);
            updateTimeDisplay(audio.currentTime, audio.duration);
        });
        
        // Play the audio
        await audio.play();
        return audio;
    } catch (error) {
        console.error('Error playing song:', error);
        throw error;
    }
} 