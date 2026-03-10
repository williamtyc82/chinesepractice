const fs = require('fs');
['src/pages/admin.js', 'src/pages/learning.js', 'src/pages/profile.js'].forEach(f => {
  let text = fs.readFileSync(f, 'utf8');
  text = text.replace(/\\`/g, '`').replace(/\\\${/g, '${');
  fs.writeFileSync(f, text);
});
console.log('Fixed files');
