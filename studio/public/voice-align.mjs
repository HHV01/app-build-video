// Căn ranh giới cảnh theo voice thật bằng các chỗ ngắt nghỉ. Hàm thuần, không I/O, không AI.
// Dữ liệu vào: mẫu âm thanh mono (Float32Array) + số từ của từng cảnh theo thứ tự.

export function detectPauses(samples, sampleRate, { frameMs = 20, minPauseMs = 250, relThreshold = 0.08 } = {}) {
  const n = Math.max(1, Math.floor(sampleRate * frameMs / 1000)), energies = [];
  for (let i = 0; i + n <= samples.length; i += n) { let s = 0; for (let j = 0; j < n; j++) { const v = samples[i + j]; s += v * v; } energies.push(Math.sqrt(s / n)); }
  const frameSec = n / sampleRate, sorted = Float32Array.from(energies).sort();
  const floor = sorted[Math.floor(sorted.length * 0.05)], peak = sorted[Math.floor(sorted.length * 0.95)];
  const thr = floor + (peak - floor) * relThreshold, minFrames = Math.ceil(minPauseMs / frameMs);
  const runs = []; let start = -1;
  for (let i = 0; i <= energies.length; i++) {
    const quiet = i < energies.length && energies[i] < thr;
    if (quiet && start < 0) start = i;
    if (!quiet && start >= 0) { runs.push([start, i]); start = -1; }
  }
  const total = energies.length, speechStart = runs.length && runs[0][0] === 0 ? runs[0][1] * frameSec : 0;
  const speechEnd = runs.length && runs.at(-1)[1] === total ? runs.at(-1)[0] * frameSec : total * frameSec;
  const pauses = runs.filter(([a, b]) => b - a >= minFrames && a > 0 && b < total)
    .map(([a, b]) => ({ start: a * frameSec, end: b * frameSec, mid: (a + b) / 2 * frameSec, len: (b - a) * frameSec }));
  return { pauses, duration: total * frameSec, speechStart, speechEnd, threshold: thr };
}

// wordsPerScene: số từ mỗi cảnh. Trả về thời điểm kết thúc của từng cảnh (cảnh cuối = speechEnd).
// anchorable[k-1] = true nếu cảnh k kết thúc ở cuối câu (có thể có chỗ ngắt); false thì chỉ nội suy theo số từ.
export function alignScenes(wordsPerScene, { pauses, speechStart, speechEnd }, { anchorable, unmatchedPenalty = 0.6, pauseBonus = 0.4, maxSkip = 3, minTol = 15, tolFrac = 0.08 } = {}) {
  const n = wordsPerScene.length, W = [0]; wordsPerScene.forEach((w, i) => W.push(W[i] + w));
  const total = W[n], span = Math.max(1e-6, speechEnd - speechStart), rate = total / span;
  const expected = k => speechStart + W[k] / rate, tol = Math.max(minTol, span * tolFrac);
  const canAnchor = k => k > 0 && k < n && (anchorable ? anchorable[k - 1] !== false : true);
  const cand = Array.from({ length: n + 1 }, () => []);
  cand[0] = [{ t: speechStart, fixed: true }]; cand[n] = [{ t: speechEnd, fixed: true }];
  for (let k = 1; k < n; k++) cand[k] = !canAnchor(k) ? [] : pauses.filter(p => Math.abs(p.mid - expected(k)) <= tol).map(p => ({ t: p.mid, len: p.len }));
  const segCost = (j, tj, k, tk) => { const de = (W[k] - W[j]) / rate; return Math.min(Math.abs((tk - tj) - de) / Math.max(de, 1), 2); };
  const best = Array.from({ length: n + 1 }, () => []);   // best[k][c] = {cost, prevK, prevC}
  best[0][0] = { cost: 0 };
  for (let k = 1; k <= n; k++) {
    cand[k].forEach((c, ci) => {
      let bestHere = null, skipped = 0;
      for (let j = k - 1; j >= 0 && skipped <= maxSkip; j--) {
        best[j].forEach((prev, pj) => {
          if (!prev || cand[j][pj].t >= c.t) return;
          const cost = prev.cost + segCost(j, cand[j][pj].t, k, c.t) + unmatchedPenalty * skipped - (c.fixed ? 0 : pauseBonus * Math.min(c.len, 1));
          if (!bestHere || cost < bestHere.cost) bestHere = { cost, prevK: j, prevC: pj };
        });
        if (canAnchor(j)) skipped++;
      }
      best[k][ci] = bestHere;
    });
  }
  const fin = best[n][0];
  if (!fin) return { ends: null, matched: 0, total: n - 1, reason: 'Không khớp được chuỗi ngắt nghỉ.' };
  const chosen = new Map(); let k = n, ci = 0;
  while (k > 0) { const b = best[k][ci]; if (k < n) chosen.set(k, cand[k][ci].t); [k, ci] = [b.prevK, b.prevC]; }
  const ends = new Array(n); let lastK = 0, lastT = speechStart;
  for (let i = 1; i <= n; i++) {
    if (i === n) ends[n - 1] = speechEnd;
    else if (chosen.has(i)) { ends[i - 1] = chosen.get(i); }
    if (ends[i - 1] !== undefined) {
      for (let m = lastK + 1; m < i; m++) ends[m - 1] = lastT + (ends[i - 1] - lastT) * (W[m] - W[lastK]) / (W[i] - W[lastK]);
      lastK = i; lastT = ends[i - 1];
    }
  }
  return { ends, matched: chosen.size, total: n - 1, cost: fin.cost };
}
