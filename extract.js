const fs = require('fs');
const readline = require('readline');

async function extract() {
  const fileStream = fs.createReadStream('C:\\Users\\asus\\.gemini\\antigravity-ide\\brain\\795fe46c-ff5c-4121-8571-2725dd46109d\\.system_generated\\logs\\transcript.jsonl');

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    try {
      const parsed = JSON.parse(line);
      if (parsed.step_index === 1019) {
        fs.writeFileSync('extracted_html.txt', parsed.content);
        console.log('Extracted successfully to extracted_html.txt');
        return;
      }
    } catch (e) {}
  }
}

extract();
