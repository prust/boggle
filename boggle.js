const fs = require('fs');
const _ = require('underscore');

let words = fs.readFileSync('google-books-common-words.txt', {encoding: 'utf8'});
words = words.toLowerCase().split(/\r?\n/);
words.sort();

let input = '';
for (let arg of process.argv)
  if (arg.startsWith('--input='))
    input = fs.readFileSync(arg.replace('--input=', ''), {encoding: 'utf8'});

const width = 4;
const height = 4;
const min_word_length = 3;
const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
const results = [];

// array of all possible directions
// as (x, y) pairs
const directions = [
  [0, -1], // up
  [1, -1], // up-right
  [1, 0], // right
  [1, 1], // down-right
  [0, 1], // down
  [-1, 1], // down-left
  [-1, 0], // left
  [-1, -1] // up-left
];

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
      row.push(_.sample(letters));
    rows.push(row);
  }
}

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
      let new_y = x + dir[1];
      if (isInBounds(new_x, new_y) && !isUsed(new_x, new_y, word_arr))
        search(new_x, new_y, word, word_arr);
    }
  }
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
