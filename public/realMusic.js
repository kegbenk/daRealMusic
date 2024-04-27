function createTrackItem(index, name, duration) {
  var trackItem = document.createElement("div");
  trackItem.setAttribute("class", "playlist-track-ctn");
  trackItem.setAttribute("id", "ptc-" + index);
  trackItem.setAttribute("data-index", index);
  document.querySelector(".playlist-ctn").appendChild(trackItem);

  var playBtnItem = document.createElement("div");
  playBtnItem.setAttribute("class", "playlist-btn-play");
  playBtnItem.setAttribute("id", "pbp-" + index);
  document.querySelector("#ptc-" + index).appendChild(playBtnItem);

  var btnImg = document.createElement("i");
  btnImg.setAttribute("class", "fas fa-play");
  btnImg.setAttribute("height", "40");
  btnImg.setAttribute("width", "40");
  btnImg.setAttribute("id", "p-img-" + index);
  document.querySelector("#pbp-" + index).appendChild(btnImg);

  var trackInfoItem = document.createElement("div");
  trackInfoItem.setAttribute("class", "playlist-info-track");
  trackInfoItem.innerHTML = name;
  document.querySelector("#ptc-" + index).appendChild(trackInfoItem);

  var trackDurationItem = document.createElement("div");
  trackDurationItem.setAttribute("class", "playlist-duration");
  trackDurationItem.innerHTML = duration;
  document.querySelector("#ptc-" + index).appendChild(trackDurationItem);
}

var listAudio = [
  {
    name: "theLowest8.23",
    file: "music/theLowest8.23.mp3",
    duration: "01:42",
  },
  {
    name: "AnnasSong1d",
    file: "music/AnnasSong1d.mp3",
    duration: "Unknown",
  },
  {
    name: "daPreacher3.0",
    file: "music/daPreacher3.0.mp3",
    duration: "Unknown",
  },
  {
    name: "100waysDec",
    file: "music/100waysDec.mp3",
    duration: "Unknown",
  },
  {
    name: "palindrome",
    file: "music/palindrome.mp3",
    duration: "Unknown",
  },
  {
    name: "ScratchSlow",
    file: "music/ScratchSlow.mp3",
    duration: "Unknown",
  },
  {
    name: "USAmax2oct",
    file: "music/USAmax2oct.mp3",
    duration: "Unknown",
  },
  {
    name: "theEndIsTheBeginning3.2",
    file: "music/theEndIsTheBeginning3.2.mp3",
    duration: "Unknown",
  },
  { name: "JBrown", file: "music/JBrown.mp3", duration: "Unknown" },
  {
    name: "01 Hip Hop",
    file: "music/01 Hip Hop.mp3",
    duration: "Unknown",
  },
  { name: "scratch2", file: "music/scratch2.mp3", duration: "Unknown" },
  {
    name: "100Ways2020.1.6",
    file: "music/100Ways2020.1.6.mp3",
    duration: "Unknown",
  },
  { name: "Lawless2", file: "music/Lawless2.mp3", duration: "Unknown" },
  {
    name: "BMB18c1(1)",
    file: "music/BMB18c1(1).mp3",
    duration: "Unknown",
  },
  {
    name: "USAsmoove24unFreeze",
    file: "music/USAsmoove24unFreeze.mp3",
    duration: "Unknown",
  },
  {
    name: "BabylonmkIsept18",
    file: "music/BabylonmkIsept18.mp3",
    duration: "Unknown",
  },
  {
    name: "ThornBros2019",
    file: "music/ThornBros2019.mp3",
    duration: "Unknown",
  },
  { name: "BMB18c1", file: "music/BMB18c1.mp3", duration: "Unknown" },
  { name: "Powder", file: "music/Powder.mp3", duration: "Unknown" },
  {
    name: "theLowest8.23",
    file: "music/theLowest8.23.mp3",
    duration: "Unknown",
  },
  {
    name: "IllFlyAway",
    file: "music/IllFlyAway.mp3",
    duration: "Unknown",
  },
  { name: "bloompb", file: "music/bloompb.mp3", duration: "Unknown" },
  {
    name: "OneChanceSmoothBass1",
    file: "music/OneChanceSmoothBass1.mp3",
    duration: "Unknown",
  },
  {
    name: "theGospel2",
    file: "music/theGospel2.mp3",
    duration: "Unknown",
  },
  { name: "cwhisp", file: "music/cwhisp.mp3", duration: "Unknown" },
  {
    name: "PLolaJune18",
    file: "music/PLolaJune18.mp3",
    duration: "Unknown",
  },
  {
    name: "Babyon2020.1.7",
    file: "music/Babyon2020.1.7.mp3",
    duration: "Unknown",
  },
  {
    name: "Ima Swerve",
    file: "music/Ima Swerve.mp3",
    duration: "Unknown",
  },
  { name: "Brawler", file: "music/Brawler.mp3", duration: "Unknown" },
  {
    name: "FlyOnTheWall1.3",
    file: "music/FlyOnTheWall1.3.mp3",
    duration: "Unknown",
  },
  {
    name: "SomeGladMorningFix",
    file: "music/SomeGladMorningFix.aif",
    duration: "Unknown",
  },
  {
    name: "100Ways2020.1.6(1)",
    file: "music/100Ways2020.1.6(1).mp3",
    duration: "Unknown",
  },
  {
    name: "GARTARZjune",
    file: "music/GARTARZjune.mp3",
    duration: "Unknown",
  },
  {
    name: "BabApril18fkeDrum2",
    file: "music/BabApril18fkeDrum2.mp3",
    duration: "Unknown",
  },
  {
    name: "USAJune18",
    file: "music/USAJune18.mp3",
    duration: "Unknown",
  },
  { name: "METAL", file: "music/METAL.mp3", duration: "Unknown" },
  {
    name: "latePreacher",
    file: "music/latePreacher.mp3",
    duration: "Unknown",
  },
  {
    name: "100WAYZ23",
    file: "music/100WAYZ23.mp3",
    duration: "Unknown",
  },
  {
    name: "Pawmp1.10",
    file: "music/Pawmp1.10.mp3",
    duration: "Unknown",
  },
  { name: "JAMMIN", file: "music/JAMMIN.mp3", duration: "Unknown" },
  {
    name: "USA2020.1.4",
    file: "music/USA2020.1.4.mp3",
    duration: "Unknown",
  },
  {
    name: "ScratchMetal",
    file: "music/ScratchMetal.mp3",
    duration: "Unknown",
  },
  { name: "PLolaSax", file: "music/PLolaSax.mp3", duration: "Unknown" },
  { name: "BMB2020e", file: "music/BMB2020e.mp3", duration: "Unknown" },
  {
    name: "AbooATee1",
    file: "music/AbooATee1.mp3",
    duration: "Unknown",
  },
  {
    name: "StolenSong1.5",
    file: "music/StolenSong1.5.mp3",
    duration: "Unknown",
  },
  {
    name: "100WAYZmrk3",
    file: "music/100WAYZmrk3.mp3",
    duration: "Unknown",
  },
  {
    name: "myNameIsDan1",
    file: "music/myNameIsDan1.mp3",
    duration: "Unknown",
  },
];

