const fs = require('fs');
const path = require('path');

/**
 * Recursively copy directory contents
 * @param {string} src - Source directory
 * @param {string} dest - Destination directory
 */
function copyDir(src, dest) {
  // Create destination directory if it doesn't exist
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  // Read source directory
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Copy WebViewer files from node_modules to public directory
 */
function copyWebViewer() {
  const nodeModulesPath = path.join(__dirname, '../node_modules/@pdftron/webviewer/public');
  const publicPath = path.join(__dirname, '../public/webviewer');

  console.log('🔄 Copying WebViewer files...');
  console.log(`📂 Source: ${nodeModulesPath}`);
  console.log(`📁 Destination: ${publicPath}`);

  try {
    // Check if source exists
    if (!fs.existsSync(nodeModulesPath)) {
      console.error('❌ Error: WebViewer node_modules not found at:', nodeModulesPath);
      console.error('💡 Make sure @pdftron/webviewer is installed');
      process.exit(1);
    }

    // Remove existing webviewer directory if it exists
    if (fs.existsSync(publicPath)) {
      console.log('🗑️  Removing existing WebViewer files...');
      fs.rmSync(publicPath, { recursive: true, force: true });
    }

    // Copy files
    copyDir(nodeModulesPath, publicPath);
    
    console.log('✅ WebViewer files copied successfully!');
    
    // Log copied directories for verification
    const copiedDirs = fs.readdirSync(publicPath);
    console.log('📋 Copied directories:', copiedDirs.join(', '));
    
  } catch (error) {
    console.error('❌ Error copying WebViewer files:', error.message);
    process.exit(1);
  }
}

// Run the copy function
copyWebViewer(); 