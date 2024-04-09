const { exec } = require('child_process');

// First, determine the duration of the voice.mp3
let durationCommand = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 voice.mp3`;

exec(durationCommand, (error, stdout, stderr) => {
    if (error) {
        console.error(`exec error: ${error}`);
        return;
    }
    
    let voiceDuration = parseFloat(stdout.trim());
    console.log(`Voice Duration: ${voiceDuration} seconds`);
    
    // Construct and execute the FFmpeg command with the voiceDuration
    let ffmpegCommand = `ffmpeg -y \
    -i background.mp4 \
    -loop 1 -t 3 -i screenshot/title.png \
    -loop 1 -i screenshot/post.png \
    -i background.mp3 \
    -i voice.mp3 \
    -filter_complex \
    "[0:v]scale=1080:1920,setpts=PTS-STARTPTS[bg]; \
    [1:v]scale=1080:-1:force_original_aspect_ratio=decrease[paddedTitle]; \
    [2:v]scale=1080:-1:force_original_aspect_ratio=decrease[paddedScreenshot]; \
    [bg][paddedTitle]overlay=(W-w)/2:(H-h)/2:enable='between(t,0,3)'[withTitle]; \
    [withTitle][paddedScreenshot]overlay=(W-w)/2:(H-h)/2:enable='between(t,3,${3 + voiceDuration})'[videoFinal]; \
    [3:a]volume=0.2,asetpts=PTS-STARTPTS[bga]; \
    [4:a]volume=2.0,adelay=3000|3000,asetpts=PTS-STARTPTS[voicea]; \
    [bga][voicea]amix=inputs=2:duration=first[audioMixed]" \
    -map "[videoFinal]" -map "[audioMixed]" \
    -c:v libx264 -c:a aac -preset fast output.mp4`;
console.log(ffmpegCommand);
    exec(ffmpegCommand, (innerError, stdout, stderr) => {
        if (innerError) {
            console.error(`exec error: ${innerError}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
        console.error(`stderr: ${stderr}`);
        console.log('Video has been created successfully.');
    });
});
