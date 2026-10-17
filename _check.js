const fs = require('fs');
const c = fs.readFileSync('public/js/config_main_1.js', 'utf8');
const html = fs.readFileSync('public/config.html', 'utf8');
const lines = c.split('\n');
let inSave = false;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('async function saveConfig')) inSave = true;
  if (!inSave) continue;
  if (i > 700) break;
  const m = lines[i].match(/getElementById\('([^']+)'\)/g);
  if (m) {
    m.forEach(mm => {
      const id = mm.match(/getElementById\('([^']+)'\)/)[1];
      if (!html.includes('id="' + id + '"')) {
        console.log('MISSING line ' + (i + 1) + ': ' + id);
      }
    });
  }
}
console.log('done');
