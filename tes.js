const util = require('util');
const exec = util.promisify(require('child_process').exec);

const backgroundMp4 = "background.mp4";
const backgroundMp3 = "background.mp3";
const audioFiles = ["./audio/title.mp3", "./audio/post.mp3", "./audio/reply1.mp3", "./audio/reply2.mp3", "./audio/reply3.mp3"];
const imageFiles = ["./screenshot/title.png", "./screenshot/post.png", "./screenshot/reply1.png", "./screenshot/reply2.png", "./screenshot/reply3.png"];
const outputVideo = "output.mp4";

// Get the duration of an audio file using ffprobe
async function getAudioDuration(audioPath) {
    const { stdout } = await exec(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`);
    return parseFloat(stdout.trim());
}

// Build the FFmpeg command
// Revised Filter Complex String Construction
async function buildFfmpegCommand(backgroundMp4, backgroundMp3, audioFiles, imageFiles, outputVideo) {
  let inputs = `-i "${backgroundMp4}" -i "${backgroundMp3}" `;
  let filterComplexAudio = `[1:a]volume=0.8[a0];`;
  let filterComplexOverlay = "";
  let overlayInputs = "";
  let start = 0;

  for (let i = 0; i < audioFiles.length; i++) {
    const duration = await getAudioDuration(audioFiles[i]);
    inputs += `-i "${audioFiles[i]}" -i "${imageFiles[i]}" `;
    filterComplexAudio += `[${2 * i + 2}:a]volume=1.0[a${i + 1}];`;

    // Manage overlays correctly
    let base = i === 0 ? `[0:v]` : `[ov${i - 1}]`; // Use previous overlay as base or original video for the first
    filterComplexOverlay += `${base}[${2 * i + 4}:v]overlay=(W-w)/2:(H-h)/2:enable='between(t,${start.toFixed(3)},${start + duration})[ov${i}];`;
    start += duration;
  }

  let amixInputs = Array.from({length: audioFiles.length + 1}, (_, i) => `[a${i}]`).join('');
  let filterComplex = `${filterComplexAudio}${amixInputs}amix=inputs=${audioFiles.length + 1}:dropout_transition=2[a];${filterComplexOverlay}`;
  
  return `ffmpeg -y ${inputs} -filter_complex "${filterComplex}" -map "[ov${audioFiles.length - 1}]" -map "[a]" -c:v libx264 -c:a aac "${outputVideo}"`;
}

// Execute the FFmpeg command
async function executeFfmpegCommand(command) {
    try {
        const { stdout, stderr } = await exec(command);
        console.log('FFmpeg execution successful', stdout);
    } catch (error) {
        console.error('Error executing FFmpeg command', error);
    }
}

// Main function to orchestrate everything
async function processVideo() {
    const ffmpegCommand = await buildFfmpegCommand(backgroundMp4, backgroundMp3, audioFiles, imageFiles, outputVideo);
    console.log('Executing command:', ffmpegCommand);
    await executeFfmpegCommand(ffmpegCommand);
    console.log('Video processing completed successfully.');
}

processVideo();