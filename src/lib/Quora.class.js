const puppeteer = require('puppeteer');
const fs = require('fs');

class QuoraExtractor {
  constructor(url) {
    this.url = url;
    this.browser = null;
    this.page = null;
    this.response = null; // Predefine the response here to ensure it's accessible when needed.
  }

  async init() {
    this.browser = await puppeteer.launch({
      headless: "new", 
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    this.page = await this.browser.newPage(); // Ensure the page is created before attaching event listeners.

    this.page.on('response', async (response) => {
      if (response.url().includes('https://id.quora.com/graphql/gql_para_POST?q=CommentableCommentAreaLoaderInnerQuery')) {
        this.response = await response.json(); // Storing the parsed JSON response directly.
      }
    });

    await this.page.setViewport({ width: 1739, height: 1979 });
    
    const cookiesStr = fs.readFileSync('cookie.json', 'utf8');
    const cookies = cookiesStr ? JSON.parse(cookiesStr) : [];
    await this.page.setCookie(...cookies);

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

  async extractReplies() {
    if (this.response) {
      // Use .map() to transform each edge into the desired shape.
      const replies = this.response.data.node.allCommentsConnection.edges.map(edge => {
        const contentObj = JSON.parse(edge.node.contentQtextDocument.legacyJson);
        // Extract text from the content object.
        const extractedText = contentObj.sections.map(section =>
          section.spans.map(span => span.text).join('') 
        ).join('\n');
  
        // Return an object for each reply with profile image URL, given name, and the extracted text.
        return {
          profileImageUrl: edge.node.user.profileImageUrl,
          givenName: edge.node.user.names[0].givenName,
          textReply: extractedText 
        };
      });
  
      // Filter out replies where textReply is empty (or consists only of whitespace).
      return replies.filter(reply => reply.textReply.trim().length > 0);
    }
    return []; 
  }
  async close() {
    await this.browser.close();
  }
}


module.exports = QuoraExtractor;