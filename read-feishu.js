
const { readDocument } = require('/root/.openclaw/workspace/skills/feishu-doc/index.js');

const token = 'KRBQwnh01ivtMikuuGDcsAgLnYe';

readDocument(token).then(result => {
  console.log(JSON.stringify(result, null, 2));
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
