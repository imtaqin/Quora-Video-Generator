const puppeteer = require('puppeteer');
const fs = require('fs');

class QuoraExtractor {
  constructor(url) {
    this.url = url;
    this.browser = null;
    this.page = null;
  }

  async init() {
    this.browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1739, height: 1979 });
    await this.page.setCookie(...JSON.parse(fs.readFileSync("cookie.json", "utf8")));
    await this.page.goto(this.url, { waitUntil: 'networkidle0' });
  }

  async extractTitle() {
    await this.page.waitForSelector('#mainContent > div > div.q-box.qu-borderAll.qu-borderRadius--small.qu-borderColor--raised.qu-boxShadow--small.qu-bg--raised > div.q-box.qu-pt--medium.qu-px--medium.qu-pb--tiny');
    const titleElement = await this.page.$('#mainContent > div > div.q-box.qu-borderAll.qu-borderRadius--small.qu-borderColor--raised.qu-boxShadow--small.qu-bg--raised > div.q-box.qu-pt--medium.qu-px--medium.qu-pb--tiny > div.q-box.qu-mb--medium.qu-mt--small > div > div');
    const titleBox = await titleElement.boundingBox();
    await this.page.screenshot({
      path: `screenshot/title.png`,
      clip: {
        x: titleBox.x,
        y: titleBox.y,
        width: Math.min(titleBox.width, this.page.viewport().width),
        height: Math.min(titleBox.height, this.page.viewport().height),
      }
    });
    return this.page.evaluate(element => element.innerText.trim(), titleElement);
  }

  async extractPostContent() {
    const postSelector = '#mainContent > div > div.q-box.qu-borderAll.qu-borderRadius--small.qu-borderColor--raised.qu-boxShadow--small.qu-bg--raised > div.q-box.qu-pt--medium.qu-px--medium.qu-pb--tiny > div:nth-child(3)';
    const post = await this.page.$(postSelector);
    const box = await post.boundingBox();
    await this.page.screenshot({
      path: 'screenshot/post.png',
      clip: { x: box.x, y: box.y, width: box.width, height: box.height }
    });
    return this.page.evaluate((selector) => {
      const element = document.querySelector(selector);
      return element ? element.innerText.trim() : '';
    }, postSelector);
  }

  async extractAndScreenshotReplies() {
    const screenshotSelector = 'div.q-box.qu-pt--small.qu-bg--raised div.q-text.qu-dynamicFontSize--regular';
 
    const textSelector = 'div.q-box.qu-pt--small.qu-bg--raised div.q-text.qu-dynamicFontSize--regular p';
    
    const replyElements = await this.page.$$(screenshotSelector);
    let screenshots = [];
    for (let i = 0; i < 3 && i < replyElements.length; i++) {
      const box = await replyElements[i].boundingBox();
      if (box) {
        await this.page.screenshot({
          path: `screenshot/reply${i + 1}.png`,
          clip: {
            x: box.x,
            y: box.y,
            width: Math.min(box.width, this.page.viewport().width),
            height: Math.min(box.height, this.page.viewport().height),
          }
        });
        screenshots.push(`succes screenshot/reply ${i + 1}.png`);
      } else {
        screenshots.push(`Failed to take screenshot of reply ${i + 1}.`);
      }
    }

    const repliesText = await this.page.evaluate((selector) => {
      const elements = Array.from(document.querySelectorAll(selector));
      return elements.map(element => element.innerText.trim());
    }, textSelector);

    return { repliesText: repliesText.slice(0, 3), screenshots };
  }

  async close() {
    await this.browser.close();
  }
}


module.exports = QuoraExtractor;