for (var i = 0; i < listAudio.length; i++) {
  createTrackItem(i, listAudio[i].name, listAudio[i].duration);
}
var indexAudio = 0;

function loadNewTrack(index) {
  var player = document.querySelector("#source-audio");
  player.src = listAudio[index].file;
  document.querySelector(".title").innerHTML = listAudio[index].name;
  this.currentAudio = document.getElementById("myAudio");
  this.currentAudio.load();
  this.toggleAudio();
  this.updateStylePlaylist(this.indexAudio, index);
  this.indexAudio = index;
}

var playListItems = document.querySelectorAll(".playlist-track-ctn");

for (let i = 0; i < playListItems.length; i++) {
  playListItems[i].addEventListener("click", getClickedElement.bind(this));
}

function getClickedElement(event) {
  for (let i = 0; i < playListItems.length; i++) {
    if (playListItems[i] == event.target) {
      var clickedIndex = event.target.getAttribute("data-index");
      if (clickedIndex == this.indexAudio) {
        // alert('Same audio');
        this.toggleAudio();
      } else {
        loadNewTrack(clickedIndex);
      }
    }
  }
}

function createMediaStreamSource() {
  console.log("oh hai");
  navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then(function (stream) {
      var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      var source = audioCtx.createMediaStreamSource(stream);
      // Now you have `source` representing the microphone input.
      // You can connect it to audio nodes or process it as needed.
    })
    .catch(function (err) {
      console.error("Error accessing microphone: ", err);
    });
}

// Function to request microphone permission
function requestMicrophonePermission() {
  navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then(function (stream) {
      // Permission granted, stream can be used or discarded
      stream.getTracks().forEach(function (track) {
        track.stop();
      });
    })
    .catch(function (err) {
      console.error("Error requesting microphone permission: ", err);
    });
}

