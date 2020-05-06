import random
import bisect

width = 5
height = 5
min_word_length = 4
common_words_cutoff = 10000
letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z']
results = []
directions = [
  [0, -1], # up
  [1, -1], # up-right
  [1, 0], # right
  [1, 1], # down-right
  [0, 1], # down
  [-1, 1], # down-left
  [-1, 0], # left
  [-1, -1] # up-left
]

rows = []
words = []

def main():
  with open('google-books-common-words.txt', 'r') as words_file:
    global words
    words = words_file.readlines()
    if common_words_cutoff:
      words = words[:common_words_cutoff]
    words = [word.lower().strip() for word in words]
    words.sort()

  # randomly populate rows
  for y in range(height):
    row = []
    for x in range(width):
      row.append(random.choice(letters))
    rows.append(row)

  # start word-searching at each x,y position
  for x in range(width):
    for y in range(height):
      search(x, y, '', [])

  for result in results:
    print(result)

def search(x, y, word, word_arr):
  word += rows[y][x]
  word_arr = list(word_arr) # clone
  word_arr.append([x, y])

  ix = bisect.bisect_left(words, word)

  # if it's a word, add it to the results
  if ix < len(words) and words[ix] == word:
    if len(word) >= min_word_length:
      if not word in results: # avoid duplicates
        results.append(word)

  # if there are words that start with this combo
  # keep drilling down (otherwise, give up)
  if ix < len(words) and words[ix].startswith(word):
    for dir in directions:
      new_x = x + dir[0]
      new_y = x + dir[1]
      if is_in_bounds(new_x, new_y) and not is_used(new_x, new_y, word_arr):
        search(new_x, new_y, word, word_arr)

def is_in_bounds(x, y):
  return x >= 0 and y >= 0 and x < width and y < height

def is_used(x, y, word_arr):
  for coords in word_arr:
    if x == coords[0] and y == coords[1]:
      return True
  return False

if __name__ == "__main__":
  main()
