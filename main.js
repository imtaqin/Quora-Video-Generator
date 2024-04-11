const fs = require("fs");
const path = require("path");
const inquirer = require('enquirer');
const { config, createAudioFromText } = require('tiktok-tts');
const { OpenAI } = require("openai");
const QuoraExtractor = require("./src/lib/Quora.class");
require('dotenv').config();
config(process.env.TIKTOK_SESSION_ID);
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
inquirer
  .prompt([
    {
      type: "input",
      name: "quoraURL",
      message: "Please enter the Quora URL you would like to extract content from:",
    },
  ])
  .then(async (answers) => {
  

    async function saveAudioFromOpenAITTS(text, filePath) {
      const mp3 = await openai.audio.speech.create({
        model: "tts-1-hd",
        voice: "nova",
        input: text,
      });

      const buffer = Buffer.from(await mp3.arrayBuffer());
      await fs.promises.writeFile(filePath, buffer);
      console.log(`${filePath} saved with OpenAI TTS.`);
    }
    function removeEmojis(text) {
      const emojiRegex = /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g;
      return text.replace(emojiRegex, '');
    }
    async function saveTextAsSpeechUsingTikTok(text, filePath) {
      await createAudioFromText(text, filePath, 'id_001');
      console.log(`${filePath} saved with TikTok TTS.`);
    }

    async function saveContentAsAudio(title, postContent, repliesText) {
      const audioFolder = path.resolve(__dirname, "./audio");
      if (!fs.existsSync(audioFolder)) {
        fs.mkdirSync(audioFolder, { recursive: true });
      }
      
      const sanitizedTitle = removeEmojis(title);
      await saveTextAsSpeechUsingTikTok(sanitizedTitle, path.join(audioFolder, "title"));
      
      for (let i = 0; i < repliesText.length; i++) {
        const sanitizedReply = removeEmojis(repliesText[i]);
        await saveTextAsSpeechUsingTikTok(sanitizedReply, path.join(audioFolder, `reply${i + 1}`));
      }

      const sanitizedPostContent = removeEmojis(postContent);
      await saveAudioFromOpenAITTS(sanitizedPostContent, path.join(audioFolder, "post.mp3"));
    }

    const extractor = new QuoraExtractor(answers.quoraURL);
    await extractor.init();
    const title = await extractor.extractTitle();
    const postContent = await extractor.extractPostContent();
    const { repliesText } = await extractor.extractAndScreenshotReplies();
    await extractor.close();

    console.log({ title, postContent, repliesText });

    await saveContentAsAudio(title, postContent, repliesText);

    const { exec } = require("child_process");
    exec("yt.bat", (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return;
      }
      if (stderr) {
        console.error(`stderr: ${stderr}`);
        return;
      }
      console.log(`stdout: ${stdout}`);
    });
  });