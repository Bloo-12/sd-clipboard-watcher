import inquirer from 'inquirer';
import dotenv from 'dotenv';
dotenv.config();

export async function setOptions() {
  const modelFetch = await fetch(process.env.SD_GET_MODELS_URL, {
    "method": "GET",
    "headers": {
      "accept": "application/json"
    }
  });
  const body = await modelFetch.json();

  const modelChoices = body.map(m => {
    return { name: m.title, value: m.hash };
  });

  modelChoices.push(new inquirer.Separator());

  const selectedModel = await inquirer.prompt({
    type: 'list',
    name: 'hash',
    value: 'hash',
    message: 'Select a model',
    choices: modelChoices
  });


  const payload = {
    "sd_model_checkpoint": `${selectedModel.hash}`,
  }

  const modelSetRequest = await fetch(process.env.SD_SET_OPTIONS_URL, {
    "method": "POST",
    "headers": {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    "body": JSON.stringify(payload)
  })

  console.log('Loading model...')
  await modelSetRequest.json();
  console.log(`Model Loaded!`);
}