const fs = require('fs');
const path = require('path');

const roots = ['.'];
// `.next` must be scanned: on macOS external volumes AppleDouble sidecars can
// be created inside Turbopack's persistence database and make the next build
// fail with "invalid digit found in string". node_modules and .git stay
// excluded because their metadata is not consumed as build input/cache state.
const skippedDirs = new Set(['.git', 'node_modules']);
let removed = 0;

for (const root of roots) {
  walk(path.join(process.cwd(), root));
}

if (removed > 0) {
  console.log(`Removed ${removed} AppleDouble metadata files`);
}

function walk(dir) {
  if (!fs.existsSync(dir)) return;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (skippedDirs.has(entry.name)) continue;
      walk(fullPath);
      continue;
    }

    if (entry.isFile() && entry.name.startsWith('._')) {
      fs.unlinkSync(fullPath);
      removed += 1;
    }
  }
}
