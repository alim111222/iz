/* Із — дневник атмосферы дня.
 * analyze.js — разбор входа: текст (лексикон RU), фото (палитра/свет), музыка (аудиоанализ + метаданные).
 * Всё работает локально в браузере, без внешних API. */
(function (G) {
  'use strict';
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));

  /* ---------------- ТЕКСТ ---------------- */
  const L = {
    pos: ['счаст', 'радост', 'рад ', 'радова', 'любл', 'любим', 'хорош', 'прекрас', 'чудес', 'весел', 'смея', 'смех', 'смеял', 'улыб', 'уют', 'нежн',
      'красив', 'класс', 'супер', 'восторг', 'обня', 'вкусн', 'праздн', 'ура', 'кайф', 'отличн', 'добр', 'мечт', 'вдохнов', 'горд', 'побед', 'тепло', 'тёпл', 'тепл',
      'спокойн', 'светл', 'ласков', 'душевн', 'приятн', 'наслажд', 'благодар', 'волшеб', 'сказоч', 'обожа', 'здорово', 'лучш'],
    neg: ['груст', 'печал', 'тоск', 'устал', 'плох', 'больн', 'боль', 'плак', 'слез', 'слёз', 'страш', 'тревож', 'злост', 'злил', 'бесит', 'раздраж', 'одинок', 'пуст',
      'скуч', 'тяжел', 'тяжёл', 'ужас', 'провал', 'обид', 'прощал', 'прощан', 'расстал', 'потер', 'жаль', 'стресс', 'нерв', 'паник', 'вымот', 'выгор', 'серо', 'хмур',
      'уезжа', 'уехал', 'последн', 'не спал', 'недосып', 'ссор', 'разочар', 'страх', 'боял', 'сыро', 'промок'],
    hi: ['быстр', 'бежал', 'бегом', 'спеш', 'срочн', 'дедлайн', 'сдач', 'сдать', 'крич', 'танц', 'прыг', 'концерт', 'громк', 'адренал', 'драйв', 'гонк', 'стресс', 'нерв',
      'паник', 'ура', 'восторг', 'вечерин', 'тусов', 'взрыв', 'сует', 'гроз', 'шумн', 'энерги', 'кофе', 'аврал', 'бешен', 'кипел', 'носил', 'плавал', 'нырял', 'волн',
      'хохот', 'визж', 'мчал', 'гнал', 'горел', 'успеть', 'успел', 'не успева', 'ритм', 'бодр'],
    lo: ['тих', 'спокой', 'медлен', 'долго', 'лениво', 'лень', 'сонн', 'уют', 'плед', 'чай', 'какао', 'тишин', 'задумч', 'мягк', 'неторопл', 'отдых', 'лежал', 'валял',
      'читал', 'гуляли', 'гулял', 'дремал', 'молча', 'пусто', 'пустой', 'пустын', 'никого', 'неспеш', 'плавно', 'еле', 'шёпот', 'шепот', 'слушал', 'смотрел', 'сидел'],
    nost: ['вспомн', 'детств', 'раньше', 'давно', 'когда-то', 'прощ', 'последн', 'старые', 'старый', 'бабушк', 'скучаю', 'скучать', 'ностальг', 'как в детстве', 'годы', 'плёнк', 'пленк']
  };
  const SEASON = [
    ['autumn', ['осен', 'листь', 'листопад', 'жёлт', 'желт', 'октябр', 'сентябр', 'ноябр', 'багрян']],
    ['winter', ['зим', 'снег', 'снеж', 'мороз', 'сугроб', 'лёд', 'лед ', 'гололед', 'декабр', 'январ', 'феврал', 'вьюг', 'метел']],
    ['spring', ['весн', 'весен', 'подснеж', 'капел', 'цвету', 'цветен', 'март', 'апрел', 'мая ', 'май ', 'почки', 'сирен']],
    ['summer', ['летн', 'летом', 'лето ', 'жар', 'пляж', 'загар', 'купал', 'июн', 'июл', 'август', 'зной', 'солнцепёк']]
  ];
  const TIME = [
    ['night', ['ночь', 'ночью', 'ночн', 'полноч', 'до утра', 'бессонн', 'не спал']],
    ['morning', ['утр', 'рассвет', 'завтрак', 'проснул']],
    ['evening', ['вечер', 'закат', 'ужин', 'сумерк']],
    ['day', ['днём', 'днем', 'обед', 'полдень', 'весь день', 'целый день']]
  ];
  // место: основа, именительный, род (m/f/n/p), предложный оборот, тип (nature/urban/home/transit)
  const PLACES = [
    ['парк', 'парк', 'm', 'в парке', 'nature'], ['пруд', 'пруд', 'm', 'у пруда', 'nature'], ['озер', 'озеро', 'n', 'у озера', 'nature'],
    ['море', 'море', 'n', 'у моря', 'nature'], ['моря', 'море', 'n', 'у моря', 'nature'], ['морю', 'море', 'n', 'у моря', 'nature'], ['морем', 'море', 'n', 'у моря', 'nature'], ['пляж', 'пляж', 'm', 'на пляже', 'nature'], ['горы', 'горы', 'p', 'в горах', 'nature'], ['горах', 'горы', 'p', 'в горах', 'nature'],
    ['лес', 'лес', 'm', 'в лесу', 'nature'], ['реч', 'река', 'f', 'у реки', 'nature'], ['рек', 'река', 'f', 'у реки', 'nature'],
    ['степ', 'степь', 'f', 'в степи', 'nature'], ['сад ', 'сад', 'm', 'в саду', 'nature'], ['саду', 'сад', 'm', 'в саду', 'nature'], ['дач', 'дача', 'f', 'на даче', 'nature'],
    ['набережн', 'набережная', 'f', 'на набережной', 'urban'], ['офис', 'офис', 'm', 'в офисе', 'urban'], ['кухн', 'кухня', 'f', 'на кухне', 'home'],
    ['кафе', 'кафе', 'n', 'в кафе', 'urban'], ['кофейн', 'кофейня', 'f', 'в кофейне', 'urban'], ['вокзал', 'вокзал', 'm', 'на вокзале', 'transit'],
    ['перрон', 'перрон', 'm', 'на перроне', 'transit'], ['аэропорт', 'аэропорт', 'm', 'в аэропорту', 'transit'], ['поезд', 'поезд', 'm', 'в поезде', 'transit'],
    ['университет', 'университет', 'm', 'в университете', 'urban'], ['универ', 'университет', 'm', 'в университете', 'urban'],
    ['школ', 'школа', 'f', 'в школе', 'urban'], ['крыш', 'крыша', 'f', 'на крыше', 'urban'], ['музе', 'музей', 'm', 'в музее', 'urban'],
    ['двор', 'двор', 'm', 'во дворе', 'urban'], ['балкон', 'балкон', 'm', 'на балконе', 'home'], ['город', 'город', 'm', 'в городе', 'urban'],
    ['улиц', 'улица', 'f', 'на улице', 'urban'], ['дом ', 'дом', 'm', 'дома', 'home'], ['дома ', 'дом', 'm', 'дома', 'home'], ['домой', 'дом', 'm', 'дома', 'home'], ['квартир', 'дом', 'm', 'дома', 'home'], ['комнат', 'комната', 'f', 'в комнате', 'home']
  ];
  const PEOPLE = [
    ['мам', 'с мамой'], ['пап', 'с папой'], ['девушк', 'с девушкой'], ['парн', 'с парнем'], ['муж', 'с мужем'], ['жен', 'с женой'],
    ['друз', 'с друзьями'], ['подруг', 'с подругой'], ['друг ', 'с другом'], ['другом', 'с другом'], ['друга ', 'с другом'], ['семь', 'с семьёй'], ['коллег', 'с коллегами'], ['команд', 'с командой'],
    ['бабушк', 'с бабушкой'], ['дедушк', 'с дедушкой'], ['сестр', 'с сестрой'], ['брат', 'с братом'], ['дети', 'с детьми'], ['детьми', 'с детьми'], ['детей', 'с детьми'], ['сын', 'с сыном'], ['доч', 'с дочкой']
  ];
  const ALONE = ['один ', 'одна ', 'одной', 'одному', 'в одиночестве', 'одинок', 'никого', 'сам с собой', 'сама с собой'];
  // деталь для названия: основа → фраза после «и»
  const DETAILS = [
    ['какао', 'какао'], ['кофе', 'кофе'], ['чай', 'чай'], ['торт', 'торт'], ['пицц', 'пицца'], ['пельмен', 'пельмени'], ['мороженое', 'мороженое'], ['морожен', 'мороженое'],
    ['книг', 'книги'], ['гитар', 'гитара'], ['костёр', 'костёр'], ['костер', 'костёр'], ['фонар', 'фонари'], ['дожд', 'дождь'], ['ливн', 'ливень'], ['первый снег', 'первый снег'],
    ['звёзд', 'звёзды'], ['звезд', 'звёзды'], ['закат', 'закат'], ['свеч', 'свечи'], ['плед', 'плед'], ['письм', 'письма'], ['шарик', 'шарики'], ['цветы', 'цветы'], ['цветов', 'цветы'],
    ['песн', 'песни'], ['арбуз', 'арбуз'], ['волн', 'волны'], ['ракушк', 'ракушки'], ['листь', 'жёлтые листья'], ['туман', 'туман'], ['снег', 'снег'], ['чемодан', 'чемоданы']
  ];
  const EVENTS = [
    ['сдач', 'перед сдачей'], ['дедлайн', 'перед дедлайном'], ['экзамен', 'перед экзаменом'], ['день рожд', 'в день рождения'], ['свадьб', 'на свадьбе'],
    ['выпускн', 'на выпускном'], ['концерт', 'после концерта'], ['прощ', 'и прощание'], ['встреч', 'и долгожданная встреча'], ['переезд', 'перед переездом'], ['защит', 'перед защитой']
  ];
  const WEATHER = [['rain', ['дожд', 'ливн', 'морос', 'лужи', 'промок', 'зонт']], ['snow', ['снег', 'снеж', 'метел', 'вьюг']], ['sun', ['солн', 'ясно', 'жарк', 'зной']],
    ['cold', ['холод', 'мороз', 'зябк', 'продрог']], ['wind', ['ветер', 'ветрен', 'ветр']], ['fog', ['туман', 'дымк']]];
  const SENSES = [['запах', 'smell'], ['пахл', 'smell'], ['аромат', 'smell'], ['звук', 'sound'], ['шум', 'sound'], ['тишин', 'sound'], ['свет', 'light'], ['свеч', 'light'], ['вкус', 'taste'], ['обня', 'touch'], ['тепл', 'touch']];

  function norm(s) { return ' ' + String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[«»"“”„.,!?;:()\-—–]/g, ' ').replace(/\s+/g, ' ') + ' '; }
  function normE(s) { return String(s).toLowerCase().replace(/ё/g, 'е'); }
  function hits(text, list) {
    const found = [];
    for (const st of list) {
      const s = normE(st);
      const needle = s.endsWith(' ') ? ' ' + s : ' ' + s;
      if (text.includes(needle)) found.push(st.trim());
    }
    return found;
  }
  function firstGroup(text, groups) {
    let best = null, bestPos = Infinity;
    for (const [key, stems] of groups) for (const st of stems) {
      const i = text.indexOf(' ' + normE(st));
      if (i >= 0 && i < bestPos) { bestPos = i; best = key; }
    }
    return best;
  }
  function analyzeText(raw) {
    const t = norm(raw);
    const words = t.trim().split(' ').filter(Boolean);
    const pos = hits(t, L.pos), neg = hits(t, L.neg), hi = hits(t, L.hi), lo = hits(t, L.lo), nost = hits(t, L.nost);
    // отрицание «не» перед позитивом
    const negated = (t.match(/ не (хорош|рад|весел|спокой|приятн)/g) || []).length;
    const P = pos.length - negated, N = neg.length + negated;
    const valence = clamp((P - N) / (P + N + 1.5), -1, 1);
    const excl = (String(raw).match(/!/g) || []).length;
    const sentences = String(raw).split(/[.!?…]+/).filter(s => s.trim().length > 2);
    const avgLen = words.length / Math.max(1, sentences.length);
    let arousal = 0.5 + (hi.length - lo.length) / (hi.length + lo.length + 2) * 0.75 + Math.min(excl, 4) * 0.04 - (avgLen > 16 ? 0.06 : 0);
    arousal = clamp(arousal);
    const season = firstGroup(t, SEASON);
    const time = firstGroup(t, TIME);
    let place = null, pi = Infinity;
    for (const p of PLACES) { const i = t.indexOf(' ' + p[0]); if (i >= 0 && i < pi) { pi = i; place = { nom: p[1], g: p[2], prep: p[3], kind: p[4] }; } }
    const people = []; for (const [st, ph] of PEOPLE) if (t.includes(' ' + st) && !people.includes(ph)) people.push(ph);
    const alone = ALONE.some(a => t.includes(' ' + normE(a)));
    let detail = null; for (const [st, ph] of DETAILS) { if (t.includes(' ' + normE(st))) { detail = ph; break; } } // приоритет — порядок списка: предметы важнее сезонных примет
    let event = null; for (const [st, ph] of EVENTS) if (t.includes(' ' + st)) { event = ph; break; }
    const weather = WEATHER.filter(([k, st]) => st.some(s => t.includes(' ' + normE(s)))).map(([k]) => k);
    const senses = [...new Set(SENSES.filter(([s]) => t.includes(' ' + s)).map(([, k]) => k))];
    // ключевая фраза для подписи — самое «чувственное» предложение (с наибольшим числом попаданий лексикона)
    let caption = sentences[0] || String(raw).slice(0, 120), best = -1;
    for (const s of sentences) {
      const ns = norm(s);
      const sc = hits(ns, L.pos).length + hits(ns, L.neg).length + hits(ns, L.lo).length * 0.5 + SENSES.filter(([x]) => ns.includes(' ' + x)).length + Math.min(s.trim().split(' ').length, 14) * 0.04;
      if (sc > best && s.trim().split(' ').length <= 22) { best = sc; caption = s; }
    }
    caption = caption.trim().replace(/\s+/g, ' ');
    if (caption.length > 110) caption = caption.slice(0, 107).replace(/\s\S*$/, '') + '…';
    return { valence, arousal, season, time, place, people, alone, detail, event, weather, senses, nostalgia: nost.length,
      found: { pos, neg, hi, lo, nost }, caption, words: words.length };
  }

  /* ---------------- ФОТО ---------------- */
  function rgb2hsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2;
    if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
    return [h, s, l];
  }
  function analyzeImage(img) {
    const S = 56, c = document.createElement('canvas'); c.width = S; c.height = S;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(img, 0, 0, S, S);
    const d = x.getImageData(0, 0, S, S).data, px = [];
    let lum = 0, lum2 = 0, sat = 0, warm = 0;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2]; px.push([r, g, b]);
      const l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; lum += l; lum2 += l * l;
      sat += rgb2hsl(r, g, b)[1]; warm += (r - b) / 255;
    }
    const n = px.length; lum /= n; sat /= n; warm /= n;
    const contrast = Math.sqrt(Math.max(0, lum2 / n - lum * lum));
    // k-means k=5
    const K = 5; let cent = [];
    for (let k = 0; k < K; k++) cent.push(px[Math.floor((k + 0.5) / K * n)].slice());
    let assign = new Array(n).fill(0);
    for (let it = 0; it < 9; it++) {
      for (let i = 0; i < n; i++) { let bi = 0, bd = 1e9; for (let k = 0; k < K; k++) { const a = px[i], c2 = cent[k]; const dd = (a[0] - c2[0]) ** 2 + (a[1] - c2[1]) ** 2 + (a[2] - c2[2]) ** 2; if (dd < bd) { bd = dd; bi = k; } } assign[i] = bi; }
      const sum = Array.from({ length: K }, () => [0, 0, 0, 0]);
      for (let i = 0; i < n; i++) { const s = sum[assign[i]]; s[0] += px[i][0]; s[1] += px[i][1]; s[2] += px[i][2]; s[3]++; }
      cent = sum.map((s, k) => s[3] ? [s[0] / s[3], s[1] / s[3], s[2] / s[3]] : cent[k]);
    }
    const counts = new Array(K).fill(0); assign.forEach(a => counts[a]++);
    const colors = cent.map((c2, k) => ({ rgb: c2.map(Math.round), share: counts[k] / n, hsl: rgb2hsl(...c2) })).sort((a, b) => b.share - a.share);
    return { lum, sat, warm, contrast, colors };
  }
  function mergePhotos(list) {
    if (!list.length) return { lum: 0.5, sat: 0.3, warm: 0, contrast: 0.2, colors: [], count: 0 };
    const avg = k => list.reduce((s, p) => s + p[k], 0) / list.length;
    const all = list.flatMap(p => p.colors.map(c => ({ ...c, share: c.share / list.length })));
    // объединяем близкие цвета
    const merged = [];
    for (const c of all.sort((a, b) => b.share - a.share)) {
      const m = merged.find(o => Math.hypot(o.rgb[0] - c.rgb[0], o.rgb[1] - c.rgb[1], o.rgb[2] - c.rgb[2]) < 38);
      if (m) m.share += c.share; else merged.push({ ...c });
    }
    return { lum: avg('lum'), sat: avg('sat'), warm: avg('warm'), contrast: avg('contrast'), colors: merged.slice(0, 6), count: list.length };
  }

  /* ---------------- МУЗЫКА ---------------- */
  const GENRES = [
    [['джаз', 'jazz', 'свинг', 'swing', 'sinatra', 'синатр', 'блюз', 'blues', 'бибоп'], { label: 'джаз/свинг', warmth: 0.6, energy: 0.35, val: 0.25, era: 1955, acoustic: 1 }],
    [['боссa', 'bossa', 'босса'], { label: 'босса-нова', warmth: 0.6, energy: 0.4, val: 0.35, era: 1965, acoustic: 1 }],
    [['класс', 'classic', 'фортепиан', 'piano', 'пиано', 'оркестр', 'шопен', 'chopin', 'дебюсси', 'debussy', 'бах', 'вивальди'], { label: 'классика', warmth: 0.15, energy: 0.25, val: 0.05, era: 1880, acoustic: 1 }],
    [['электрон', 'electro', 'techno', 'техно', 'house', 'хаус', 'edm', 'synth', 'синт', 'dnb', 'drum', 'trance', 'транс', 'idm'], { label: 'электроника', warmth: -0.6, energy: 0.8, val: 0, era: 2015, synthetic: 1 }],
    [['ambient', 'эмбиент', 'амбиент', 'drone'], { label: 'эмбиент', warmth: -0.2, energy: 0.1, val: 0, era: 2010, synthetic: 1 }],
    [['рок', 'rock', 'punk', 'панк', 'metal', 'метал', 'grunge', 'гранж'], { label: 'рок', warmth: 0, energy: 0.85, val: 0, era: 1995 }],
    [['lofi', 'lo-fi', 'лоуфай', 'лофай'], { label: 'lo-fi', warmth: 0.35, energy: 0.25, val: 0.1, era: 2018, grain: 1 }],
    [['hip', 'хип', 'рэп', 'rap', 'trap', 'трэп'], { label: 'хип-хоп', warmth: 0, energy: 0.7, val: 0.05, era: 2015 }],
    [['фолк', 'folk', 'домбр', 'кюй', 'күй', 'этно', 'ethno', 'народн'], { label: 'фолк/этно', warmth: 0.5, energy: 0.45, val: 0.15, era: 1975, acoustic: 1 }],
    [['соул', 'soul', 'r&b', 'rnb', 'фанк', 'funk', 'диско', 'disco'], { label: 'соул/фанк', warmth: 0.5, energy: 0.6, val: 0.35, era: 1978 }],
    [['инди', 'indie', 'альтерн'], { label: 'инди', warmth: 0.1, energy: 0.5, val: 0.05, era: 2012 }],
    [['шансон', 'романс', 'ретро', 'retro', 'эстрад', 'баллад', 'ballad'], { label: 'ретро-баллада', warmth: 0.35, energy: 0.3, val: -0.1, era: 1972, acoustic: 1 }],
    [['поп', 'pop', 'k-pop', 'q-pop', 'кпоп'], { label: 'поп', warmth: 0.2, energy: 0.65, val: 0.35, era: 2018 }]
  ];
  function genreFromMeta(meta) {
    const s = normE([meta.genre, meta.artist, meta.title].filter(Boolean).join(' '));
    for (const [keys, g] of GENRES) if (keys.some(k => s.includes(k))) return { ...g };
    return null;
  }
  function serviceFromUrl(u) {
    if (!u) return null;
    const s = u.toLowerCase();
    if (s.includes('spotify')) return 'Spotify'; if (s.includes('youtu')) return 'YouTube'; if (s.includes('music.yandex')) return 'Яндекс Музыка';
    if (s.includes('music.apple') || s.includes('itunes')) return 'Apple Music'; if (s.includes('soundcloud')) return 'SoundCloud'; if (s.includes('vk.com') || s.includes('vk.ru')) return 'VK Музыка';
    return 'ссылка';
  }

  // радикс-2 FFT (на месте)
  function fft(re, im) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
      for (let i = 0; i < n; i += len) { let cr = 1, ci = 0;
        for (let j = 0; j < len / 2; j++) { const a = i + j, b = a + len / 2; const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
          re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti; const ncr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = ncr; } }
    }
  }
  const KMAJ = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
  const KMIN = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
  const NOTES = ['до', 'до♯', 'ре', 'ре♯', 'ми', 'фа', 'фа♯', 'соль', 'соль♯', 'ля', 'ля♯', 'си'];
  function corr(a, b) { const ma = a.reduce((s, x) => s + x, 0) / 12, mb = b.reduce((s, x) => s + x, 0) / 12; let n = 0, da = 0, db = 0;
    for (let i = 0; i < 12; i++) { n += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; } return n / Math.sqrt(da * db + 1e-9); }

  async function analyzeAudio(arrayBuffer) {
    const AC = G.OfflineAudioContext || G.webkitOfflineAudioContext;
    const ctx = new AC(1, 44100, 44100);
    const buf = await ctx.decodeAudioData(arrayBuffer.slice(0));
    const sr0 = buf.sampleRate, ch0 = buf.getChannelData(0), ch1 = buf.numberOfChannels > 1 ? buf.getChannelData(1) : null;
    const dec = Math.max(1, Math.round(sr0 / 11025)), sr = sr0 / dec;
    const dur = buf.duration, start = dur > 60 ? Math.floor(dur * 0.15 * sr0) : 0, len = Math.min(Math.floor(45 * sr0), ch0.length - start);
    const N = Math.floor(len / dec), x = new Float32Array(N);
    for (let i = 0; i < N; i++) { const k = start + i * dec; x[i] = ch1 ? (ch0[k] + ch1[k]) * 0.5 : ch0[k]; }
    const F = 1024, H = 512, frames = Math.max(1, Math.floor((N - F) / H));
    const win = new Float32Array(F); for (let i = 0; i < F; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / F);
    const rms = new Float32Array(frames), flux = new Float32Array(frames), chroma = new Array(12).fill(0), bass = new Array(12).fill(0);
    let prev = new Float32Array(F / 2), centSum = 0, centW = 0;
    const re = new Float32Array(F), im = new Float32Array(F);
    for (let f = 0; f < frames; f++) {
      let e = 0;
      for (let i = 0; i < F; i++) { const v = x[f * H + i] || 0; e += v * v; re[i] = v * win[i]; im[i] = 0; }
      rms[f] = Math.sqrt(e / F);
      fft(re, im);
      let fl = 0;
      for (let k = 1; k < F / 2; k++) {
        const m = Math.sqrt(re[k] * re[k] + im[k] * im[k]);
        const dd = m - prev[k]; if (dd > 0) fl += dd; prev[k] = m;
        const hz = k * sr / F; centSum += hz * m; centW += m;
        if (hz > 180 && hz < 2100) { const midi = 69 + 12 * Math.log2(hz / 440), pc = ((Math.round(midi) % 12) + 12) % 12; chroma[pc] += m * m; if (hz < 450) bass[pc] += m * m; }
      }
      flux[f] = fl;
    }
    // темп: автокорреляция огибающей атак
    const fps = sr / H; const env = new Float32Array(frames);
    let mean = 0; for (let i = 0; i < frames; i++) mean += flux[i]; mean /= frames;
    for (let i = 0; i < frames; i++) env[i] = Math.max(0, flux[i] - mean);
    const onsetDensityPre = () => { let c = 0; for (let i = 1; i < frames - 1; i++) if (env[i] > env[i - 1] && env[i] > env[i + 1] && env[i] > mean * 1.5) c++; return c / (frames / fps); };
    let rmsM0 = 0; for (const v of rms) rmsM0 += v; rmsM0 /= frames;
    const acf = bpm => { const lag = fps * 60 / bpm, l0 = Math.floor(lag), fr = lag - l0; let s = 0;
      for (let i = 0; i + l0 + 1 < frames; i++) s += env[i] * (env[i + l0] * (1 - fr) + env[i + l0 + 1] * fr); return s; };
    let bestBpm = 100, bestScore = -1;
    for (let bpm = 60; bpm <= 180; bpm += 0.5) {
      const w = Math.exp(-0.5 * (Math.log2(bpm / 105) / 0.9) ** 2), s = acf(bpm) * w;
      if (s > bestScore) { bestScore = s; bestBpm = bpm; }
    }
    // октавная коррекция: если половинный темп почти так же убедителен — берём его (баллады, вальсы)
        if (bestBpm >= 120 && acf(bestBpm / 2) > 0.95 * acf(bestBpm)) bestBpm /= 2;
    let rmsMean = 0; for (const v of rms) rmsMean += v; rmsMean /= frames;
    let onsetDensity = 0; for (let i = 1; i < frames - 1; i++) if (env[i] > env[i - 1] && env[i] > env[i + 1] && env[i] > mean * 1.5) onsetDensity++;
    onsetDensity = onsetDensity / (frames / fps);
    // тональность
    let best = { r: -2 }; const mx = Math.max(...chroma) || 1, mb = Math.max(...bass) || 1; const cn = chroma.map((v, i) => v / mx + 0.8 * bass[i] / mb);
    for (let k = 0; k < 12; k++) {
      const rot = i => cn[(i + k) % 12];
      const arr = Array.from({ length: 12 }, (_, i) => rot(i));
      const rM = corr(arr, KMAJ), rm = corr(arr, KMIN);
      if (rM > best.r) best = { r: rM, key: k, mode: 'major', other: rm };
      if (rm > best.r) best = { r: rm, key: k, mode: 'minor', other: rM };
    }
    const centroid = centW ? centSum / centW : 1500;
    // огибающая громкости для «музыкальной полосы» (64 точки по всему треку)
    const envPts = 64, curve = [];
    const step = Math.max(1, Math.floor(ch0.length / envPts));
    for (let p = 0; p < envPts; p++) { let s = 0, c = 0; for (let i = p * step; i < Math.min(ch0.length, (p + 1) * step); i += 64) { s += ch0[i] * ch0[i]; c++; } curve.push(Math.sqrt(s / Math.max(1, c))); }
    const cm = Math.max(...curve) || 1;
    const freeTempo = onsetDensity < 1.2;
    if (freeTempo) bestBpm = Math.round(58 + clamp(rmsMean / 0.18) * 30);
    const energy = clamp(0.55 * clamp(rmsMean / 0.18) + 0.45 * clamp(onsetDensity / 6));
    return {
      source: 'audio', duration: dur, bpm: Math.round(bestBpm), freeTempo, energy, brightness: clamp((centroid - 700) / 2600),
      mode: best.mode, key: NOTES[best.key] + (best.mode === 'major' ? ' мажор' : ' минор'), modeConfidence: clamp((best.r - best.other) * 4),
      curve: curve.map(v => v / cm)
    };
  }
  function describedMusic(meta) {
    const tempo = { slow: 70, mid: 100, fast: 128 }[meta.tempo || 'mid'];
    const mode = meta.mood === 'dark' ? 'minor' : meta.mood === 'light' ? 'major' : null;
    const g = genreFromMeta(meta);
    const energy = clamp((g ? g.energy : 0.5) * 0.6 + (tempo - 60) / 110 * 0.4);
    const curve = Array.from({ length: 64 }, (_, i) => 0.45 + 0.4 * Math.abs(Math.sin(i * 0.37 + tempo * 0.01)) * (0.5 + energy * 0.5));
    return { source: 'description', bpm: tempo, energy, brightness: g && g.synthetic ? 0.7 : 0.4, mode: mode || 'major', key: mode ? (mode === 'major' ? 'светлый лад' : 'минорный лад') : 'лад не указан', modeConfidence: mode ? 0.6 : 0.15, curve };
  }
  function finalizeMusic(a, meta) {
    const g = genreFromMeta(meta || {});
    const year = parseInt(meta && meta.year, 10);
    const era = !isNaN(year) && year > 1850 && year < 2100 ? year : (g ? g.era : 2015);
    return { ...a, genre: g ? g.label : (meta && meta.genre) || '—', genreTraits: g || {}, era, eraFromYear: !isNaN(year) && year > 1850 };
  }

  G.IZ = G.IZ || {};
  Object.assign(G.IZ, { analyzeText, analyzeImage, mergePhotos, analyzeAudio, describedMusic, finalizeMusic, genreFromMeta, serviceFromUrl, rgb2hsl, clamp });
})(window);
