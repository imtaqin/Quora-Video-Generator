const { exec,spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const backgroundVideoPath = './background.mp4';
const backgroundAudioPath = './background.mp3';
const outputVideoPath = './outputVideo.mp4';
const audioFolder = path.join(__dirname, 'audio');
const imageFolder = path.join(__dirname, 'screenshot');
const tempFolder = path.join(__dirname, 'temp');
// Ensure temp directory exists
if (!fs.existsSync(tempFolder)) {
  fs.mkdirSync(tempFolder);
}

// Files to process
const files = ['title', 'post', 'reply1', 'reply2', 'reply3'];

const createVideoClip = (imageName, audioName, index) => {
  return new Promise((resolve, reject) => {
    const imagePath = path.join(imageFolder, `${imageName}.png`);
    const audioPath = path.join(audioFolder, `${audioName}.mp3`);
    const outputClipPath = path.join(tempFolder, `clip${index}.mp4`);

    const args = [
      '-y',
      '-loop', '1',
      '-i', imagePath,
      '-i', audioPath,
      '-c:v', 'libx264',
      '-tune', 'stillimage',
      '-c:a', 'aac',
      '-strict', 'experimental',
      '-b:a', '192k',
      '-pix_fmt', 'yuv420p',
      '-shortest',
      // Update scale and pad filter here
      '-vf', `scale=iw*0.8:ih*0.8,pad=ceil(iw/2)*2:ceil(ih/2)*2:(ow-iw)/2:(oh-ih)/2:color=black`,

      outputClipPath
    ];

    const ffmpeg = spawn('ffmpeg', args);


    ffmpeg.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`);
    });

    ffmpeg.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve(outputClipPath);
      } else {
        reject(new Error(`ffmpeg exited with code ${code}`));
      }
    });
  });
};

// Function to concatenate video clips
const concatenateClips = (clipPaths) => {
  const fileListPath = path.join(tempFolder, 'fileList.txt');
  const fileContent = clipPaths.map(filePath => `file '${filePath}'`).join('\n');
  fs.writeFileSync(fileListPath, fileContent);

  return new Promise((resolve, reject) => {
    const command = `ffmpeg -y -f concat -safe 0 -i "${fileListPath}" -c copy "${path.join(tempFolder, 'concatenated.mp4')}"`;

    exec(command, (error) => {
      if (error) {
        console.error(`Error during concatenation: ${error}`);
        reject(error);
      } else {
        resolve(path.join(tempFolder, 'concatenated.mp4'));
      }
    });
  });
};


// Main function to generate the video
async function generateVideo() {
  try {
    let clipPaths = [];

    // Create video clips for each image-audio pair
    for (let i = 0; i < files.length; i++) {
      const clipPath = await createVideoClip(files[i], files[i], i);
      clipPaths.push(clipPath);
    }

    // Concatenate all clips
    const concatenatedClipPath = await concatenateClips(clipPaths);

    // Combine with background
    const finalCommand = `ffmpeg -y -i "${backgroundVideoPath}" -i "${concatenatedClipPath}" -i "${backgroundAudioPath}" -filter_complex "[1:v]scale=iw*0.8:ih*0.8:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black[ovrl]; [0:v][ovrl]overlay=shortest=1[video]; [2:a][1:a]amix=inputs=2:duration=shortest[audio]; [2:a][1:a]amix=inputs=2:duration=shortest[audio]" -map "[video]" -map "[audio]" -c:v libx264 -crf 23 -preset veryfast "${outputVideoPath}"`;

    exec(finalCommand, (error) => {
      if (error) {
        console.error(`Error during final combining: ${error}`);
      } else {
        console.log(`Video generated: ${outputVideoPath}`);
      }
    });
  } catch (error) {
    console.error(`Error generating video: ${error}`);
  }
}

// Run the main function
generateVideo();