// Call requestMicrophonePermission when needed, e.g., on user interaction
document.addEventListener("click", function () {
  requestMicrophonePermission();
});

document.querySelector("#source-audio").src = listAudio[indexAudio].file;
document.querySelector(".title").innerHTML = listAudio[indexAudio].name;

var currentAudio = document.getElementById("myAudio");

createMediaStreamSource();

currentAudio.load();

currentAudio.onloadedmetadata = function () {
  document.getElementsByClassName("duration")[0].innerHTML = this.getMinutes(
    this.currentAudio.duration
  );
}.bind(this);

var interval1;

function toggleAudio() {
  if (this.currentAudio.paused) {
    document.querySelector("#icon-play").style.display = "none";
    document.querySelector("#icon-pause").style.display = "block";
    document
      .querySelector("#ptc-" + this.indexAudio)
      .classList.add("active-track");
    this.playToPause(this.indexAudio);
    this.currentAudio.play();
  } else {
    document.querySelector("#icon-play").style.display = "block";
    document.querySelector("#icon-pause").style.display = "none";
    this.pauseToPlay(this.indexAudio);
    this.currentAudio.pause();
  }
}

function pauseAudio() {
  this.currentAudio.pause();
  clearInterval(interval1);
}

var timer = document.getElementsByClassName("timer")[0];

var barProgress = document.getElementById("myBar");

var width = 0;

function onTimeUpdate() {
  var t = this.currentAudio.currentTime;
  timer.innerHTML = this.getMinutes(t);
  this.setBarProgress();
  if (this.currentAudio.ended) {
    document.querySelector("#icon-play").style.display = "block";
    document.querySelector("#icon-pause").style.display = "none";
    this.pauseToPlay(this.indexAudio);
    if (this.indexAudio < listAudio.length - 1) {
      var index = parseInt(this.indexAudio) + 1;
      this.loadNewTrack(index);
    }
  }
}

function setBarProgress() {
  var progress =
    (this.currentAudio.currentTime / this.currentAudio.duration) * 100;
  document.getElementById("myBar").style.width = progress + "%";
}

function getMinutes(t) {
  var min = parseInt(parseInt(t) / 60);
  var sec = parseInt(t % 60);
  if (sec < 10) {
    sec = "0" + sec;
  }
  if (min < 10) {
    min = "0" + min;
  }
  return min + ":" + sec;
}

var progressbar = document.querySelector("#myProgress");
progressbar.addEventListener("click", seek.bind(this));

function seek(event) {
  var percent = event.offsetX / progressbar.offsetWidth;
  this.currentAudio.currentTime = percent * this.currentAudio.duration;
  barProgress.style.width = percent * 100 + "%";
}

function forward() {
  this.currentAudio.currentTime = this.currentAudio.currentTime + 5;
  this.setBarProgress();
}

function rewind() {
  this.currentAudio.currentTime = this.currentAudio.currentTime - 5;
  this.setBarProgress();
}

function next() {
  if (this.indexAudio < listAudio.length - 1) {
    var oldIndex = this.indexAudio;
    this.indexAudio++;
    updateStylePlaylist(oldIndex, this.indexAudio);
    this.loadNewTrack(this.indexAudio);
  }
}

function previous() {
  if (this.indexAudio > 0) {
    var oldIndex = this.indexAudio;
    this.indexAudio--;
    updateStylePlaylist(oldIndex, this.indexAudio);
    this.loadNewTrack(this.indexAudio);
  }
}

function updateStylePlaylist(oldIndex, newIndex) {
  document.querySelector("#ptc-" + oldIndex).classList.remove("active-track");
  this.pauseToPlay(oldIndex);
  document.querySelector("#ptc-" + newIndex).classList.add("active-track");
  this.playToPause(newIndex);
}

function playToPause(index) {
  var ele = document.querySelector("#p-img-" + index);
  ele.classList.remove("fa-play");
  ele.classList.add("fa-pause");
}

function pauseToPlay(index) {
  var ele = document.querySelector("#p-img-" + index);
  ele.classList.remove("fa-pause");
  ele.classList.add("fa-play");
}

function toggleMute() {
  var btnMute = document.querySelector("#toggleMute");
  var volUp = document.querySelector("#icon-vol-up");
  var volMute = document.querySelector("#icon-vol-mute");
  if (this.currentAudio.muted == false) {
    this.currentAudio.muted = true;
    volUp.style.display = "none";
    volMute.style.display = "block";
  } else {
    this.currentAudio.muted = false;
    volMute.style.display = "none";
    volUp.style.display = "block";
  }
}
