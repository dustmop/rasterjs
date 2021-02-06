const PORT = process.env['PORT'] || 4600;

const fs      = require('fs');
const express = require('express');
const app     = express();
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.use(express.static('public'));

function read_data_file(filepath) {
  let content = fs.readFileSync(filepath);
  return JSON.parse(content)
}

function parse_script_title(filepath) {
  let content = fs.readFileSync(filepath).toString();
  let regex = /setTitle\(['"](.*)['"]\)/;
  let result = content.match(regex);
  if (result) {
    return result[1];
  }
}

function get_scripts() {
  let result = [];
  let ents = fs.readdirSync(".");
  for (let k = 0; k < ents.length; k++) {
    let e = ents[k];
    if (fs.existsSync(e) && e.endsWith('.js')) {
      if (e == 'qgfx.js') { continue; }
      let name = parse_script_title(e);
      if (!name) {
        name = e.substring(0, e.length-3);
      }
      result.push({
        link: '/run/' + e,
        name: name,
      });
    }
  }
  return result;
}

app.get('/', function(req, res) {
  if (req.url == '/') {
    let ss = get_scripts();
    res.render('pages/index', {scripts: ss});
    return;
  }
  res.sendStatus(404);
});

app.get('/favicon.ico', function(req, res) {
  res.send('');
});

app.get('/main.js', function(req, res) {
  res.setHeader('Content-Type', 'text/javascript');
  let distfile = __dirname + '/dist/main.js';
  res.sendFile(distfile);
});

app.get('/run/:file', function(req, res) {
  let file = req.params.file;
  let script_code = fs.readFileSync(file).toString();
  res.render('pages/render', {script_code: script_code});
});

app.listen(PORT, function() {
  console.log('Running at localhost:' + PORT);
});
