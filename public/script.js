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

  let playButton = document.getElementById("play");
  let prevButton = document.getElementById("prev");
  let nextButton = document.getElementById("next");

  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  let sourceNode;
  let gainNode = audioContext.createGain(); // Create a gain node
  gainNode.gain.value = 0.01; // Set gain to a very low value to minimize mic input volume

  // Ask for microphone access and keep the audio context active
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(function (stream) {
        sourceNode = audioContext.createMediaStreamSource(stream);
        sourceNode.connect(gainNode); // Connect the source to the gain node
        gainNode.connect(audioContext.destination); // Connect the gain node to the destination
        console.log("Microphone is active with reduced gain");
      })
      .catch(function (err) {
        console.log("Error accessing the microphone: ", err);
      });
  }

  function loadTrack(index) {
    if (index >= 0 && index < playlist.length) {
      currentTrackIndex = index; // Update current track index
      let track = playlist[currentTrackIndex];
      audio.src = track.url;
      document.getElementById("track-title").textContent = track.title;
      document.getElementById("artist-name").textContent = track.artist;
      document.getElementById("album-cover").src = track.artwork;
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

  playButton.addEventListener("click", togglePlayback);
  nextButton.addEventListener("click", playNextTrack);
  prevButton.addEventListener("click", playPreviousTrack);

  function togglePlayback() {
    if (audio.paused) {
      audio.play();
      playButton.textContent = "Pause";
    } else {
      audio.pause();
      playButton.textContent = "Play";
    }
  }

  function playNextTrack() {
    if (currentTrackIndex < playlist.length - 1) {
      loadTrack(currentTrackIndex + 1);
    } else {
      loadTrack(0); // Loop back to the first song
    }
  }

  function playPreviousTrack() {
    if (currentTrackIndex > 0) {
      loadTrack(currentTrackIndex - 1);
    } else {
      loadTrack(playlist.length - 1); // Loop to the last song
    }
  }

  loadTrack(currentTrackIndex); // Load the first track
});
