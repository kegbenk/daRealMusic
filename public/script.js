document.addEventListener("DOMContentLoaded", () => {
  const playlist = [
    {
      url: "music/100Ways2020.1.6.mp3",
      title: "100 Wayz",
      artist: "DrainBow",
      album: "Life Under Bittherium",
      artwork: [{ src: "img/album.png", sizes: "96x96", type: "image/jpeg" }],
    },
    {
      url: "music/daPreacher3.0.mp3",
      title: "100 Wayz",
      artist: "DrainBow",
      album: "Life Under Bittherium",
      artwork: [{ src: "img/album.png", sizes: "96x96", type: "image/jpeg" }],
    },
    {
      url: "music/song3.mp3",
      title: "Song 3",
      artist: "Artist 3",
      album: "Album 3",
      artwork: [{ src: "img/album3.jpg", sizes: "96x96", type: "image/jpeg" }],
    },
  ];
  let currentTrackIndex = 0;
  let audio = new Audio();
  loadTrack(currentTrackIndex);

  function loadTrack(index) {
    let track = playlist[index];
    audio.src = track.url;
    audio.load(); // Ensure the audio is reloaded when track changes
    updateMediaSession(index);
    audio.play(); // Auto-play upon track load
  }

  function updateMediaSession(index) {
    let track = playlist[index];
    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: track.album,
        artwork: [{ src: track.artwork, sizes: "512x512", type: "image/png" }],
      });

      navigator.mediaSession.setActionHandler("play", () => {
        audio.play();
      });

      navigator.mediaSession.setActionHandler("pause", () => {
        audio.pause();
      });

      navigator.mediaSession.setActionHandler("previoustrack", () => {
        playPreviousTrack();
      });

      navigator.mediaSession.setActionHandler("nexttrack", () => {
        playNextTrack();
      });
    }
  }

  function playNextTrack() {
    if (currentTrackIndex < playlist.length - 1) {
      currentTrackIndex++;
    } else {
      currentTrackIndex = 0; // Loop back to the first song
    }
    loadTrack(currentTrackIndex);
  }

  function playPreviousTrack() {
    if (currentTrackIndex > 0) {
      currentTrackIndex--;
    } else {
      currentTrackIndex = playlist.length - 1; // Loop to the last song
    }
    loadTrack(currentTrackIndex);
  }
});
