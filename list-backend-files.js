const fs = require('fs');
const path = require('path');

// Function to list all files in a directory recursively
function listFilesRecursively(dir, allFiles = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    
    if (fs.statSync(filePath).isDirectory()) {
      // Recursively list files in subdirectory
      allFiles = listFilesRecursively(filePath, allFiles);
    } else {
      // Add file to the list
      allFiles.push(filePath);
    }
  });
  
  return allFiles;
}

// List all files in the backend directory
try {
  const backendFiles = listFilesRecursively('./backend');
  console.log('Backend files:');
  backendFiles.forEach(file => console.log(file));
} catch (error) {
  console.error('Error listing backend files:', error);
}
