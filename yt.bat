@echo off
setlocal EnableDelayedExpansion

set "audioFolder=audio"
set "screenshotFolder=screenshot"
set "outputFolder=output"
set "backgroundVideo=background.mp4"
set "resizedBackground=background_resized.mp4"
set "backgroundAudio=background.mp3"

if not exist "%outputFolder%" mkdir "%outputFolder%"

ffmpeg -y -i "%backgroundVideo%" -vf "scale=608:1080,setsar=1" "%resizedBackground%"

set "filterFile=%outputFolder%\filter.txt"
if exist "%filterFile%" del "%filterFile%"

for %%A in (title post reply1 reply2 reply3) do (
    set "imageName=%%A.png"
    set "audioName=%%A.mp3"
    set "outputName=%%A_with_bg.mp4"
    
    ffmpeg -y -i "%resizedBackground%" -loop 1 -i "%screenshotFolder%\!imageName!" -i "%audioFolder%\!audioName!" -i "%backgroundAudio%" -filter_complex "[1:v]scale=(608*0.8):-1[pic];[0:v][pic]overlay=(main_w-overlay_w)/2:(main_h-overlay_h)/2:shortest=1,format=yuv420p[v];[3:a]volume=0.4[bg];[2:a][bg]amerge,pan=stereo|c0<c0+c2|c1<c1+c3[a]" -map "[v]" -map "[a]" -c:v libx264 -c:a aac -b:a 192k -shortest "%outputFolder%\!outputName!"
    
    echo file '!outputName!'>>"%filterFile%"
)

ffmpeg -y -f concat -safe 0 -i "%filterFile%" -c:v copy -c:a aac "%outputFolder%\final_video.mp4"

echo Video creation completed.