const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, './src');

try {
  const files = fs.readdirSync(directoryPath);
  console.log('Files in src directory:');
  console.log(files);
} catch (err) {
  console.error('Error reading directory:', err);
}
