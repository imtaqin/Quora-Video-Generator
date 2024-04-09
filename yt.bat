@echo off
setlocal EnableDelayedExpansion

:: Set paths to relevant folders
set "audioFolder=audio"
set "screenshotFolder=screenshot"
set "outputFolder=output"
set "backgroundVideo=background.mp4"
set "backgroundAudio=background.mp3"
set "resizedBackground=background_resized.mp4"

if not exist "%outputFolder%" mkdir "%outputFolder%"

:: Resize background video to YouTube's short video resolution - 1080x1920
ffmpeg -y -i "%backgroundVideo%" -vf "scale=608:1080,setsar=1" "%resizedBackground%"

:: Combine background audio to fit the duration of all the images and their respective audios
:: First, calculate total audio duration required
set /A totalDuration=0
for %%A in ("%audioFolder%\*.mp3") do (
    for /f "tokens=2 delims==" %%i in ('ffmpeg -y -i "%%A" ^| findstr "Duration"') do set "duration=%%i"
    call :ConvertDurationToSeconds durationInSeconds !duration!
    set /A totalDuration+=!durationInSeconds!
)

:: Adjust background audio to fit total duration
:: Background music duration in seconds (trimmed if necessary)
set /A bgMusicDuration=totalDuration
:: Repeat background music if total audio duration is longer than background music length (105 seconds for 1:45)
if !bgMusicDuration! gtr 105 set /A bgMusicDuration=105
echo About to process background audio with ffmpeg -y.
if exist "%outputFolder%\background_audio.mp3" (
    echo Background audio file exists.
) else (
    echo Background audio file does not exist. Check previous steps.
)
ffmpeg -y -stream_loop -1 -i "%backgroundAudio%" -filter:a "volume=0.4" -t %bgMusicDuration% -y "%outputFolder%\background_audio_adjusted.mp3"
:: Create videos for each image + audio pair, then concatenate
set "filterFile=%outputFolder%\filter.txt"
if exist "%filterFile%" del "%filterFile%"

for %%A in (title post reply1 reply2 reply3) do (
    set "imageName=%%A.png"
    set "audioName=%%A.mp3"
    set "outputName=%%A.mp4"
    
    :: Updated scale calculation for 90% of 608x1080 -> Multiply by 0.9
    ffmpeg -y -loop 1 -i "%screenshotFolder%\!imageName!" -i "%audioFolder%\!audioName!" -tune stillimage -shortest -vf "scale=(608*0.9):-1,pad=608:1080:(ow-iw)/2:(oh-ih)/2:color=black" -c:v libx264 -pix_fmt yuv420p -c:a copy "%outputFolder%\!outputName!"
    
    echo file '!outputName!'>>"%filterFile%"
)
:: Concatenate all created video clips with background video and audio
ffmpeg -y -f concat -safe 0 -i "%filterFile%" -c copy "%outputFolder%\temp_video.mp4"
ffmpeg -y -i "%resizedBackground%" -i "%outputFolder%\temp_video.mp4" -filter_complex "[1:v]scale=608:1080:force_original_aspect_ratio=decrease,pad=608:1080:(ow-iw)/2:(oh-ih)/2[v];[0:v][v]overlay=shortest=1" -c:v libx264 "%outputFolder%\final_video_noaudio.mp4"
ffmpeg -y -i "%outputFolder%\final_video_noaudio.mp4"  -shortest -c:v copy -c:a aac "%outputFolder%\final_video.mp4"
echo Video creation completed.
goto :eof

:ConvertDurationToSeconds
set "timeStr=%~1"
set "timeStr=%timeStr:0=%"
set "timeStr=%timeStr: =%"
for /f "tokens=1,2,3 delims=:.," %%a in ("%timeStr%") do (
    set /A h=%%a*3600, m=%%b*60, s=%%c, result=h+m+s
)
set "%~1=%result%"
goto :eof