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
      title: "Da Preacher",
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
  const trackSource = audioContext.createMediaElementSource(audio);
  const gainNode = audioContext.createGain();
  trackSource.connect(gainNode);
  gainNode.connect(audioContext.destination);

  let playButton = document.getElementById("play");
  let prevButton = document.getElementById("prev");
  let nextButton = document.getElementById("next");

  // Set up a separate gain node for the microphone input
  const micGainNode = audioContext.createGain();
  micGainNode.gain.value = 0.01; // Minimize mic input volume

  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(function (stream) {
        const micSource = audioContext.createMediaStreamSource(stream);
        micSource.connect(micGainNode); // Connect mic to its own gain node
        micGainNode.connect(audioContext.destination); // Do NOT route this to the main output
      })
      .catch(function (err) {
        console.log("Error accessing the microphone: ", err);
      });
  }

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

  audio.addEventListener("ended", playNextTrack);

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
