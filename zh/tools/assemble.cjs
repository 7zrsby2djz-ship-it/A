// 把 src/ 與 data/ 組成一個 index.html
const fs = require('fs'), path = require('path');
const Z = path.join(__dirname, '..'), R = f => fs.readFileSync(path.join(Z, f), 'utf8');
const chin = JSON.parse(R('data/chin_words.json'));
const ming = JSON.parse(R('data/mingalar_content.json'));
delete ming.readings; // 注音改用 src/readings.gen.js
const js = [
  '/* 授權：單字資料見 CHIN._license；明朗中文題庫；其他為本 App 原創 */',
  'const CHIN=' + JSON.stringify(chin) + ';',
  'const MING=' + JSON.stringify(ming) + ';',
  R('src/readings.gen.js'),
  R('src/itemdiff.gen.js'),
  R('../src/sfx.generated.js'), // 與按鈕與積木共用 Kenney CC0 音效，內嵌後可獨立使用
  ...['talk_core', 'talk_sbux', 'talk_boba', 'talk_cvs', 'talk_bfast', 'talk_mrt', 'talk_school', 'data_ui', 'exam_core', 'exam_listen', 'exam_read', 'app_core', 'app_words', 'app_talk', 'app_practice', 'app_main'].map(f => R('src/' + f + '.js'))
].join('\n');
new Function(js); // 語法檢查
const html = R('src/head.html') + '<style>\n' + R('src/style.css') + '</style>\n' + R('src/shell.html') + '<script>\n' + js.replace(/<\/script/gi, '<\\/script') + '\n</script>\n</body>\n</html>\n';
fs.writeFileSync(path.join(Z, 'index.html'), html);
console.log('index.html', Math.round(html.length / 1024) + ' KB');
