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
  const audio = document.createElement("audio");
  document.body.appendChild(audio);

  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const track = audioContext.createMediaElementSource(audio);
  const gainNode = audioContext.createGain();
  track.connect(gainNode);
  gainNode.connect(audioContext.destination);

  let playButton = document.getElementById("play");
  let prevButton = document.getElementById("prev");
  let nextButton = document.getElementById("next");

  function loadTrack(index) {
    if (index >= 0 && index < playlist.length) {
      currentTrackIndex = index;
      let track = playlist[currentTrackIndex];
      audio.src = track.url;
      audio.load();
      audio.play();
      updateMediaSession(currentTrackIndex);
    }
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

  // Volume control
  function setVolume(level) {
    gainNode.gain.value = level;
  }

  // Example: In-app control for volume (slider)
  const volumeControl = document.createElement("input");
  volumeControl.type = "range";
  volumeControl.min = 0;
  volumeControl.max = 1;
  volumeControl.step = 0.01;
  volumeControl.value = gainNode.gain.value;
  volumeControl.addEventListener("input", () => {
    setVolume(parseFloat(volumeControl.value));
  });
  document.body.appendChild(volumeControl);

  loadTrack(currentTrackIndex); // Load the first track
});
