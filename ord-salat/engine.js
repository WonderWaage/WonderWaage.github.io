/* Ordsalat: 4×4 puzzle engine. Works without dependencies. */
(function (root) {
  'use strict';
  const SIZE = 4;
  const CELLS = 16;
  const NEIGHBORS = Array.from({length: CELLS}, (_, i) => {
    const r = Math.floor(i / SIZE), c = i % SIZE;
    const result = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) result.push(nr * SIZE + nc);
    }
    return result;
  });

  function normalizeWord(v) {
    return String(v || '').normalize('NFC').trim().replace(/\s+/g, '').toLocaleUpperCase('da-DK');
  }
  function countLetters(word) { return Array.from(normalizeWord(word)).length; }
  function shuffled(items) {
    const arr = items.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  function isNeighbor(a, b) { return NEIGHBORS[a].includes(b); }
  function falling(board, selected) {
    const clear = new Set(selected);
    const next = Array(CELLS).fill(null);
    for (let c = 0; c < SIZE; c++) {
      let bottom = SIZE - 1;
      for (let r = SIZE - 1; r >= 0; r--) {
        const idx = r * SIZE + c;
        if (board[idx] != null && !clear.has(idx)) {
          next[bottom * SIZE + c] = board[idx];
          bottom--;
        }
      }
    }
    return next;
  }
  function boardSignature(board) { return board.map(c => c || '.').join(''); }
  function findPaths(board, word, cap = 1500) {
    const letters = Array.from(normalizeWord(word));
    const paths = [];
    if (!letters.length) return paths;
    const visit = (pos, step, used, path) => {
      if (paths.length >= cap) return;
      if (step === letters.length) { paths.push(path.slice()); return; }
      for (const next of NEIGHBORS[pos]) {
        if (!(used & (1 << next)) && board[next] === letters[step]) {
          path.push(next);
          visit(next, step + 1, used | (1 << next), path);
          path.pop();
        }
      }
    };
    for (let i = 0; i < CELLS && paths.length < cap; i++) {
      if (board[i] === letters[0]) visit(i, 1, 1 << i, [i]);
    }
    return paths;
  }
  // Returns one valid next move if the remaining puzzle can be completed.
  function solve(board, words, memo = new Set(), budget = {visits: 0, max: 25000}) {
    if (!words.length) return {word: null, path: []};
    if (++budget.visits > budget.max) return null;
    const key = boardSignature(board) + '#' + words.slice().sort().join('|');
    if (memo.has(key)) return null;
    // Try the word with the fewest current paths first to prune failing branches.
    const options = words.map((word, index) => ({word, index, paths: findPaths(board, word, 750)}));
    options.sort((a, b) => a.paths.length - b.paths.length);
    for (const option of options) {
      for (const path of option.paths) {
        const after = falling(board, path);
        const left = words.filter((_, index) => index !== option.index);
        if (solve(after, left, memo, budget)) return {word: option.word, path};
      }
    }
    memo.add(key);
    return null;
  }

  // Reverse gravity: insert a traced word into a settled board so that
  // clearing its letters and applying gravity restores the previous board.
  function insertReverse(board, word, tries = 250) {
    const chars = Array.from(normalizeWord(word));
    const height = [0, 0, 0, 0];
    for (let c = 0; c < SIZE; c++) for (let r = 0; r < SIZE; r++) if (board[r * SIZE + c] != null) height[c]++;
    const maxNew = height.map(h => SIZE - h);
    const length = chars.length;
    for (let attempt = 0; attempt < tries; attempt++) {
      let path = null;
      const startOrder = shuffled([...Array(CELLS).keys()]);
      const dfs = (pos, visited, arr, colCount) => {
        if (arr.length === length) {
          // The completed board must have no gaps beneath letters.
          for (let c = 0; c < SIZE; c++) {
            const minRow = SIZE - (height[c] + colCount[c]);
            if (arr.some(i => i % SIZE === c && Math.floor(i / SIZE) < minRow)) return false;
          }
          path = arr.slice();
          return true;
        }
        for (const next of shuffled(NEIGHBORS[pos])) {
          const c = next % SIZE;
          if (visited & (1 << next) || colCount[c] >= maxNew[c]) continue;
          colCount[c]++;
          arr.push(next);
          if (dfs(next, visited | (1 << next), arr, colCount)) return true;
          arr.pop();
          colCount[c]--;
        }
        return false;
      };
      for (const start of startOrder) {
        const c = start % SIZE;
        if (!maxNew[c]) continue;
        const counts = [0, 0, 0, 0]; counts[c] = 1;
        if (dfs(start, 1 << start, [start], counts)) break;
      }
      if (!path) continue;
      const next = Array(CELLS).fill(null);
      const newAt = new Map(path.map((i, index) => [i, chars[index]]));
      for (let c = 0; c < SIZE; c++) {
        const old = [];
        for (let r = 0; r < SIZE; r++) if (board[r * SIZE + c] != null) old.push(board[r * SIZE + c]);
        const total = height[c] + path.filter(i => i % SIZE === c).length;
        let k = 0;
        for (let r = SIZE - total; r < SIZE; r++) {
          const idx = r * SIZE + c;
          next[idx] = newAt.has(idx) ? newAt.get(idx) : old[k++];
        }
      }
      if (falling(next, path).every((letter, i) => letter === board[i])) return {grid: next, path};
    }
    return null;
  }
  // Extended 4×4 generator: several answers may share letter tiles.
  // A tile is never used twice within the same answer.
  function overlayPuzzle(words, maxAttempts = 200) {
    const minCells = new Map();
    for (const word of words) {
      const perWord = new Map();
      for (const char of Array.from(word)) perWord.set(char, (perWord.get(char) || 0) + 1);
      for (const [char, n] of perWord) minCells.set(char, Math.max(minCells.get(char) || 0, n));
    }
    if ([...minCells.values()].reduce((a, b) => a + b, 0) > CELLS) {
      throw new Error('Ordene kræver mere end 16 forskellige bogstavfelter. Udskift et ord.');
    }
    const order = words.map((word, i) => ({word, i})).sort((a, b) => b.word.length - a.word.length);
    const charsFor = order.map(x => Array.from(x.word));
    const maxNodes = 120000;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      let visited = 0;
      const placements = new Array(words.length);
      const search = (i, board) => {
        if (++visited > maxNodes) return null;
        if (i >= order.length) {
          // Prefer layouts in which each of the 16 visible letters belongs to an answer.
          if (board.some(x => x == null)) return null;
          return board;
        }
        const chars = charsFor[i];
        const candidates = [];
        const seen = new Set();
        let nodes = 0;
        const dfs = (last, at, used, path, additions) => {
          if (++nodes > 6000 || candidates.length >= 70) return;
          if (at === chars.length) {
            const key = path.join(',');
            if (!seen.has(key)) {seen.add(key); candidates.push({path:path.slice(), additions});}
            return;
          }
          const cells = at === 0 ? shuffled([...Array(CELLS).keys()]) : shuffled(NEIGHBORS[last]);
          for (const cell of cells) {
            if (used & (1 << cell)) continue;
            if (board[cell] != null && board[cell] !== chars[at]) continue;
            path.push(cell);
            dfs(cell, at + 1, used | (1 << cell), path, additions + (board[cell] == null ? 1 : 0));
            path.pop();
            if (nodes > 6000 || candidates.length >= 70) break;
          }
        };
        dfs(-1, 0, 0, [], 0);
        const filled = board.filter(x => x != null).length;
        const leftLetters = order.slice(i + 1).reduce((sum, o) => sum + o.word.length, 0);
        const needNow = Math.max(0, CELLS - filled - leftLetters);
        const feasible = candidates.filter(x => x.additions >= needNow);
        // Randomize ties but spread usage across the full grid when possible.
        const ranked = shuffled(feasible).sort((a, b) => b.additions - a.additions);
        for (const candidate of ranked.slice(0, 55)) {
          const next = board.slice();
          candidate.path.forEach((cell, j) => {next[cell] = chars[j];});
          placements[order[i].i] = candidate.path;
          const solution = search(i + 1, next);
          if (solution) return solution;
          if (visited > maxNodes) break;
        }
        return null;
      };
      const solution = search(0, Array(CELLS).fill(null));
      if (solution && words.every(w => findPaths(solution, w, 1).length)) return solution;
    }
    throw new Error('Kunne ikke få alle ordene til at passe i 4×4-feltet. Prøv andre ord eller færre ord.');
  }

  function makePuzzle(theme, hint, rawWords, maxAttempts = 90) {
    const words = rawWords.map(normalizeWord).filter(Boolean);
    if (words.length < 2) throw new Error('Brug mindst to ord.');
    if (new Set(words).size !== words.length) throw new Error('Hvert ord må kun stå én gang.');
    if (words.some(w => !/^[A-ZÆØÅ]+$/u.test(w))) throw new Error('Brug kun bogstaver (A–Z, Æ, Ø, Å) i ordene.');
    if (words.some(w => countLetters(w) < 2)) throw new Error('Alle ord skal have mindst to bogstaver.');
    const total = words.reduce((sum, word) => sum + countLetters(word), 0);
    if (total < CELLS) throw new Error(`Dine ord skal tilsammen indeholde mindst 16 bogstaver. Du har ${total}.`);
    if (total > 48) throw new Error('Brug højst 48 bogstaver fordelt på dine ord.');
    if (!String(theme || '').trim()) throw new Error('Skriv et tema.');
    if (total > CELLS) {
      return {id: 'ord-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7), theme: String(theme).trim(), hint: String(hint || '').trim(), words, grid: overlayPuzzle(words)};
    }
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      let board = Array(CELLS).fill(null);
      let success = true;
      for (const word of shuffled(words)) {
        const inserted = insertReverse(board, word, 7);
        if (!inserted) { success = false; break; }
        board = inserted.grid;
      }
      if (!success || board.some(x => x == null)) continue;
      // The reverse-insertion proof ensures a solution, independently check it.
      if (!solve(board, words, new Set(), {visits: 0, max: 30000})) continue;
      return {id: 'ord-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7), theme: String(theme).trim(), hint: String(hint || '').trim(), words, grid: board};
    }
    throw new Error('Kunne ikke placere ordene. Prøv at generere igen eller ændre et ord.');
  }
  function validatePuzzle(p) {
    if (!p || typeof p !== 'object' || !Array.isArray(p.grid) || p.grid.length !== 16 || !Array.isArray(p.words)) return false;
    if (p.grid.some(v => typeof v !== 'string' || countLetters(v) !== 1)) return false;
    const ws = p.words.map(normalizeWord);
    if (ws.length < 2 || ws.some(w => !w || !/^[A-ZÆØÅ]+$/u.test(w)) || ws.reduce((a, w) => a + w.length, 0) < 16) return false;
    if (ws.reduce((n, w) => n + w.length, 0) === CELLS) {
      const count = x => [...x].sort().join('');
      return count(ws.join('')) === count(p.grid.map(normalizeWord).join('')) && Boolean(solve(p.grid,ws));
    }
    return ws.every(word => findPaths(p.grid.map(normalizeWord), word, 1).length > 0);
  }
  const api = {SIZE, CELLS, NEIGHBORS, normalizeWord, countLetters, isNeighbor, falling, findPaths, solve, makePuzzle, validatePuzzle};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.SaladEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
