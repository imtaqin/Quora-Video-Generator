const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');

// Paths to folders and files
const audioFolder = './audio';
const screenshotFolder = './screenshot';
const backgroundVideoPath = './background.mp4';
const backgroundAudioPath = './background.mp3';
const outputPath = './outputVideo.mp4';

// Array to hold audio and image files in order
const files = [
    {img: 'title.png', audio: 'title.mp3'},
    {img: 'post.png', audio: 'post.mp3'},
    {img: 'reply1.png', audio: 'reply1.mp3'},
    {img: 'reply2.png', audio: 'reply2.mp3'},
    {img: 'reply3.png', audio: 'reply3.mp3'}
];

// Create a temporary folder for intermediate steps
const tempFolder = './temp';
if (!fs.existsSync(tempFolder)) {
    fs.mkdirSync(tempFolder);
}

const processFiles = async () => {
    let inputFiles = '';
    for (const file of files) {
        const imgPath = path.join(screenshotFolder, file.img);
        const audioPath = path.join(audioFolder, file.audio);
        const outputVideo = path.join(tempFolder, `${path.basename(file.img, '.png')}.mp4`);

        await new Promise((resolve, reject) => {
            ffmpeg()
                .input(imgPath)
                .loop()
                .input(audioPath)
                .audioFilters([
                    {filter: 'volume', options: '0.4'}
                ])
                .addOption('-shortest')
                .addOption('-r', '30')
                .videoCodec('libx264')
                .size('90%')
                .save(outputVideo)
                .on('end', () => {
                    inputFiles += `file '${outputVideo}'\n`;
                    resolve();
                })
                .on('error', (err) => {
                    console.log('An error occurred: ' + err.message);
                    reject(err);
                });
        });
    }

    const listPath = path.join(tempFolder, 'list.txt');
    fs.writeFileSync(listPath, inputFiles);

    // Combine all videos into one
    await new Promise((resolve, reject) => {
        ffmpeg()
            .input(listPath)
            .inputFormat('concat')
            .input(backgroundAudioPath)
            .inputFPS(30)
            .audioFilters([
                {filter: 'volume', options: '0.4'}
            ])
            .videoCodec('libx264')
            .audioCodec('aac')
            .outputOptions('-c:v libx264')
            .outputOptions('-vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2"')
            .mergeToFile(outputPath)
            .on('end', function() {
                console.log('Merging finished !');
                resolve();
            })
            .on('error', function(err) {
                reject(err);
            });
    });

    console.log('Video creation completed.');
};

processFiles().catch((error) => {
    console.error('Error processing files:', error);
});