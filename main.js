const fs = require("fs");
const path = require("path");
const inquirer = require('enquirer');
const { config, createAudioFromText } = require('tiktok-tts');
const { OpenAI } = require("openai");
const QuoraExtractor = require("./src/lib/Quora.class");
const {info,error} = require("./src/lib/logger");
const processVideos = require("./src/lib/utils/videoMaker");
const termkit = require("terminal-kit");
const term = termkit.terminal;
const Box = require("cli-box");
const generateImages = require("./src/lib/utils/genImages");
require('dotenv').config();
var b4 = Box("70x5", {
  text: "Quora Video Generator \n Author : Abdul Muttaqin",
  stretch: true,
  autoEOL: true,
  vAlign: "center",
  hAlign: "center",
});
console.log(b4.toString());


// ==================== 
let rout;
config(process.env.TIKTOK_SESSION_ID);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

inquirer.prompt([{
  type: "input",
  name: "quoraURL",
  message: "Silakan masukkan URL Quora yang ingin Anda ekstrak kontennya:",
}]).then(async (answers) => {
  term.color("yellow", "Processing the request \n");
  async function saveAudioFromOpenAITTS(text, filePath) {
    try {
      const mp3 = await openai.audio.speech.create({
        model: "tts-1-hd",
        voice: "nova",
        input: text,
      });

      const buffer = Buffer.from(await mp3.arrayBuffer());
      await fs.promises.writeFile(filePath, buffer);
      info(`File ${filePath} disimpan dengan TTS OpenAI.`);
    } catch (err) {
      error(`Gagal menyimpan audio dengan OpenAI TTS: ${err}`);
    }
  }

  function removeEmojis(text) {
    const emojiRegex = /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g;
    return text.replace(emojiRegex, '');
  }

  async function saveTextAsSpeechUsingTikTok(text, filePath) {
    try {
      await createAudioFromText(text, filePath, 'id_001');
      info(`File ${filePath} disimpan dengan TTS TikTok.`);
    } catch (err) {
      error(`Gagal menyimpan audio dengan TTS TikTok: ${err}`);
    }
  }

  async function saveContentAsAudio(title, postContent, repliesText) {
    const audioFolder = path.resolve(__dirname, "./audio");
    if (!fs.existsSync(audioFolder)) {
      fs.mkdirSync(audioFolder, { recursive: true });
    }

    const sanitizedTitle = removeEmojis(title);
    await saveTextAsSpeechUsingTikTok(sanitizedTitle, path.join(audioFolder, "title"));

    for (let i = 0; i < 3; i++) {
      const sanitizedReply = removeEmojis(repliesText[i].textReply);
      await saveAudioFromOpenAITTS(sanitizedReply, path.join(audioFolder, `reply${i + 1}.mp3`));
    }

    const sanitizedPostContent = removeEmojis(postContent);
    await saveAudioFromOpenAITTS(sanitizedPostContent, path.join(audioFolder, "post.mp3"));
  }

  const extractor = new QuoraExtractor(answers.quoraURL);
  await extractor.init();
  const title = await extractor.extractTitle();
  const postContent = await extractor.extractPostContent();
  const replies = await extractor.extractReplies();
  rout = [["Given Name", "Text Reply"]]; // Define table headers

  // Map over the replies to create a new array of formatted strings for table display
  const formattedReplies = replies.map(reply => {
    return [                  // Assuming you want to show the URL
      reply.givenName,                          // The user's given name
      reply.textReply.slice(0, 20) + "..."      // A snippet of the textReply to avoid overly wide columns
    ];
  });
  
  rout = rout.concat(formattedReplies);
  
  term.table(rout, {
    hasBorder: true,
    contentHasMarkup: true,
    borderChars: 'lightRounded',
    borderAttr: { color: "blue" },
    textAttr: { bgColor: "default" },
    firstRowTextAttr: { bgColor: "RED" },
    width: 60,
    fit: true,
  });
  await generateImages(replies);
  const filename = title.replace(/\s/g, '_').replace(/[^a-zA-Z0-9]/g, '') // replace unicode characters
  await extractor.close();
  info(`Judul: ${title}`);

  await saveContentAsAudio(title, postContent, replies);

  await processVideos(filename)
});