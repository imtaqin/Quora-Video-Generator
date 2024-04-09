const { execSync } = require('child_process');
const fs = require('fs');

function getDuration(filePath) {
  const command = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`;
  try {
    const result = parseFloat(execSync(command, { encoding: 'utf-8' }).trim());
    return result;
  } catch (error) {
    console.error(`Error fetching duration for ${filePath}:`, error);
    return 0;
  }
}

function getResolution(filePath) {
  const command = `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${filePath}"`;
  try {
    const [width, height] = execSync(command, { encoding: 'utf-8' }).trim().split('x');
    return { width: parseInt(width, 10), height: parseInt(height, 10) };
  } catch (error) {
    console.error(`Error fetching resolution for ${filePath}:`, error);
    return { width: 1920, height: 1080 }; // Defaulting to 1080p
  }
}

const backgroundVideo = 'background.mp4';
const backgroundAudio = 'background.mp3';
const outputVideo = 'output.mp4';

// Assuming directories and naming as per your setup
const audioFiles = ['./audio/title.mp3', './audio/post.mp3', './audio/reply1.mp3', './audio/reply2.mp3', './audio/reply3.mp3'];
const imageFiles = ['./screenshot/title.png', './screenshot/post.png', './screenshot/reply1.png', './screenshot/reply2.png', './screenshot/reply3.png'];

const resolution = getResolution(backgroundVideo);
const scaledWidth = Math.floor(resolution.width * 0.9);
const scaledHeight = Math.floor(resolution.height * 0.9);

let ffmpegInputs = `-y -i "${backgroundVideo}" -i "${backgroundAudio}" `;
let filterComplex = '';
let audioMixInstructions = '[1:a]volume=0.8[a0]'; // Consider the first audio input as the background music after volume adjustment

// Loop over the audio and image files to construct input paths, scaling, and overlay instructions
audioFiles.forEach((file, index) => {
    const imageFile = imageFiles[index];
    const duration = getDuration(file);
    const audioIndex = (index + 1) * 2;
    const imageIndex = audioIndex + 1;
    
    ffmpegInputs += `-i "${file}" -i "${imageFile}" `;
    filterComplex += `[${imageIndex}:v]scale=${scaledWidth}:${scaledHeight}[scaled${index}];`;
    filterComplex += `[0:v][scaled${index}]overlay=(W-w)/2:(H-h)/2:enable='between(t,0,${duration})'[video${index}];`;
    audioMixInstructions += `;[${audioIndex}:a]volume=1.0[a${index+1}]`;
});

// Constructing the amix component by including all audio streams.
audioMixInstructions += `;[a0]`;
for (let i = 1; i <= audioFiles.length; i++) {
    audioMixInstructions += `[a${i}]`;
}
audioMixInstructions += `amix=inputs=${audioFiles.length + 1}[audio]`;

// Close the video chain to present the last overlay output
filterComplex += audioMixInstructions;

const mapping = `-map "[video${audioFiles.length - 1}]" -map "[audio]" -c:v libx264 -c:a aac "${outputVideo}"`;

const ffmpegCommand = `ffmpeg ${ffmpegInputs} -filter_complex "${filterComplex}" ${mapping}`;

try {
  execSync(ffmpegCommand, { stdio: 'inherit' });
  console.log('Video processing completed successfully.');
} catch (error) {
  console.error('Failed to execute FFmpeg command:', error);
}