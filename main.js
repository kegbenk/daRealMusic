const playlist = [
  "music/100Ways2020.1.6.mp3",
  "music/100Ways2020.1.6.mp3",
  "music/100Ways2020.1.6.mp3",
  // Add more songs as needed
];

let currentTrackIndex = 0;
let audio = new Audio(playlist[currentTrackIndex]);

let playButton = document.getElementById("play");
let prevButton = document.getElementById("prev");
let nextButton = document.getElementById("next");
let seekBar = document.getElementById("seek-bar");

audio.addEventListener("loadedmetadata", () => {
  seekBar.max = audio.duration;
});

playButton.onclick = () => {
  if (audio.paused) {
    audio.play();
    playButton.textContent = "Pause";
  } else {
    audio.pause();
    playButton.textContent = "Play";
  }
};

nextButton.onclick = () => {
  if (currentTrackIndex < playlist.length - 1) {
    currentTrackIndex++;
  } else {
    currentTrackIndex = 0; // Loop back to the first song
  }
  audio.src = playlist[currentTrackIndex];
  audio.play();
  playButton.textContent = "Pause";
};

prevButton.onclick = () => {
  if (currentTrackIndex > 0) {
    currentTrackIndex--;
  } else {
    currentTrackIndex = playlist.length - 1; // Loop back to the last song
  }
  audio.src = playlist[currentTrackIndex];
  audio.play();
  playButton.textContent = "Pause";
};

seekBar.oninput = () => {
  audio.currentTime = seekBar.value;
};

audio.ontimeupdate = () => {
  seekBar.value = audio.currentTime;
};
