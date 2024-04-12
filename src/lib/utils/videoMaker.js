const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');
const ProgressBar = require('progress');

const audioFolder = 'audio';
const screenshotFolder = 'screenshot';
const outputFolder = 'output';
const backgroundVideo = 'background.mp4';
const resizedBackground = 'background_resized.mp4';
const backgroundAudio = 'background.mp3';
const filterFile = path.join(outputFolder, 'filter.txt');

// Ensure output directory exists
if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder, { recursive: true });
}

function runExec(command) {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`exec error: ${error}`);
                return reject(error);
            }
            resolve(stdout);
        });
    });
}
async function cleanup(filename) {
    try {
        const files = fs.readdirSync(outputFolder);
        for (const file of files) {
            if (file !== filename+'.mp4') {
                fs.unlinkSync(path.join(outputFolder, file));
                console.log(`Deleted ${file}`);
            }
        }
        console.log('Cleanup completed.');
    } catch (error) {
        console.error('Error during cleanup:', error);
    }
}
async function processVideos(filename) {
    try {
        const contentTypes = ['title', 'post', 'reply1', 'reply2', 'reply3'];
        
        const bar = new ProgressBar(':bar :percent :eta', { total: contentTypes.length + 2,width: 120 });

        // Resize background video
        await runExec(`ffmpeg -y -i "${backgroundVideo}" -vf "scale=608:1080,setsar=1" "${resizedBackground}"`);
        bar.tick();

        if (fs.existsSync(filterFile)) {
            fs.unlinkSync(filterFile);
        }

        for (let contentType of contentTypes) {
            const imageName = `${contentType}.png`;
            const audioName = `${contentType}.mp3`;
            const outputName = `${contentType}_with_bg.mp4`;
            const volumeMultiplier = contentType === 'post' ? 3.5 : 3.5;

            const command = `ffmpeg -y -i "${resizedBackground}" -loop 1 -i "${screenshotFolder}\\${imageName}" -i "${audioFolder}\\${audioName}" -filter_complex "[1:v]scale=(608*0.8):-1[pic];[0:v][pic]overlay=(main_w-overlay_w)/2:(main_h-overlay_h)/2:shortest=1,format=yuv420p[v];[2:a]volume=${volumeMultiplier}[a]" -map "[v]" -map "[a]" -c:v libx264 -c:a aac -b:a 192k -shortest "${outputFolder}\\${outputName}"`;
            await runExec(command);
            fs.appendFileSync(filterFile, `file '${outputName}'\n`);
            bar.tick();
        }
        await runExec(`ffmpeg -y -f concat -safe 0 -i "${filterFile}" -i "${backgroundAudio}" -c:v copy -c:a aac -filter_complex "[1:a]volume=0.3[bg];[0:a][bg]amerge,pan=stereo|c0<c0+c2|c1<c1+c3[a]" -map 0:v -map "[a]" "${outputFolder}\\${filename}.mp4"`);
        bar.tick();
        await cleanup(filename); 
        console.log('Video creation completed.');
    } catch (error) {
        console.error('Error processing videos:', error);
    }
}

module.exports = processVideos;