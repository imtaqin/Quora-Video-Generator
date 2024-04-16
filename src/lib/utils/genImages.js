const { createCanvas, loadImage, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');

// Optionally, use a custom font
// registerFont('path/to/your/font.ttf', { family: 'YourFontFamily' });



const fetchData = async () => {
    const dataJson = JSON.parse(fs.readFileSync('tes.json', 'utf8'));
    return extractReplies(dataJson.data.node.allCommentsConnection);
}

const calculateTextHeight = (context, text, maxWidth, lineHeight) => {
    const words = text.split(' ');
    let totalHeight = 0;
    let line = '';

    for (let word of words) {
        const testLine = line + word + ' ';
        const { width: testWidth } = context.measureText(testLine);

        if (testWidth > maxWidth && line !== '') {
            line = word + ' ';
            totalHeight += lineHeight;
        } else {
            line = testLine;
        }
    }
    totalHeight += lineHeight; // Add the last line's height

    return totalHeight;
};

const generateImages = async (replies) => {
    const canvasWidth = 800;
    let imageIndex = 0;

    for (let i = 0; i < replies.length; i++) {
        const reply = replies[i];
        if (!reply.textReply.trim()) continue;

        // Temporary canvas to calculate text height
        const tempCanvas = createCanvas(canvasWidth, 200);
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.font = '16px Arial';
        const textHeight = calculateTextHeight(tempCtx, reply.textReply, canvasWidth - 240, 24);
        const canvasHeight = 100 + textHeight; // Additional space for the profile image and some padding

        const canvas = createCanvas(canvasWidth, canvasHeight);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#f0f0f0';
        roundRect(ctx, 0, 0, canvasWidth, canvasHeight, 20, true, false);

        // Load and draw profile image
        const profilePic = await loadImage(reply.profileImageUrl);
        const profilePicX = 20, profilePicY = 20, profilePicRadius = 40;

        ctx.save();
        ctx.beginPath();
        ctx.arc(profilePicX + profilePicRadius, profilePicY + profilePicRadius, profilePicRadius, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(profilePic, profilePicX, profilePicY, profilePicRadius * 2, profilePicRadius * 2);
        ctx.restore();

        // Display Name
        ctx.font = 'bold 20px Arial';
        ctx.fillStyle = '#000';
        ctx.fillText(reply.givenName, 190, 45);

        // Text Reply
        ctx.font = '16px Arial';
        const textXPos = 190, textYPos = 80, textWidth = canvasWidth - textXPos - 15;
        wrapText(ctx, reply.textReply, textXPos, textYPos, textWidth, 24);

        // Save imaga only 3 images
        if (imageIndex === 3) break;
        fs.writeFileSync(`screenshot/reply${imageIndex + 1}.png`, canvas.toBuffer());
        imageIndex++;
    }
};

function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
    if (typeof stroke === 'undefined') {
        stroke = true;
    }
    if (typeof radius === 'undefined') {
        radius = 5;
    }
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) {
        ctx.fill();
    }
    if (stroke) {
        ctx.stroke();
    }
}

function wrapText(context, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let maxY = y;

    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = context.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
            context.fillText(line, x, maxY);
            line = words[n] + ' ';
            maxY += lineHeight;
        } else {
            line = testLine;
        }
    }
    context.fillText(line, x, maxY);
    return maxY + lineHeight; // Return the updated height based on the text
}

module.exports = generateImages;