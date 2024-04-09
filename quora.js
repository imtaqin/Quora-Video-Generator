const fs = require("fs");
const path = require("path");
const { config, createAudioFromText } = require('tiktok-tts');
const { OpenAI } = require("openai");
const QuoraExtractor = require("./src/lib/Quora.class");

config('3b4be950139a19b375148d26dd3df1b6');
const openai = new OpenAI({
    apiKey: "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"
});

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

async function saveTextAsSpeechUsingTikTok(text, filePath) {
    await createAudioFromText(text, filePath, 'id_001'); 
    console.log(`${filePath} saved with TikTok TTS.`);
}

async function saveContentAsAudio(title, postContent, repliesText) {
    const audioFolder = path.resolve(__dirname, "./audio");
    if (!fs.existsSync(audioFolder)) {
        fs.mkdirSync(audioFolder, { recursive: true });
    }
    await saveTextAsSpeechUsingTikTok(title, path.join(audioFolder, "title"));
    for (let i = 0; i < repliesText.length; i++) {
        await saveTextAsSpeechUsingTikTok(repliesText[i], path.join(audioFolder, `reply${i + 1}`));
    }

    await saveAudioFromOpenAITTS(postContent, path.join(audioFolder, "post.mp3"));
}

(async () => {
    const extractor = new QuoraExtractor('https://id.quora.com/Apa-sisi-negatif-Nabi-Muhammad-SAW/answer/Agus-Joko-5?ch=10&oid=1477743708601115&share=c3d03134&srid=zWgiC&target_type=answer');
    await extractor.init();
    const title = await extractor.extractTitle();
    const postContent = await extractor.extractPostContent();
    const { repliesText } = await extractor.extractAndScreenshotReplies();
    await extractor.close();

    console.log({ title, postContent, repliesText });

    await saveContentAsAudio(title, postContent, repliesText);
})();
