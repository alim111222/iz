/* system.js — визуальная система «Із»: правила, по которым настроение дня превращается в форму.
 * Вход: анализ текста, фото, музыки. Выход: «паспорт дня» — координаты настроения, приём, палитра,
 * ритм, фактура, типографика, голос, название папки + человекочитаемое объяснение каждого решения. */
(function (G) {
  'use strict';
  const { clamp, rgb2hsl } = G.IZ;
  const gauss = (x, m, s) => Math.exp(-0.5 * ((x - m) / s) ** 2);

  // Художественные приёмы системы (переменный слой). Постоянный слой — сетка, шрифты, «компас дня», полоса музыки.
  const TECH = {
    monet: { name: 'Свет Моне', ref: 'Клод Моне, импрессионизм', what: 'фото переписывается короткими мазками, свет мягко дрожит, кадры растворяются друг в друге',
      why: 'тёплое спокойное ощущение — это не предметы, а свет и воздух между ними; мазок убирает резкость и оставляет впечатление' },
    kandinsky: { name: 'Геометрия Кандинского', ref: 'Василий Кандинский, «Композиция VIII», конструктивизм', what: 'фото режется жёсткой сеткой, поверх — круги, линии и углы, которые бьют в долю',
      why: 'напряжение и скорость передаются конфликтом форм и острыми углами; ритм нарезки совпадает с темпом песни' },
    matisse: { name: 'Вырезки Матисса', ref: 'Анри Матисс, поздние гуаши-вырезки', what: 'фото вставлено в «вырезанные» формы, вокруг — плоские яркие листья и водоросли, всё покачивается',
      why: 'радость и общность — это открытый цвет и танцующий контур без теней; формы пружинят в такт' },
    ma: { name: 'Ма — пустота', ref: 'японская минималистичная графика, «ма» (間), каллиграфический энсо', what: 'одно небольшое фото, много пустой бумаги, медленно рисуется круг энсо, красная печать',
      why: 'тишина и одиночество передаются тем, чего нет: пустое пространство даёт дню «звучать» самому' },
    film: { name: 'Плёнка', ref: 'аналоговая фотография, Kodak Gold / Ilford, фото-хроника 70-х', what: 'выцветшие цвета, зерно, засветки, перфорация и рыжий штамп даты',
      why: 'ностальгия и светлая печаль — это ощущение «уже прошлого»; плёночная фактура сразу отодвигает день во времени' }
  };

  function hsl2rgb(h, s, l) {
    h = ((h % 360) + 360) % 360 / 360;
    if (s === 0) return [l, l, l].map(v => Math.round(v * 255));
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const f = t => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
    return [f(h + 1 / 3), f(h), f(h - 1 / 3)].map(v => Math.round(v * 255));
  }
  const hex = c => '#' + c.map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');

  const SEASON_RU = { autumn: 'осень', winter: 'зима', spring: 'весна', summer: 'лето' };
  const TIME_RU = { morning: 'утро', day: 'день', evening: 'вечер', night: 'ночь' };
  const SEASON_ADJ = { autumn: ['Осенний', 'Осенняя', 'Осеннее', 'Осенние'], winter: ['Зимний', 'Зимняя', 'Зимнее', 'Зимние'],
    spring: ['Весенний', 'Весенняя', 'Весеннее', 'Весенние'], summer: ['Летний', 'Летняя', 'Летнее', 'Летние'] };
  const MOOD_ADJ = { calm: ['Тихий', 'Тихая', 'Тихое', 'Тихие'], joy: ['Звонкий', 'Звонкая', 'Звонкое', 'Звонкие'], tense: ['Длинный', 'Длинная', 'Длинное', 'Длинные'],
    sad: ['Серый', 'Серая', 'Серое', 'Серые'], warm: ['Тёплый', 'Тёплая', 'Тёплое', 'Тёплые'] };
  const GI = { m: 0, f: 1, n: 2, p: 3 };
  const TIME_NOUN = { morning: ['Утро', 'n'], day: ['День', 'm'], evening: ['Вечер', 'm'], night: ['Ночь', 'f'] };

  function moodWord(V, A) {
    if (A > 0.62 && V < 0.15) return 'tense';
    if (V < -0.2) return 'sad';
    if (A > 0.58 && V >= 0.15) return 'joy';
    if (V > 0.25 && A < 0.5) return 'warm';
    return 'calm';
  }

  /* Название папки дня: 3–7 слов, именная фраза без глаголов, один тон для всего дневника. */
  function makeTitle(tx, V, A) {
    const mw = moodWord(V, A);
    const lowerFirst = s => s.charAt(0).toLowerCase() + s.slice(1);
    let parts;
    const pl = tx.place;
    const tail = tx.event ? tx.event : tx.detail ? 'и ' + tx.detail : tx.people[0] ? tx.people[0] : null;
    if (tx.event && /^(перед|после|в |на )/.test(tx.event) && tx.time && pl) {
      // «Ночь в офисе перед сдачей»
      parts = [TIME_NOUN[tx.time][0], pl.prep, tx.event];
    } else if (pl && pl.kind !== 'home' && tail) {
      // «Осенний парк и какао»
      const adj = tx.season ? SEASON_ADJ[tx.season][GI[pl.g]] : MOOD_ADJ[mw][GI[pl.g]];
      parts = [adj, lowerFirst(pl.nom), tail];
      if (tx.people[0] && tail !== tx.people[0] && parts.join(' ').split(' ').length <= 4) parts.push(tx.people[0]);
    } else if (pl && pl.kind === 'home') {
      // «Зимний вечер дома и пельмени»
      const tn = TIME_NOUN[tx.time || 'evening'];
      const adj = tx.season ? SEASON_ADJ[tx.season][GI[tn[1]]] : MOOD_ADJ[mw][GI[tn[1]]];
      parts = [adj, lowerFirst(tn[0]), pl.prep];
      if (tail) parts.push(tail);
    } else if (pl) {
      const adj = tx.season ? SEASON_ADJ[tx.season][GI[pl.g]] : MOOD_ADJ[mw][GI[pl.g]];
      const tn = tx.time ? { morning: 'утром', day: 'днём', evening: 'вечером', night: 'ночью' }[tx.time] : null;
      parts = [adj, lowerFirst(pl.nom), tn || (tx.people[0] || 'и тишина')];
    } else {
      const tn = TIME_NOUN[tx.time || 'day'];
      const adj = MOOD_ADJ[mw][GI[tn[1]]];
      parts = [adj, lowerFirst(tn[0]), tail || (tx.season ? { autumn: 'в листопад', winter: 'в снегопад', spring: 'в оттепель', summer: 'в жару' }[tx.season] : 'наедине с собой')];
    }
    let title = parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    let w = title.split(' ');
    if (w.length > 7) title = w.slice(0, 7).join(' ');
    if (w.length < 3) title += ' ' + ({ calm: 'и тишина', joy: 'и смех', tense: 'без сна', sad: 'и дождь', warm: 'и тепло' }[mw]);
    return title.charAt(0).toUpperCase() + title.slice(1);
  }

  function shiftColor(rgb, { hueTo, hueAmt, satMul, light }) {
    let [h, s, l] = rgb2hsl(...rgb);
    if (hueTo != null) { let d = ((hueTo - h + 540) % 360) - 180; h += d * hueAmt; }
    s = clamp(s * satMul, 0, 1); l = clamp(l + light, 0.04, 0.96);
    return hsl2rgb(h, s, l);
  }

  /* Главная функция: строит паспорт дня. */
  function buildPassport(tx, ph, mu, meta = {}) {
    const why = [];
    // 1. Координаты настроения (валентность V ∈ [-1;1], энергия A ∈ [0;1])
    const mVal = (mu.mode === 'major' ? 0.4 : -0.4) * (0.35 + 0.65 * mu.modeConfidence) + (mu.genreTraits.val || 0) * 0.6;
    const mAr = clamp(clamp((mu.bpm - 60) / 110) * 0.5 + mu.energy * 0.5);
    const pVal = ph.count ? (ph.lum - 0.5) * 0.6 + ph.sat * 0.3 + ph.warm * 0.4 : 0;
    const pAr = ph.count ? clamp(ph.sat * 0.6 + ph.contrast * 1.2) : 0.4;
    const V = clamp(0.55 * tx.valence + 0.27 * mVal + 0.18 * pVal, -1, 1);
    const A = clamp(0.42 * tx.arousal + 0.43 * mAr + 0.15 * pAr);
    why.push({ k: 'Настроение', v: `V=${V.toFixed(2)} (светлое ↔ тёмное), A=${A.toFixed(2)} (энергия). Текст даёт 55% валентности, песня 27%, фото 18%; энергия — на 43% из темпа и плотности песни.` });

    // 2. Тепло/холод
    const seasonW = { autumn: 0.5, summer: 0.4, spring: 0.1, winter: -0.45 }[tx.season] || 0;
    const timeW = { evening: 0.3, morning: 0.1, day: 0, night: -0.4 }[tx.time] || 0;
    const W = clamp(0.35 * (ph.count ? ph.warm * 2.2 : 0) + 0.25 * seasonW + 0.2 * timeW + 0.3 * (mu.genreTraits.warmth || 0) * 1.4 - (mu.genreTraits.synthetic ? 0.15 : 0), -1, 1);
    // 3. Возраст звука и ностальгия
    const eraF = clamp((2015 - mu.era) / 60);
    const nost = clamp(tx.nostalgia * 0.25 + eraF * 0.6 + (tx.found.neg.some(w => /прощ|последн|уезжа|уехал/.test(w)) ? 0.25 : 0));
    const social = tx.people.length > 0, alone = tx.alone || (!social && A < 0.4);
    const nature = tx.place && tx.place.kind === 'nature', urban = tx.place && (tx.place.kind === 'urban' || tx.place.kind === 'transit');

    // 4. Выбор приёма — каждый приём получает балл, побеждает лучший; второй даёт акцент
    const sc = {
      monet: gauss(V, 0.55, 0.45) * gauss(A, 0.3, 0.24) + (nature ? 0.18 : 0) + (W > 0.15 ? 0.12 : 0) + (tx.senses.includes('light') ? 0.06 : 0),
      kandinsky: gauss(A, 0.88, 0.24) * (1 - 0.6 * Math.max(V, 0)) + (mu.genreTraits.synthetic ? 0.2 : 0) + (urban ? 0.08 : 0) + (tx.time === 'night' ? 0.08 : 0),
      matisse: gauss(V, 0.75, 0.38) * gauss(A, 0.72, 0.22) + (social && tx.people.length > 0 && /друз|семь|команд|дет/.test(tx.people.join()) ? 0.15 : 0) + (tx.season === 'summer' ? 0.1 : 0),
      ma: gauss(A, 0.12, 0.22) * gauss(V, 0.0, 0.5) + (alone ? 0.25 : 0) + (tx.season === 'winter' || tx.time === 'morning' ? 0.08 : 0) + (mu.genreTraits.label === 'эмбиент' ? 0.15 : 0),
      film: gauss(V, -0.45, 0.45) * gauss(A, 0.35, 0.3) + nost * 0.45 + (tx.weather.includes('rain') ? 0.08 : 0)
    };
    const ranked = Object.entries(sc).sort((a, b) => b[1] - a[1]);
    if (meta.forceTech && TECH[meta.forceTech]) { const i = ranked.findIndex(r => r[0] === meta.forceTech); ranked.unshift(ranked.splice(i, 1)[0]); }
    const tech = ranked[0][0], accent = ranked[1][1] > ranked[0][1] * 0.45 && ranked[1][1] > 0.4 ? ranked[1][0] : null;
    why.push({ k: 'Приём', v: `${TECH[tech].name} (${TECH[tech].ref}). ${TECH[tech].why}.` + (accent ? ` Акцент: ${TECH[accent].name.toLowerCase()} — второе по силе ощущение дня.` : '') });
    const reasons = [];
    if (nature && tech === 'monet') reasons.push('день прошёл на природе (' + tx.place.nom + ')');
    if (mu.genreTraits.synthetic && tech === 'kandinsky') reasons.push('синтетический звук (' + mu.genre + ')');
    if (alone && tech === 'ma') reasons.push('в записи нет других людей');
    if (nost > 0.35 && tech === 'film') reasons.push(`ностальгия: ${tx.nostalgia ? 'слова о прошлом в тексте, ' : ''}${mu.era < 2000 ? (mu.eraFromYear ? 'песня ' + mu.era + ' года' : 'ретро-звучание (' + mu.genre + ')') : 'интонация песни'}`.replace(/, $/, ''));
    if (social && tech === 'matisse') reasons.push('рядом были люди: ' + tx.people.join(', '));
    if (reasons.length) why.push({ k: 'Почему именно он', v: reasons.join('; ') + '.' });

    // 5. Палитра: цвета фото, сдвинутые настроением
    const base = (ph.colors.length ? ph.colors : [{ rgb: [200, 180, 150] }, { rgb: [90, 80, 70] }, { rgb: [160, 140, 120] }]).map(c => c.rgb);
    const hueTo = W >= 0 ? 32 : 212, hueAmt = Math.abs(W) * 0.32 + (tech === 'film' ? 0.15 : 0);
    const satMul = { monet: 1.05, kandinsky: 1.25, matisse: 1.5, ma: 0.45, film: 0.7 }[tech] * (0.75 + 0.5 * A);
    const light = V * 0.06 + (tech === 'ma' ? 0.05 : 0);
    const palette = base.map(c => hex(shiftColor(c, { hueTo, hueAmt, satMul, light })));
    // акцентный цвет: самый насыщенный, при радости — дополнительный
    let accentCol = palette.slice().sort((a, b) => rgb2hsl(...hexRgb(b))[1] - rgb2hsl(...hexRgb(a))[1])[0];
    // у Кандинского акцент — контрастный цвет к доминанте (его «звучащие» жёлтый/красный на синем)
    const h0 = rgb2hsl(...hexRgb(palette[0]))[0];
    const contra = [hex(hsl2rgb(h0 + 180, 0.8, 0.56)), hex(hsl2rgb(h0 + 145, 0.85, 0.6)), hex(hsl2rgb(h0 + 205, 0.7, 0.5))];
    if (tech === 'kandinsky') accentCol = contra[0];
    if (tech === 'ma') accentCol = '#b8322a';
    if (tech === 'film') accentCol = '#e0782a';
    // бумага (постоянный элемент, но слегка тонируется палитрой)
    const paper = hex(shiftColor(hexRgb(palette[0]), { hueTo: W >= 0 ? 40 : 215, hueAmt: 0.6, satMul: 0.18, light: 0 }).map((v, i) => v * 0.12 + [244, 239, 230][i] * 0.88));
    const ink = tech === 'kandinsky' && V < 0 ? '#14161c' : '#1d1b19';
    why.push({ k: 'Палитра', v: `взята из ${ph.count} фото (${ph.colors.slice(0, 3).map(c => hex(c.rgb)).join(', ')}), сдвинута к ${W >= 0 ? 'тёплому охристому' : 'холодному сине-серому'} на ${Math.round(hueAmt * 100)}% (тепло дня W=${W.toFixed(2)}: сезон, время суток, фото и жанр песни), насыщенность ×${satMul.toFixed(2)}.` });

    // 6. Ритм и движение — из песни
    const beat = 60 / mu.bpm;
    const beatsPerScene = A > 0.65 ? 8 : A > 0.4 ? 12 : 16;
    const sceneDur = clamp(beat * beatsPerScene, 3, 11);
    const fade = tech === 'kandinsky' ? 0.08 : clamp((1 - A) * 2.2, 0.3, 2.4);
    const air = clamp(1 - A * 0.75 + (tech === 'ma' ? 0.3 : 0), 0.1, 1);
    const duration = clamp(Math.max(ph.count, 1) * sceneDur, 15, 45);
    why.push({ k: 'Ритм', v: `${mu.bpm} BPM (${mu.source === 'audio' ? 'аудиоанализ файла' : 'по описанию песни'}) → смена кадра каждые ${beatsPerScene} долей (${sceneDur.toFixed(1)} c), переход ${fade < 0.2 ? 'резкий, в долю' : fade.toFixed(1) + ' c растворения'}. ${A < 0.45 ? 'Медленная песня даёт больше воздуха: поля ' + Math.round(air * 100) + '%.' : 'Энергичная песня сжимает поля до ' + Math.round(air * 100) + '%.'}` });

    // 7. Фактура
    const grain = clamp(0.04 + eraF * 0.35 + (tech === 'film' ? 0.3 : 0) + (mu.genreTraits.grain ? 0.15 : 0), 0, 0.7);
    why.push({ k: 'Фактура', v: `зерно ${Math.round(grain * 100)}%: ${mu.era < 1995 ? (mu.eraFromYear ? 'песня ' + mu.era + ' года' : 'звучание жанра «' + mu.genre + '» (условно ' + Math.floor(mu.era / 10) * 10 + '-е)') + ' «состаривает» кадр' : 'современный звук — почти чистый кадр'}${tech === 'film' ? ', плюс плёночный приём' : ''}. Лад: ${mu.key}${mu.mode === 'minor' ? ' — приглушённые тени' : ' — открытый свет'}.` });

    // 8. Типографика (постоянные шрифты, переменное начертание)
    const type = {
      title: A > 0.66 ? 'grotesk' : 'serif',
      caption: V > 0.15 && A < 0.75 ? 'hand' : A > 0.66 ? 'mono' : 'serifItalic'
    };
    why.push({ k: 'Типографика', v: `название — ${type.title === 'serif' ? 'антиква (спокойный день)' : 'гротеск, плотный (энергичный день)'}; подпись — ${{ hand: 'рукописная (тёплый, личный день)', mono: 'моноширинная (сжатый, рабочий ритм)', serifItalic: 'курсив (задумчивый день)' }[type.caption]}.` });

    // 9. Голос озвучки
    let voice;
    if (tech === 'kandinsky' || (A > 0.65 && V < 0.2)) voice = { id: 'glassy', label: 'чёткий, собранный', rate: 1.08 };
    else if (A > 0.6) voice = { id: 'buttery', label: 'живой, быстрый', rate: 1.15 };
    else if (V < -0.15 || tech === 'film') voice = { id: 'rounded', label: 'мягкий, негромкий', rate: 0.86 };
    else if (tech === 'ma') voice = { id: 'airy', label: 'воздушный, медленный', rate: 0.8 };
    else voice = { id: 'rounded', label: 'тихий и тёплый', rate: 0.88 };
    voice.pitch = clamp(0.92 + V * 0.12 + (A - 0.5) * 0.1, 0.7, 1.2);
    why.push({ k: 'Голос', v: `${voice.label}: темп речи ×${voice.rate} (энергия дня ${A.toFixed(2)}), высота ×${voice.pitch.toFixed(2)} (валентность).` });

    const title = (meta.title && meta.title.trim()) || makeTitle(tx, V, A);
    why.push({ k: 'Название папки', v: `«${title}» — собрано из записи: ${[tx.season && 'сезон «' + SEASON_RU[tx.season] + '»', tx.time && 'время «' + TIME_RU[tx.time] + '»', tx.place && 'место «' + tx.place.nom + '»', tx.detail && 'деталь «' + tx.detail + '»', tx.event && 'событие «' + tx.event + '»', tx.people[0] && 'люди «' + tx.people.join(', ') + '»'].filter(Boolean).join(', ') || 'настроение дня'}.` });

    return { V, A, W, nost, tech, accent, scores: sc, palette, contra, accentCol, paper, ink, beat, sceneDur, fade, air, duration, grain, type, voice, title, why, mood: moodWord(V, A) };
  }
  function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }

  Object.assign(G.IZ, { TECH, buildPassport, makeTitle, hexRgb, hex, hsl2rgb, SEASON_RU, TIME_RU });
})(window);
