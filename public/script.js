document.addEventListener("DOMContentLoaded", () => {
  const playlist = [
    {
      url: "music/100Ways2020.1.6.mp3",
      title: "100 Wayz",
      artist: "DrainBow",
      album: "Life Under Bittherium",
      artwork: "img/album.jpg",
    },
    {
      url: "music/daPreacher3.0.mp3",
      title: "100 Wayz",
      artist: "DrainBow",
      album: "Life Under Bittherium",
      artwork: "img/album.jpg",
    },
    {
      url: "music/song3.mp3",
      title: "Song 3",
      artist: "Artist 3",
      album: "Album 3",
      artwork: "img/album.jpg",
    },
  ];

  let currentTrackIndex = 0;
  let audio = new Audio();
  let playButton = document.getElementById("play");
  let prevButton = document.getElementById("prev");
  let nextButton = document.getElementById("next");

  function loadTrack(index) {
    let track = playlist[index];
    audio.src = track.url;
    audio.addEventListener("loadedmetadata", () => {
      document.getElementById("track-title").textContent = track.title;
      document.getElementById("artist-name").textContent = track.artist;
      document.getElementById("album-cover").src = track.artwork;
    });
    updateMediaSession(index);
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
        playButton.textContent = "Pause";
      });

      navigator.mediaSession.setActionHandler("pause", () => {
        audio.pause();
        playButton.textContent = "Play";
      });

      navigator.mediaSession.setActionHandler(
        "previoustrack",
        playPreviousTrack
      );
      navigator.mediaSession.setActionHandler("nexttrack", playNextTrack);
    }
  }

  playButton.addEventListener("click", () => {
    if (audio.paused) {
      audio.play();
      playButton.textContent = "Pause";
    } else {
      audio.pause();
      playButton.textContent = "Play";
    }
  });

  nextButton.addEventListener("click", playNextTrack);
  prevButton.addEventListener("click", playPreviousTrack);

  function playNextTrack() {
    if (currentTrackIndex < playlist.length - 1) {
      currentTrackIndex++;
    } else {
      currentTrackIndex = 0;
    }
    loadTrack(currentTrackIndex);
    audio.play();
  }

  function playPreviousTrack() {
    if (currentTrackIndex > 0) {
      currentTrackIndex--;
    } else {
      currentTrackIndex = playlist.length - 1;
    }
    loadTrack(currentTrackIndex);
    audio.play();
  }

  loadTrack(currentTrackIndex); // Load the first track but do not play automatically
});
