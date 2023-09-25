import clipboard from 'clipboardy';
import { existsSync, writeFile, mkdirSync } from 'fs';
import readline from 'readline';
import { createCanvas, loadImage } from 'canvas';
import { promisify } from 'util';
import { setOptions } from './setOptions.js';
import { printCLIOptions, delay } from './util.js';
import chalk from 'chalk';
import dotenv from 'dotenv';

dotenv.config();

const pastes = [];
let working = false;

// Keypress listener
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let watch = false;
const processedPrompts = [];

function clipboardListener() {
  setInterval(() => {
    if (!watch) {
      return;
    }

    let current;

    try {
      current = clipboard.readSync();
    } catch (error) {
      console.log(chalk.red('Error reading clipboard. Is it empty? Is there something other than text in there?'));
      return;
    }

    if (pastes.includes(current) || processedPrompts.includes(current)) {
      return;
    } else {
      pastes.push(current);

      if (working) {
        console.log(chalk.yellow(`Already working on a request. Added prompt to the queue. Queue length: ${pastes.length}`));
      }
    }
  }, 2000)
}

clipboardListener();

// If the user presses u make a call to an api to upload the last paste
printCLIOptions(false);
rl.on('line', async (input) => {
  if (input === 'o') {
    await setOptions();
    printCLIOptions();
  } else if (input === 'w') {
    watch = !watch;
    console.log(`${watch ? 'Started' : 'Stopped'} watching clipboard`);
  } else if (input === 's') {
    console.log('Submitting prompt to SD');
    await generate(processedPrompts[processedPrompts.length - 1]);
    printCLIOptions();
  }
});


while (true) {
  if (!watch) {
    await delay(1000);
    continue;
  }


  if (!working && pastes.length > 0) {
    working = true;
    // get the next in the queue
    let currentPrompt = pastes.shift();
    console.log(`Queue length: ${pastes.length}`);

    if (processedPrompts.includes(currentPrompt)) {
      console.log(chalk.yellow(`Prompt already processed. Skipping: ${currentPrompt.substring(0, 50)}`));
      working = false;
      continue;
    }

    console.log(`\n${chalk.green('Generating prompt:' + currentPrompt.substring(0, 50))}`);
    processedPrompts.push(currentPrompt);
    await generate(currentPrompt);
    console.log(chalk.magenta(`Done generating prompt: ${currentPrompt.substring(0, 50)}`));

    working = false;
  }
  await delay(1000);
}

async function generate(prompt) {
  const response = await (fetch(`${process.env.SD_API_BASE_URL}/sdapi/v1/txt2img`, {
    method: 'POST',
    body: JSON.stringify({
      prompt: prompt,
      steps: 20,
      width: process.env.WIDTH,
      height: process.env.HEIGHT,
      sampler_name: process.env.SAMPLER,
      batch_size: process.env.BATCH_SIZE,
    }),
    headers: {
      'Content-Type': 'application/json'
    }
  }));

  const data = await response.json();

  for (const i of data.images) {
    const base64Image = i;
    const imageBuffer = Buffer.from(base64Image, 'base64');
    const image = await loadImage(imageBuffer);

    const pngPayload = {
      image: `data:image/png;base64,${base64Image}`
    };

    const response2 = await fetch(`${process.env.SD_API_BASE_URL}/sdapi/v1/png-info`, {
      method: 'POST',
      body: JSON.stringify(pngPayload),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const pnginfo = response2.json().info;

    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);

    ctx.fillText(`parameters=${pnginfo}`, 10, 10);

    // Get ready to save the generated image
    const outputBuffer = canvas.toBuffer('image/png');

    // create the save directory if it doesn't exist
    if (!existsSync(process.env.SAVE_DIR)) {
      console.log('Creating save directory');
      mkdirSync(process.env.SAVE_DIR);
    }

    // max length of filename is 22 (Super arbitrary. I just don't want to deal with long filenames)
    // add a unique identifier to the filename to avoid collisions
    const uniqueId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const cleanedFilePath = process.env.SAVE_DIR + prompt.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 22) + uniqueId + '.png';

    // write the file to disk
    await promisify(writeFile)(`${cleanedFilePath}`, outputBuffer);
    console.log(`Saved image to ${cleanedFilePath}`)
  }
}

