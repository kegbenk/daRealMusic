const playlist = [
  {
    url: "music/100Ways2020.1.6.mp3",
    title: "100 Wayz",
    artist: "DrainBow",
    album: "Life Under Bittherium",
    artwork: [{ src: "img/album.jpg", sizes: "96x96", type: "image/jpeg" }],
  },
  {
    url: "music/daPreacher3.0.mp3",
    title: "100 Wayz",
    artist: "DrainBow",
    album: "Life Under Bittherium",
    artwork: [{ src: "img/album.jpg", sizes: "96x96", type: "image/jpeg" }],
  },
  {
    url: "music/song3.mp3",
    title: "Song 3",
    artist: "Artist 3",
    album: "Album 3",
    artwork: [{ src: "img/album3.jpg", sizes: "96x96", type: "image/jpeg" }],
  },
  // More songs can be added here
];

let currentTrackIndex = 0;
let audio = new Audio();
loadTrack(currentTrackIndex);

let playButton = document.getElementById("play");
let prevButton = document.getElementById("prev");
let nextButton = document.getElementById("next");
let seekBar = document.getElementById("seek-bar");

function loadTrack(index) {
  audio.src = playlist[index].url;
  audio.addEventListener("loadedmetadata", () => {
    seekBar.max = audio.duration;
  });
  updateMediaSession(index);
}

function updateMediaSession(index) {
  if ("mediaSession" in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: playlist[index].title,
      artist: playlist[index].artist,
      album: playlist[index].album,
      artwork: playlist[index].artwork,
    });

    navigator.mediaSession.setActionHandler("play", () => {
      audio.play();
      playButton.textContent = "Pause";
    });

    navigator.mediaSession.setActionHandler("pause", () => {
      audio.pause();
      playButton.textContent = "Play";
    });

    navigator.mediaSession.setActionHandler("previoustrack", () => {
      playPreviousTrack();
    });

    navigator.mediaSession.setActionHandler("nexttrack", () => {
      playNextTrack();
    });
  }
}

playButton.onclick = () => {
  if (audio.paused) {
    audio.play();
    playButton.textContent = "Pause";
  } else {
    audio.pause();
    playButton.textContent = "Play";
  }
};

nextButton.onclick = playNextTrack;
prevButton.onclick = playPreviousTrack;

function playNextTrack() {
  if (currentTrackIndex < playlist.length - 1) {
    currentTrackIndex++;
  } else {
    currentTrackIndex = 0; // Loop back to the first song
  }
  loadTrack(currentTrackIndex);
  audio.play();
}

function playPreviousTrack() {
  if (currentTrackIndex > 0) {
    currentTrackIndex--;
  } else {
    currentTrackIndex = playlist.length - 1; // Loop to the last song
  }
  loadTrack(currentTrackIndex);
  audio.play();
}

seekBar.oninput = () => {
  audio.currentTime = seekBar.value;
};

audio.ontimeupdate = () => {
  seekBar.value = audio.currentTime;
};
