let fs = require('fs');
let _ = require('underscore');

let words = fs.readFileSync('google-books-common-words.txt', {encoding: 'utf8'});
words = words.toLowerCase().split(/\r?\n/);
let frequency_cutoff = 70000;
let all_words = words;
// TODO: only trust words in the google list AND words_alpha.txt? (or hillmanov_dictionary.txt?)
words = words.slice(0, frequency_cutoff);
words.sort();

let input = '';
for (let arg of process.argv)
  if (arg.startsWith('--input='))
    input = fs.readFileSync(arg.replace('--input=', ''), {encoding: 'utf8'});

let width = 5;
let height = 5;
let min_word_length = 3;

// derived from http://pi.math.cornell.edu/~mec/2003-2004/cryptography/subs/frequencies.html
let letter_frequency = {
  e: 0.12019549870270922,
  t: 0.09098588613462202,
  a: 0.08123837786542185,
  o: 0.07681168165087793,
  i: 0.07305420097310522,
  n: 0.06947773761265585,
  s: 0.06280752373795274,
  r: 0.06021294218965129,
  h: 0.05921460425774672,
  d: 0.043191828988003486,
  l: 0.03978541219837304,
  u: 0.02877626808116158,
  c: 0.027114199985738028,
  m: 0.02611586205383345,
  f: 0.02303856765933638,
  y: 0.021135143140815018,
  w: 0.020948640450239437,
  g: 0.020257483420459344,
  p: 0.018189497704371293,
  b: 0.014892788379785303,
  v: 0.011074968596238131,
  k: 0.006895114178044245,
  x: 0.0017278925744502285,
  q: 0.0011245015167057042,
  j: 0.0010312501714179142,
  z: 0.0007021277762845373
}

let two_letter_cube = ['qu', 'in', 'th', 'er', 'he', 'an'];
let results = [];

// array of all possible directions
// as (x, y) pairs
let directions = [
  [0, -1], // up
  [1, -1], // up-right
  [1, 0], // right
  [1, 1], // down-right
  [0, 1], // down
  [-1, 1], // down-left
  [-1, 0], // left
  [-1, -1] // up-left
];

// serve the HTML file
var index_html = fs.readFileSync('index.html');
let server = require('http').createServer(function(req, res) {
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.end(index_html);
});

let io = require('socket.io')(server);

let scores = {};
let handicaps = {}
io.on('connection', function(client) {
  let username = 'anonymous';
  let pts_per_word = 1;
  let guesses = [];
  client.emit('game', rows);
  
  client.on('username', function(str) {
    username = str;
    scores[username] = 0;
  });

  client.on('pts-per-word', function(pts) {
    pts_per_word = pts;
    handicaps[username] = pts;
  });

  client.on('guess', function(guess) {
    console.log('guess: ' + JSON.stringify(guess));
    if (results.includes(guess)) {
      // don't allow the same user to guess the same thing 2x
      if (!guesses.includes(guess)) {
        guesses.push(guess);
        scores[username] += pts_per_word;
        io.sockets.emit('scores', {scores: scores, handicaps: handicaps});
      }
    }
    else {
      let in_words = words.includes(guess);
      let in_all_words = all_words.includes(guess);
      console.log(`Not found in results, in words: ${in_words}, in all words: ${in_all_words}`);
    }
  });
  client.on('disconnect', function() {
    console.log('client disconnected');
  });
});

server.listen(3000);
console.log('listening on http://localhost:3000');


let rows = [];

// parse input into rows
if (input) {
  input = input.split(/\r?\n/);
  for (let line of input) {
    let row = line.split(' ');
    rows.push(row);
  }
}
// randomly populate rows
else {
  for (let y = 0; y < height; y++) {
    let row = [];
    for (let x = 0; x < width; x++)
      row.push(chooseLetter());
    rows.push(row);
  }

  // drop a two-letter combination in one slot
  let row = _.sample(rows);
  let ix = _.sample(_.range(width));
  row[ix] = _.sample(two_letter_cube);
}

// print the rows & columns
console.log('\nBoggle Board:');
for (let row of rows)
  console.log(row.join(' '));
console.log('');

// start word-searching at each x,y position
for (let x = 0; x < width; x++) {
  for (let y = 0; y < height; y++)
    search(x, y, '', []);
}

for (let result of results)
  console.log(result);

function search(x, y, word, word_arr) {
  word += rows[y][x];
  word_arr = word_arr.slice(); // clone
  word_arr.push([x, y]);

  var ix = _.sortedIndex(words, word);

  // if it's a word, add it to the results
  if (ix < words.length && words[ix] == word) {
    if (word.length >= min_word_length)
      if (!results.includes(word)) // avoid duplicates
        results.push(word);
  }

  // if there are words that start with this combo
  // keep drilling down (otherwise, give up)
  if (ix < words.length && words[ix].startsWith(word)) {
    for (let dir of directions) {
      let new_x = x + dir[0];
      let new_y = y + dir[1];
      if (isInBounds(new_x, new_y) && !isUsed(new_x, new_y, word_arr))
        search(new_x, new_y, word, word_arr);
    }
  }
}

function chooseLetter() {
  var rnd = Math.random();
  
  // to pick a letter based on the distributions
  // walk through the list of frequencies adding each frequency to the total
  // until we've reached the random number generated
  // since all the distributions add up to 1, it should always work
  let cumulative_frequency = 0;
  for (var l in letter_frequency) {
    cumulative_frequency += letter_frequency[l];
    if (rnd < cumulative_frequency)
      return l;
  }

  // this should never happen, since the sum of the frequencies is 1 (apparently any roundoff error isn't enough to affect it)
  throw new Error(`cumulative frequency ${cumulative_frequency} never exceeded random number ${rnd}`);
}

function isInBounds(x, y) {
  return x >= 0 && y >= 0 && x < width && y < height;
}

function isUsed(x, y, word_arr) {
  for (let coords of word_arr)
    if (x == coords[0] && y == coords[1])
      return true;
  return false;
}
