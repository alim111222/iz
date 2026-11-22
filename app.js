/* app.js — интерфейс «Із»: запись дня → обработка → воспоминание → папка дня → архив. */
(function (G) {
  'use strict';
  const IZ = G.IZ, R = IZ.render;
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const uid = () => 'd' + Math.random().toString(36).slice(2, 9);

  /* ---------- хранилище (IndexedDB, запасной вариант — память) ---------- */
  const store = (() => {
    let db = null; const mem = new Map();
    const open = () => new Promise(res => {
      try { const rq = indexedDB.open('iz-diary', 1); rq.onupgradeneeded = () => rq.result.createObjectStore('days', { keyPath: 'id' });
        rq.onsuccess = () => { db = rq.result; res(); }; rq.onerror = () => res(); } catch (e) { res(); }
    });
    const tx = (mode, fn) => new Promise((res, rej) => { try { const t = db.transaction('days', mode), s = t.objectStore('days'); const r = fn(s); t.oncomplete = () => res(r && r.result); t.onerror = () => rej(t.error); } catch (e) { rej(e); } });
    return {
      open,
      async all() { if (!db) return [...mem.values()]; try { return await new Promise((res, rej) => { const r = db.transaction('days').objectStore('days').getAll(); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); } catch (e) { return [...mem.values()]; } },
      async put(d) { mem.set(d.id, d); if (db) try { await tx('readwrite', s => s.put(d)); } catch (e) { console.warn('IDB put', e); } },
      async del(id) { mem.delete(id); if (db) try { await tx('readwrite', s => s.delete(id)); } catch (e) { } },
      async clear() { mem.clear(); if (db) try { await tx('readwrite', s => s.clear()); } catch (e) { } },
      persistent: () => !!db
    };
  })();

  let DAYS = [];
  const sortDays = () => DAYS.sort((a, b) => new Date(a.date) - new Date(b.date)).forEach((d, i) => d.num = i + 1);

  /* ---------- возможности платформы (если страница открыта как артефакт) ---------- */
  const cap = { tts: null, downloads: null };
  if (G.claude && G.claude.use) {
    G.claude.use('tts').then(t => { cap.tts = t; }).catch(() => { });
    G.claude.use('downloads').then(d => { cap.downloads = d; }).catch(() => { });
  }
  async function saveFile(filename, blob) {
    if (cap.downloads) {
      try { await cap.downloads.save({ filename, data: blob }); return; } catch (e) {
        try { await cap.downloads.save({ filename, data: new Uint8Array(await blob.arrayBuffer()) }); return; } catch (e2) { toast('Сохранение отклонено или недоступно'); return; }
      }
    }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  }
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 3200); }

  /* ---------- конвейер ---------- */
  async function loadImg(blob) { const url = URL.createObjectURL(blob); const img = new Image(); img.src = url; await img.decode(); return img; }
  async function processDay(input, existing) {
    const tx = IZ.analyzeText(input.text);
    const imgs = []; for (const b of input.photos) imgs.push(await loadImg(b));
    const ph = IZ.mergePhotos(imgs.map(IZ.analyzeImage));
    const song = input.song || {};
    let mu;
    if (song.kind === 'file' && song.blob) { try { mu = await IZ.analyzeAudio(await song.blob.arrayBuffer()); } catch (e) { console.warn(e); mu = IZ.describedMusic(song); mu.note = 'файл не удалось декодировать — по описанию'; } }
    else mu = IZ.describedMusic(song);
    mu = IZ.finalizeMusic(mu, song);
    const passport = IZ.buildPassport(tx, ph, mu, { title: input.title, forceTech: input.forceTech });
    const day = { ...(existing || {}), id: (existing && existing.id) || uid(), date: input.date, text: input.text, photos: input.photos, song, demo: !!input.demo,
      analysis: { text: tx, photo: ph, music: mu }, passport, title: passport.title, created: (existing && existing.created) || Date.now(), titleLocked: !!input.title };
    day.cover = await renderCover(day, imgs);
    return day;
  }
  const frameCache = new Map();
  async function framesFor(day) {
    const key = day.id + ':' + day.passport.tech + ':' + day.passport.palette.join();
    if (frameCache.has(key)) return frameCache.get(key);
    const imgs = []; for (const b of day.photos) imgs.push(await loadImg(b));
    const f = R.prepare(day, imgs); frameCache.set(key, f); return f;
  }
  async function renderCover(day, imgs) {
    const frames = imgs ? R.prepare(day, imgs) : await framesFor(day);
    const c = R.mk(R.W, R.H), x = c.getContext('2d');
    R.drawFrame(x, day, frames, Math.min(day.passport.sceneDur * 0.72, day.passport.duration - 0.1), { still: true });
    const s = R.mk(R.W / 2, R.H / 2); s.getContext('2d').drawImage(c, 0, 0, R.W / 2, R.H / 2);
    return s.toDataURL('image/jpeg', 0.86);
  }

  /* ---------- навигация ---------- */
  function route() {
    const h = location.hash.slice(1);
    stopPlayer();
    $$('.view').forEach(v => v.hidden = true); $$('.nav a').forEach(a => a.classList.remove('on'));
    if (h.startsWith('day-')) { const d = DAYS.find(x => x.id === h.slice(4)); if (d) { showDay(d); return; } }
    if (h === 'new') { $('#v-new').hidden = false; $('[href="#new"]').classList.add('on'); return; }
    if (h === 'system') { $('#v-system').hidden = false; $('[href="#system"]').classList.add('on'); renderSystem(); return; }
    $('#v-diary').hidden = false; $('[href="#diary"]').classList.add('on'); renderDiary();
  }
  G.addEventListener('hashchange', route);

  /* ---------- дневник ---------- */
  function renderDiary() {
    const q = ($('#search').value || '').toLowerCase(), tf = $('#techFilter').value;
    const list = DAYS.slice().reverse().filter(d => (!q || (d.title + ' ' + d.text).toLowerCase().includes(q)) && (!tf || d.passport.tech === tf));
    $('#feed').innerHTML = list.length ? list.map(d => `
      <a class="card" href="#day-${d.id}" title="${esc(d.title)}">
        <img src="${d.cover}" alt="${esc(d.title)}" loading="lazy">
        <div class="cap"><span class="mono">${fmtDate(d.date)} · № ${String(d.num).padStart(3, '0')}</span><b>📁 ${esc(d.title)}</b><span class="mono dim">${IZ.TECH[d.passport.tech].name}${d.demo ? ' · демо' : ''}</span></div>
      </a>`).join('') : `<p class="empty">Пока пусто. <a href="#new">Запишите первый день →</a></p>`;
    $('#count').textContent = `${DAYS.length} ${plural(DAYS.length, 'день', 'дня', 'дней')}`;
    $('#storeNote').textContent = store.persistent() ? 'Дневник хранится в этом браузере (IndexedDB).' : 'Хранилище браузера недоступно — записи живут до закрытия вкладки. Сохраняйте папки дней в .zip.';
  }
  const plural = (n, a, b, c) => { const m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 12 || h > 14) ? b : c; };
  const fmtDate = d => { const t = new Date(d); return `${String(t.getDate()).padStart(2, '0')}.${String(t.getMonth() + 1).padStart(2, '0')}.${t.getFullYear()}`; };
  $('#search').addEventListener('input', renderDiary); $('#techFilter').addEventListener('change', renderDiary);

  /* ---------- день: плеер ---------- */
  let player = null;
  function stopPlayer() { if (!player) return; cancelAnimationFrame(player.raf); if (player.audio) { player.audio.pause(); } if (player.url) URL.revokeObjectURL(player.url); stopVoice(); player = null; }
  async function showDay(day) {
    $('#v-day').hidden = false;
    const P = day.passport, mu = day.analysis.music, tx = day.analysis.text, s = day.song || {};
    $('#dayTitle').textContent = day.title; $('#dayMeta').textContent = `${fmtDate(day.date)} · № ${String(day.num).padStart(3, '0')} · ${IZ.TECH[P.tech].name}${P.accent ? ' + ' + IZ.TECH[P.accent].name.toLowerCase() : ''}`;
    $('#dayText').textContent = day.text;
    // папка дня
    const files = [['📄', 'запись.txt', `${day.text.length} знаков`]];
    day.photos.forEach((b, i) => files.push(['🖼', `фото_${i + 1}.jpg`, `${Math.round(b.size / 1024)} КБ`]));
    if (s.kind === 'file') files.push(['♪', s.name || 'песня', `${Math.round((s.blob && s.blob.size || 0) / 1024)} КБ · ${mu.bpm} BPM`]); else files.push(['♪', 'песня_ссылка.txt', IZ.serviceFromUrl(s.url) || 'ссылка']);
    files.push(['▶', 'воспоминание.webm', day.video ? `${Math.round(day.video.size / 1024)} КБ` : 'запишите кнопкой «Видео»']);
    files.push(['🖼', 'обложка.jpg', 'кадр страницы']);
    files.push(['🗣', 'озвучка.json', `голос «${P.voice.label}», ×${P.voice.rate}`]);
    files.push(['🧭', 'паспорт_дня.json', 'правила, по которым собран день']);
    $('#folderName').textContent = '📁 ' + day.title;
    $('#folder').innerHTML = files.map(f => `<li><span>${f[0]}</span><b>${esc(f[1])}</b><i>${esc(f[2])}</i></li>`).join('');
    // почему так
    $('#why').innerHTML = P.why.map(w => `<li><b>${esc(w.k)}</b> ${esc(w.v)}</li>`).join('') +
      `<li><b>Баллы приёмов</b><div class="scores">${Object.entries(P.scores).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<div><span>${IZ.TECH[k].name}</span><i style="width:${Math.max(2, Math.round(v / Math.max(...Object.values(P.scores)) * 100))}%"></i></div>`).join('')}</div></li>`;
    $('#palette').innerHTML = P.palette.map(c => `<span style="background:${c}" title="${c}"></span>`).join('') + `<span style="background:${P.accentCol}" title="акцент ${P.accentCol}" class="acc"></span>`;
    $('#inputs').innerHTML = `
      <div><b>Текст</b> валентность ${tx.valence.toFixed(2)}, энергия ${tx.arousal.toFixed(2)}${tx.season ? ', сезон: ' + IZ.SEASON_RU[tx.season] : ''}${tx.time ? ', ' + IZ.TIME_RU[tx.time] : ''}${tx.place ? ', место: ' + tx.place.nom : ''}${tx.people.length ? ', ' + tx.people.join(', ') : ''}${tx.weather.length ? ', погода: ' + tx.weather.join('/') : ''}.
        <span class="dim">Слова-сигналы: ${esc([...tx.found.pos, ...tx.found.neg, ...tx.found.hi, ...tx.found.lo].slice(0, 12).join(', ') || '—')}</span></div>
      <div><b>Фото</b> ${day.analysis.photo.count} шт., яркость ${day.analysis.photo.lum.toFixed(2)}, насыщенность ${day.analysis.photo.sat.toFixed(2)}, тепло ${day.analysis.photo.warm.toFixed(2)}, контраст ${day.analysis.photo.contrast.toFixed(2)}.</div>
      <div><b>Музыка</b> ${esc([s.artist, s.title].filter(Boolean).join(' — ') || s.name || '')}: ${mu.bpm} BPM, ${mu.key}, энергия ${mu.energy.toFixed(2)}, жанр ${esc(mu.genre)}, эпоха ${mu.era}. <span class="dim">${mu.source === 'audio' ? 'Аудиоанализ файла (темп, тональность, огибающая).' : 'По описанию: для ссылок аудио не скачивается.'}</span></div>`;
    $('#songLink').innerHTML = s.kind === 'link' && s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">Открыть песню в ${esc(IZ.serviceFromUrl(s.url))} ↗</a>` : s.license ? `<span class="dim">${esc(s.license)}</span>` : '';
    $('#techPick').value = day.forceTech || '';
    $('#titleEdit').value = day.title;
    // плеер
    const frames = await framesFor(day);
    const cv = $('#stage'), x = cv.getContext('2d');
    player = { day, frames, t0: performance.now(), playing: false, t: 0 };
    if (s.kind === 'file' && s.blob) { player.url = URL.createObjectURL(s.blob); player.audio = new Audio(player.url); player.audio.loop = true; }
    const loop = () => {
      if (!player) return;
      let t;
      if (player.playing) { t = player.audio && !player.audio.paused ? player.audio.currentTime % P.duration : ((performance.now() - player.t0) / 1000) % P.duration; player.t = t; }
      else t = player.t;
      R.drawFrame(x, day, frames, t);
      $('#time').textContent = `${t.toFixed(1)} / ${P.duration.toFixed(0)} c`;
      player.raf = requestAnimationFrame(loop);
    };
    loop();
    $('#play').textContent = '▶ Смотреть';
  }
  $('#play').addEventListener('click', async () => {
    if (!player) return;
    if (player.playing) { player.playing = false; player.audio && player.audio.pause(); $('#play').textContent = '▶ Смотреть'; return; }
    player.playing = true; player.t0 = performance.now() - player.t * 1000; $('#play').textContent = '❚❚ Пауза';
    if (player.audio) { try { player.audio.currentTime = player.t; await player.audio.play(); } catch (e) { } }
  });
  $('#restart').addEventListener('click', () => { if (!player) return; player.t = 0; player.t0 = performance.now(); if (player.audio) player.audio.currentTime = 0; });

  /* ---------- озвучка ---------- */
  let speaking = false;
  function stopVoice() { try { cap.tts && cap.tts.stop(); } catch (e) { } try { speechSynthesis.cancel(); } catch (e) { } speaking = false; const b = $('#voice'); if (b) b.textContent = '🗣 Озвучить'; }
  $('#voice').addEventListener('click', async () => {
    if (!player) return; if (speaking) { stopVoice(); return; }
    const d = player.day, v = d.passport.voice; speaking = true; $('#voice').textContent = '■ Стоп';
    const text = d.title + '. ' + d.text;
    if (cap.tts) { try { await cap.tts.speak(text.slice(0, 1990), { voice: v.id, rate: Math.max(0.7, Math.min(1.5, v.rate)) }); } catch (e) { if (!speaking) return; fallbackSpeak(text, v); return; } stopVoice(); return; }
    fallbackSpeak(text, v);
  });
  function fallbackSpeak(text, v) {
    if (!('speechSynthesis' in G)) { toast('Синтез речи недоступен в этом браузере'); stopVoice(); return; }
    const u = new SpeechSynthesisUtterance(text); u.lang = 'ru-RU'; u.rate = v.rate; u.pitch = v.pitch;
    const vs = speechSynthesis.getVoices().filter(x => /^ru/i.test(x.lang)); if (vs.length) u.voice = vs[Math.abs(R.hashStr(v.id)) % vs.length];
    u.onend = () => stopVoice(); speechSynthesis.speak(u);
  }

  /* ---------- правка дня ---------- */
  $('#rebuild').addEventListener('click', async () => {
    if (!player) return; const d = player.day; const forced = $('#techPick').value || null; const title = $('#titleEdit').value.trim();
    btnBusy('#rebuild', true);
    const nd = await processDay({ date: d.date, text: d.text, photos: d.photos, song: d.song, demo: d.demo, title: title && title !== d.title ? title : (d.titleLocked ? d.title : ''), forceTech: forced }, d);
    nd.forceTech = forced; delete nd.video;
    DAYS = DAYS.map(x => x.id === d.id ? nd : x); sortDays(); await store.put(nd); btnBusy('#rebuild', false); route(); toast('День пересобран');
  });
  $('#delete').addEventListener('click', async () => {
    if (!player) return; const b = $('#delete');
    if (!b.dataset.sure) { b.dataset.sure = 1; b.textContent = 'Точно удалить?'; setTimeout(() => { delete b.dataset.sure; b.textContent = 'Удалить день'; }, 3000); return; }
    const id = player.day.id; DAYS = DAYS.filter(x => x.id !== id); sortDays(); await store.del(id); location.hash = 'diary';
  });

  /* ---------- экспорт: видео и папка ---------- */
  $('#record').addEventListener('click', async () => {
    if (!player) return; const d = player.day, P = d.passport;
    if (!G.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) { toast('Запись видео не поддерживается этим браузером'); return; }
    btnBusy('#record', true, 'Запись…');
    const cv = R.mk(R.W, R.H), x = cv.getContext('2d'), frames = player.frames;
    const vs = cv.captureStream(30); let tracks = [...vs.getVideoTracks()], ac, src, audio;
    if (d.song.kind === 'file' && d.song.blob) {
      try { ac = new AudioContext(); audio = new Audio(URL.createObjectURL(d.song.blob)); src = ac.createMediaElementSource(audio); const dest = ac.createMediaStreamDestination(); src.connect(dest); src.connect(ac.destination); tracks = tracks.concat(dest.stream.getAudioTracks()); } catch (e) { }
    }
    const mime = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'].find(m => MediaRecorder.isTypeSupported(m)) || '';
    const rec = new MediaRecorder(new MediaStream(tracks), mime ? { mimeType: mime, videoBitsPerSecond: 5e6 } : {}), chunks = [];
    rec.ondataavailable = e => e.data.size && chunks.push(e.data);
    const done = new Promise(r => rec.onstop = r);
    rec.start(250); if (audio) { audio.currentTime = 0; try { await audio.play(); } catch (e) { } }
    const t0 = performance.now();
    await new Promise(res => { const step = () => { const t = (performance.now() - t0) / 1000; R.drawFrame(x, d, frames, Math.min(t, P.duration)); $('#record').textContent = `Запись… ${Math.ceil(P.duration - t)} c`; if (t < P.duration) requestAnimationFrame(step); else res(); }; step(); });
    rec.stop(); await done; if (audio) audio.pause(); if (ac) ac.close();
    d.video = new Blob(chunks, { type: (mime || 'video/webm').split(';')[0] });
    await store.put(d); btnBusy('#record', false);
    await saveFile(`${safe(d.title)}.webm`, d.video); toast('Видео записано и добавлено в папку дня'); showDayFolderRefresh(d);
  });
  function showDayFolderRefresh(d) { const li = [...$$('#folder li')].find(l => l.textContent.includes('воспоминание')); if (li) li.querySelector('i').textContent = `${Math.round(d.video.size / 1024)} КБ`; }
  const safe = s => s.replace(/[\\/:*?"<>|]/g, '').trim();
  $('#zip').addEventListener('click', async () => {
    if (!player) return; if (!G.JSZip) { toast('Библиотека архивации не загрузилась'); return; }
    const d = player.day, z = new G.JSZip(), f = z.folder(safe(d.title));
    f.file('запись.txt', `${d.title}\n${fmtDate(d.date)}\n\n${d.text}\n`);
    d.photos.forEach((b, i) => f.file(`фото_${i + 1}.jpg`, b));
    if (d.song.kind === 'file' && d.song.blob) f.file(d.song.name || 'песня.wav', d.song.blob);
    else f.file('песня_ссылка.txt', `${[d.song.artist, d.song.title].filter(Boolean).join(' — ')}\n${d.song.url || ''}\n`);
    if (d.video) f.file('воспоминание.webm', d.video);
    const full = R.mk(R.W, R.H); R.drawFrame(full.getContext('2d'), d, player.frames, Math.min(d.passport.sceneDur * 0.72, d.passport.duration - 0.1), { still: true });
    f.file('обложка.png', await new Promise(r => full.toBlob(r, 'image/png')));
    f.file('озвучка.json', JSON.stringify({ text: d.text, voice: d.passport.voice, note: 'Озвучка синтезируется при просмотре по этим параметрам' }, null, 2));
    const { why, ...pp } = d.passport;
    f.file('паспорт_дня.json', JSON.stringify({ title: d.title, date: d.date, passport: pp, rules: why, analysis: { text: { ...d.analysis.text }, photo: d.analysis.photo, music: { ...d.analysis.music, curve: undefined } } }, null, 2));
    const blob = await z.generateAsync({ type: 'blob' }); await saveFile(`${safe(d.title)}.zip`, blob);
  });
  function btnBusy(sel, on, label) { const b = $(sel); if (on) { b.dataset.l = b.textContent; b.disabled = true; if (label) b.textContent = label; } else { b.disabled = false; b.textContent = b.dataset.l || b.textContent; } }

  /* ---------- новая запись ---------- */
  let newPhotos = [];
  const now = new Date(); now.setMinutes(now.getMinutes() - now.getTimezoneOffset()); $('#fDate').value = now.toISOString().slice(0, 16);
  $('#fPhotos').addEventListener('change', e => { newPhotos = newPhotos.concat([...e.target.files].filter(f => /^image\//.test(f.type))); thumbs(); e.target.value = ''; });
  function thumbs() { $('#thumbs').innerHTML = newPhotos.map((f, i) => `<figure><img src="${URL.createObjectURL(f)}"><button type="button" data-i="${i}" aria-label="убрать">×</button></figure>`).join(''); }
  $('#thumbs').addEventListener('click', e => { if (e.target.dataset.i != null) { newPhotos.splice(+e.target.dataset.i, 1); thumbs(); } });
  $$('input[name=songKind]').forEach(r => r.addEventListener('change', () => { const k = $('input[name=songKind]:checked').value; $('#songLinkBox').hidden = k !== 'link'; $('#songFileBox').hidden = k !== 'file'; }));
  // перетаскивание файлов
  const drop = $('#dropzone');
  ['dragover', 'dragenter'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e => { const fs = [...e.dataTransfer.files]; newPhotos = newPhotos.concat(fs.filter(f => /^image\//.test(f.type))); const au = fs.find(f => /^audio\//.test(f.type)); if (au) { const dt = new DataTransfer(); dt.items.add(au); $('#fAudio').files = dt.files; $('#kFile').checked = true; $('#kFile').dispatchEvent(new Event('change')); } thumbs(); });
  $('#newForm').addEventListener('submit', async e => {
    e.preventDefault();
    const text = $('#fText').value.trim(), kind = $('input[name=songKind]:checked').value;
    const err = [];
    if (text.length < 15) err.push('напишите о дне хотя бы пару предложений');
    if (!newPhotos.length) err.push('добавьте минимум одно фото');
    const audioF = $('#fAudio').files[0], url = $('#fUrl').value.trim();
    if (kind === 'link' && !/^https?:\/\//.test(url)) err.push('вставьте ссылку на песню');
    if (kind === 'file' && !audioF) err.push('выберите аудиофайл');
    if (err.length) { $('#formErr').textContent = 'Чтобы собрать день: ' + err.join('; ') + '.'; return; }
    $('#formErr').textContent = '';
    const song = { kind, artist: $('#fArtist').value.trim(), title: $('#fSong').value.trim(), genre: $('#fGenre').value.trim(), year: $('#fYear').value.trim(), tempo: $('#fTempo').value, mood: $('#fMood').value };
    if (kind === 'link') song.url = url; else { song.blob = audioF; song.name = audioF.name; }
    btnBusy('#make', true, 'Собираю день…');
    try {
      await fontsReady;
      const day = await processDay({ date: $('#fDate').value, text, photos: newPhotos.slice(), song, title: $('#fTitle').value.trim() });
      DAYS.push(day); sortDays(); await store.put(day);
      newPhotos = []; thumbs(); $('#newForm').reset(); $('#fDate').value = now.toISOString().slice(0, 16); $('#songLinkBox').hidden = false; $('#songFileBox').hidden = true;
      location.hash = 'day-' + day.id;
    } catch (ex) { console.error(ex); $('#formErr').textContent = 'Не получилось собрать день: ' + ex.message; }
    btnBusy('#make', false);
  });

  /* ---------- страница «Система» ---------- */
  function renderSystem() {
    $('#techList').innerHTML = Object.entries(IZ.TECH).map(([k, t]) => {
      const ex = DAYS.filter(d => d.passport.tech === k).slice(0, 3);
      return `<article><h3>${t.name}</h3><p class="mono dim">${t.ref}</p><p><b>Что делает:</b> ${t.what}.</p><p><b>Почему:</b> ${t.why}.</p>
        <p class="mono dim">Включается: ${{ monet: 'светлое спокойное (V≈+0.5, A≈0.3), природа, тёплый день', kandinsky: 'высокая энергия (A>0.75) при нейтральной/тёмной валентности, синтетический звук, город, ночь', matisse: 'радость + энергия (V≈+0.75, A≈0.7), рядом люди, лето', ma: 'очень тихо (A≈0.1), нейтрально, в записи никого нет, зима/утро, эмбиент', film: 'светлая печаль (V≈−0.45), ностальгия, песня старше 1990-х, дождь' }[k]}</p>
        <div class="mini">${ex.map(d => `<a href="#day-${d.id}"><img src="${d.cover}" alt=""></a>`).join('')}</div></article>`;
    }).join('');
  }

  /* ---------- демо ---------- */
  async function seedDemo() {
    $('#loader').hidden = false;
    const inputs = await IZ.demo.buildDemoInputs((i, n) => $('#loaderText').textContent = `Готовлю демо-дни: ${i + 1} из ${n}…`);
    for (const inp of inputs) { const d = await processDay(inp); DAYS.push(d); await store.put(d); }
    sortDays(); $('#loader').hidden = true;
  }
  $('#resetDemo').addEventListener('click', async () => {
    const b = $('#resetDemo'); if (!b.dataset.sure) { b.dataset.sure = 1; b.textContent = 'Стереть всё и вернуть демо?'; setTimeout(() => { delete b.dataset.sure; b.textContent = 'Сбросить к демо'; }, 3000); return; }
    await store.clear(); DAYS = []; frameCache.clear(); await seedDemo(); location.hash = 'diary'; route();
  });

  const fontsReady = (async () => {
    try { await Promise.race([Promise.all(['600 56px "Cormorant Garamond"', 'italic 500 28px "Cormorant Garamond"', '500 34px "Caveat"', '500 17px "JetBrains Mono"', '700 40px "Unbounded"'].map(f => document.fonts.load(f, 'АаЯя'))), new Promise(r => setTimeout(r, 3500))]); } catch (e) { }
  })();

  (async function init() {
    await store.open(); await fontsReady;
    DAYS = await store.all();
    if (!DAYS.length) await seedDemo();
    sortDays(); route();
    G.IZ_APP = { DAYS: () => DAYS, processDay, framesFor, store };
  })();
})(window);
