const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, 'frontend', 'build');
const targetDir = __dirname;

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach(childItemName => {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

if (fs.existsSync(sourceDir)) {
  console.log('Copying build files from', sourceDir, 'to', targetDir);
  copyRecursiveSync(sourceDir, targetDir);
  console.log('Build files copied successfully!');
} else {
  console.error('Source build directory does not exist:', sourceDir);
  process.exit(1);
}