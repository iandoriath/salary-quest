/* ── Salary Quest ─────────────────────────────────────────────
   A salary negotiation trainer wearing a fantasy trench coat.
   Vanilla JS, no dependencies. Scene-based state machine.
──────────────────────────────────────────────────────────────── */

'use strict';

/* ── State ── */

const BAND = { low: 95000, high: 130000 };   // true market band for the role
const RIVAL_OFFER = 112000;                  // the Escape Scroll's number

let S = null;

function newState() {
  return {
    quest: 1,             // 1 = The Dragon's Hoard, 2 = The Raise
    ledger: false,        // Quest II: kept a Deeds Ledger (brag document)
    timing: null,         // Quest II: 'good' | 'bad'
    offer: 0,             // current base offer on the table
    initialOffer: 0,      // first number the Guildmaster put down
    rapport: 3,           // 0–5 hearts with the Guildmaster
    knowledge: false,     // consulted the sages (full market lore)
    partialKnowledge: false, // learned the band by asking their range
    scroll: false,        // holds a rival guild offer (BATNA)
    anchored: null,       // 'high' | 'low' | 'deflect' | 'asked'
    patienceWon: null,
    stance: null,         // 'diplomacy' | 'aggressive' | 'meek'
    explodingChoice: null,
    perks: [],            // [{icon, name, value, note}]
    lessons: [],          // takeaways surfaced on the victory screen
  };
}

/* ── Rendering helpers ── */

const stage = document.getElementById('stage');
const hud = document.getElementById('hud');
let currentChoices = [];
let patienceTimer = null;

function fmt(n) {
  return n.toLocaleString('en-US') + ' gold';
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function speech(speaker, text, cls = '') {
  if (!speaker) return `<div class="speech narration">${text}</div>`;
  return `<div class="speech ${cls}"><div class="speaker">${esc(speaker)}</div><div>${text}</div></div>`;
}

function debrief(text) {
  return `<div class="debrief"><div class="debrief-label">📜 Post-battle debrief (the real world, briefly)</div>${text}</div>`;
}

function banner(kind, text) {
  return `<div class="banner ${kind}">${text}</div>`;
}

function renderScene(html, choiceList) {
  clearInterval(patienceTimer);
  currentChoices = choiceList || [];
  const buttons = currentChoices
    .map((c, i) => {
      const hint = c.hint ? `<span class="hint">${c.hint}</span>` : '';
      return `<button class="choice ${c.primary ? 'primary' : ''}" data-idx="${i}">${c.label}${hint}</button>`;
    })
    .join('');
  stage.innerHTML = `<div class="scene">${html}<div class="choices">${buttons}</div></div>`;
  stage.querySelectorAll('button.choice').forEach((btn) => {
    btn.addEventListener('click', () => currentChoices[+btn.dataset.idx].go());
  });
  window.scrollTo(0, 0);
  updateHud();
}

function updateHud() {
  const offerEl = document.querySelector('#hud-offer b');
  const rapportEl = document.querySelector('#hud-rapport b');
  const invEl = document.getElementById('hud-inventory');
  offerEl.textContent = S && S.offer ? S.offer.toLocaleString('en-US') : '—';
  rapportEl.textContent = S ? '♥'.repeat(Math.max(0, S.rapport)) + '♡'.repeat(Math.max(0, 5 - S.rapport)) : '—';
  const badges = [];
  if (S && S.knowledge) badges.push('🔮 Market Lore');
  if (S && !S.knowledge && S.partialKnowledge) badges.push('🕯️ Partial Lore');
  if (S && S.scroll) badges.push('📜 Escape Scroll');
  if (S && S.ledger) badges.push('📖 Deeds Ledger');
  invEl.innerHTML = badges.map((b) => `<span class="inv-badge">${b}</span>`).join('');
}

function lesson(text) {
  if (!S.lessons.includes(text)) S.lessons.push(text);
}

/* ── Best-score persistence ── */

function loadBest() {
  try {
    return JSON.parse(localStorage.getItem('salaryquest_best') || '{}');
  } catch (e) {
    return {};
  }
}

const RANK_ORDER = { S: 5, A: 4, B: 3, C: 2, D: 1 };

function saveBest(quest, rank, total) {
  try {
    const best = loadBest();
    const key = 'q' + quest;
    if (!best[key] || total > best[key].total) best[key] = { rank, total };
    localStorage.setItem('salaryquest_best', JSON.stringify(best));
  } catch (e) { /* private browsing etc. — scores just don't persist */ }
}

/* ── Title screen ── */

function titleScreen() {
  S = null;
  hud.classList.add('hidden');
  const best = loadBest();
  const bestLine = (q, name) =>
    best['q' + q]
      ? `<div class="subtag">🏆 Best ${name}: Rank ${best['q' + q].rank} — ${best['q' + q].total.toLocaleString('en-US')} gold</div>`
      : '';
  renderScene(
    `<div class="title-screen">
      <div class="dragon">🐉</div>
      <h1>Salary Quest</h1>
      <div class="tagline">Slay the dragon. Get the gold.</div>
      <div class="subtag">Your greatest foe is saying a number first.</div>
      ${bestLine(1, 'Quest I')}${bestLine(2, 'Quest II')}
    </div>`,
    [
      { label: '⚔️ Quest I — The Dragon\'s Hoard', hint: 'Negotiate a new job offer', primary: true, go: intro },
      { label: '🗝️ Quest II — The Raise', hint: 'One year later: ask for more gold at the guild you already serve', go: act2Intro },
      { label: '📚 The Sage\'s Codex', hint: 'Every lesson, in plain language — no dragons', go: codex },
      {
        label: '❓ What is this?',
        go: () =>
          renderScene(
            `<div class="title-screen"><div class="dragon">🐉</div><h1>Salary Quest</h1></div>` +
            speech(null, `A short interactive story about negotiating your compensation. The fantasy is a skin; every encounter teaches one real, research-backed negotiation principle, and a plain-language debrief after each battle tells you what just happened and why it works. Each quest takes about five minutes. Different choices, different gold.`),
            [{ label: '🏰 Back to the title screen', primary: true, go: titleScreen }]
          ),
      },
    ]
  );
}

/* ── Intro ── */

function intro() {
  S = newState();
  hud.classList.remove('hidden');
  renderScene(
    `<div class="location">The Road to Emberhold</div>` +
      speech(null, `After seven interviews — pardon, <i>trials</i> — the Obsidian Ledger Guild wants you. You, an Arcane Engineer of respectable renown. A raven arrived this morning: <b>“The Guildmaster will discuss terms at the keep. Come at dusk.”</b>`) +
      speech(null, `Everyone fears this part. Not the trials — the <b>conversation about gold</b>. That's the dragon. It sleeps on a hoard, and the size of your cut depends entirely on how you handle the next hour.`) +
      speech(null, `Dusk is hours away. The town of Emberhold lies before you, and two doors are open: the <b>tavern</b>, where sages trade market lore… and the hall of a <b>rival guild</b> that has been sending you ravens all week.`),
    [
      { label: '🍺 Visit the tavern and consult the sages', hint: 'Learn what this work actually pays', primary: true, go: tavern },
      { label: '🏰 Answer the rival guild\'s summons', hint: 'See what the competition would offer you', go: rivalGuild },
      { label: '🌲 Skip both. March straight to the keep.', hint: 'Who needs preparation? (You. You need preparation.)', go: confirmSkip },
    ]
  );
}

function confirmSkip() {
  renderScene(
    `<div class="location">The Crossroads</div>` +
      speech(null, `You square your shoulders toward the keep. A passing bard raises an eyebrow. <i>“Walking into a dragon's lair without so much as asking what the hoard is worth? Bold. Ballads have been written about bolder fools. Short ballads.”</i>`),
    [
      { label: '🍺 Fine. The tavern first.', go: tavern },
      { label: '🏰 …or the rival guild.', go: rivalGuild },
      { label: '🐉 To the keep. Fortune favors the unprepared!', hint: 'It does not.', go: keepArrival },
    ]
  );
}

/* ── The Tavern: market research ── */

function tavern() {
  renderScene(
    `<div class="location">The Gilded Flagon — Tavern of Sages</div>` +
      speech(null, `Smoke, lute music, and three sages who know everyone's business. A sign above the bar reads: <i>“Knowledge of wages, freely shared. The Guilds hate this one trick.”</i>`) +
      speech('Sage of the Leveled Fae', `“An Arcane Engineer of your rank? The guilds around here pay between <b>${fmt(BAND.low)}</b> and <b>${fmt(BAND.high)}</b> a year. The Obsidian Ledger sits fat on last season's profits — they can pay top of band when they want someone.”`) +
      speech('Sage of the Glass Door', `“Heard tell their last three Arcane Engineers all started above <b>110,000</b>. And the Guildmaster? Fearsome voice, soft coffers. The first number spoken in that hall tends to be the number that rules the whole battle. Remember that.”`) +
      banner('good', '🔮 You gained <b>Market Lore</b>: the band is 95,000–130,000 gold, and this guild can pay the top of it.') +
      debrief(`This is the single highest-leverage move in a real negotiation, and it happens before the conversation starts. Employers know exactly what the range is; most candidates don't, and that information gap is the house edge. Fifteen minutes on Levels.fyi, Glassdoor, or salary bands in public job postings closes it — and candidates who can cite a market range negotiate measurably better outcomes than those who guess.`),
    (() => {
      S.knowledge = true;
      const opts = [];
      if (!S.scroll) opts.push({ label: '🏰 Still time before dusk — answer the rival guild\'s summons', hint: 'A competing offer changes everything', primary: true, go: rivalGuild });
      opts.push({ label: '🐉 Enough preparation. To the keep.', go: keepArrival });
      return opts;
    })()
  );
}

/* ── The Rival Guild: BATNA ── */

function rivalGuild() {
  renderScene(
    `<div class="location">Hall of the Silverquill Guild</div>` +
      speech('Silverquill Envoy', `“You came! Look — we'll be plain. We've seen your work on the Great Ledger Migration. We are prepared to offer you <b>${fmt(RIVAL_OFFER)}</b> a year, in writing, right now. Take this scroll. It is good for a fortnight.”`) +
      speech(null, `The envoy presses a sealed scroll into your hands. It hums faintly with power. You may never use it — and that is not the point. A warrior who <i>can</i> walk away negotiates like a different person.`) +
      banner('good', `📜 You obtained the <b>Escape Scroll</b> — a real, written offer of ${fmt(RIVAL_OFFER)} from another guild.`) +
      debrief(`This scroll is your BATNA — Best Alternative To a Negotiated Agreement, the cornerstone concept of <i>Getting to Yes</i> (Fisher &amp; Ury). Your negotiating power comes less from how you talk and more from what happens to you if this deal dies. A competing offer is the strongest BATNA there is: it raises what you dare to ask for, and research consistently shows people with strong alternatives set higher targets and land better deals. Even just interviewing elsewhere changes how you sit in the chair.`),
    (() => {
      S.scroll = true;
      const opts = [];
      if (!S.knowledge) opts.push({ label: '🍺 Stop by the tavern before dusk', hint: 'Lore of what this work pays', primary: true, go: tavern });
      opts.push({ label: '🐉 To the keep. Dusk approaches.', primary: S.knowledge, go: keepArrival });
      return opts;
    })()
  );
}

/* ── The Keep: arrival + the anchoring riddle ── */

function keepArrival() {
  renderScene(
    `<div class="location">The Keep of the Obsidian Ledger</div>` +
      speech(null, `Torchlight. A long hall. At its end, upon a modest hoard of contracts and coin, sits the <b>Guildmaster</b> — the dragon everyone warned you about. She is, disappointingly, a pleasant middle-aged woman with reading glasses. The hoard is real, though.`) +
      speech('Guildmaster Vexahlia', `“Ah. The Arcane Engineer. The trials spoke well of you, and I don't say that often. Let us settle terms.” She dips a quill, then looks up with the practiced calm of a creature that has done this a thousand times. <b>“Tell me — what are your expectations for compensation?”</b>`) +
      speech(null, `The oldest riddle in the dragon's arsenal. The hall goes quiet. Whoever names a number first casts the <b>anchoring spell</b> — and the whole battle will be fought on that ground.`),
    (() => {
      const opts = [];
      if (S.knowledge) {
        opts.push({
          label: '🔥 Cast the first spell: anchor high. “Based on what this work commands, I\'m looking at around 130,000 gold.”',
          hint: 'You know the band — a bold, defensible anchor',
          go: () => anchorResult('high'),
        });
      } else {
        opts.push({
          label: '🎲 Guess a number. “Um… eighty-five thousand?”',
          hint: 'You never learned the band. This is a shot in the dark.',
          go: () => anchorResult('low'),
        });
      }
      opts.push({
        label: '🛡️ Deflect. “I\'d rather hear what the Guild believes the post is worth — I trust you pay fairly for it.”',
        hint: 'Let the dragon cast first',
        go: () => anchorResult('deflect'),
      });
      opts.push({
        label: '🪞 Turn the riddle around. “What range has the Guild budgeted for this post?”',
        hint: 'Make them reveal the battlefield',
        go: () => anchorResult('asked'),
      });
      return opts;
    })()
  );
}

function anchorResult(kind) {
  S.anchored = kind;
  let html = `<div class="location">The Keep — The Riddle Answered</div>`;

  if (kind === 'high') {
    S.offer = 118000;
    html +=
      speech('You', `“Based on what this work commands in the market, I'm looking at around <b>130,000 gold</b>.”`, 'you') +
      speech('Guildmaster Vexahlia', `The quill pauses. One scaled eyebrow — metaphorically — rises. “Top of the band, and you know it's the band. Very well. We cannot start there, but…” She writes. <b>“The Guild offers 118,000 gold a year.”</b>`) +
      banner('good', `⚔️ Your anchor pulled the battle uphill. Opening offer: <b>${fmt(S.offer)}</b>.`) +
      debrief(`Anchoring is one of the most replicated effects in negotiation research (Tversky &amp; Kahneman on the bias; Galinsky &amp; Mussweiler on first offers): final agreements land dramatically closer to whoever names the first number. The rule is conditional — anchor first <b>when you know the market</b> and can name an ambitious-but-defensible figure; let them go first when you're in the dark. You knew the band, so your 130k anchor dragged their opening offer up with it.`);
    lesson('When you know the market, anchoring high-but-defensible pulls the entire negotiation toward your number.');
  } else if (kind === 'low') {
    S.offer = 85000;
    html +=
      speech('You', `“Um… <b>eighty-five thousand</b>?”`, 'you') +
      speech('Guildmaster Vexahlia', `Something flickers across her face — the look of a dragon who cannot believe the knight just handed over his own sword. “...Eighty-five thousand,” she repeats slowly, writing it down with great care. <b>“The Guild accepts your figure. 85,000 gold a year.”</b> Somewhere, faintly, you hear a sage in a tavern sigh.`) +
      banner('bad', `💀 You anchored the battle in a ditch. Opening offer: <b>${fmt(S.offer)}</b> — you'll never learn the band was 95,000–130,000.`) +
      debrief(`This is the classic blunder: naming a number with no data. Anchoring works on whoever speaks first — including against you. Your guess was 10,000 below the very bottom of the real band, and the employer simply accepted it; no recruiter is obligated to correct you upward. The fix isn't courage, it's research: never name a number you can't back with market data, and if you don't have data, deflect or ask for their range instead.`);
    lesson('Never name a number without market data — a blind guess becomes an anchor that works against you.');
  } else if (kind === 'deflect') {
    S.offer = S.knowledge ? 108000 : 98000;
    html +=
      speech('You', `“I'd rather hear what the Guild believes the post is worth — I trust you pay fairly for the work.”`, 'you') +
      speech('Guildmaster Vexahlia', `A thin smile. “Diplomatic. Fine — the Guild moves first.” The quill scratches. <b>“${S.offer.toLocaleString('en-US')} gold a year.”</b>` + (S.knowledge ? ` Your Market Lore hums: that's mid-band. There is room above it, and you <i>know</i> there's room.` : ` You have… no idea whether that is generous or an insult. It sounds like a lot of gold? Most numbers do, spoken in a torchlit hall.`)) +
      (S.knowledge
        ? banner('info', `🔮 Market Lore check: ${fmt(S.offer)} is mid-band. The top is 130,000. Room to climb.`)
        : banner('bad', `🌫️ Without lore, you can't judge this number. That fog is worth thousands of gold — to them.`)) +
      debrief(`Deflecting is a legitimate move — letting the employer name the first number avoids anchoring yourself into a ditch, and it's the standard advice when you don't know the market. But notice the catch: once their number lands, you can only judge it if you did the research. Deflection without data just delays your blindness. Deflection <i>with</i> data lets you hear their anchor and calmly measure exactly how far it sits below the top of the band.`);
    lesson('Letting them go first is safe — but only research tells you whether their number is good.');
  } else {
    // asked their range
    S.offer = S.knowledge ? 112000 : 104000;
    if (!S.knowledge) S.partialKnowledge = true;
    html +=
      speech('You', `“Before I answer riddles — what range has the Guild budgeted for this post?”`, 'you') +
      speech('Guildmaster Vexahlia', `She laughs, once, like a small rockslide. “Turning the riddle on the dragon. I <i>do</i> like that.” She consults a ledger. “The band for this post runs <b>95,000 to 125,000</b>, depending on the adventurer.” A pause, and the quill moves. <b>“For you: ${S.offer.toLocaleString('en-US')} gold.”</b>`) +
      banner('good', `🕯️ You made the dragon reveal the battlefield: the band exists, and it goes to at least 125,000.`) +
      debrief(`“What's the budgeted range for this role?” is one of the most underused questions in real negotiations — and it's increasingly hard to refuse, since several US states and the EU now legally require pay-range disclosure. Asking costs you nothing, often reveals the band on the spot, and signals you're someone who negotiates. Their stated range may be trimmed at the top (theirs went to 130k, they said 125k), but partial light beats total darkness.`);
    lesson(`Asking “what's the budgeted range?” is free, legal, and often answered — make them show the battlefield.`);
  }

  S.initialOffer = S.offer;
  renderScene(html, [{ label: '🐉 Face the offer on the table…', primary: true, go: patienceCheck }]);
}

/* ── The Patience Check: real-time silence meter ── */

function patienceCheck() {
  clearInterval(patienceTimer);
  const html =
    `<div class="location">The Keep — The Silence</div>` +
    speech('Guildmaster Vexahlia', `“<b>${S.offer.toLocaleString('en-US')} gold.</b>” She sets down the quill, folds her claws — hands — and watches you. The hall is very, very quiet.`) +
    speech(null, `A <b>Patience Check</b>! The dragon has cast her number and now wields her oldest weapon: <b>silence</b>. Every instinct screams at you to fill it. Do not. Hold the silence and let the meter fill.`) +
    `<div class="patience-wrap">
      <div class="patience-label">Hold the silence… (say nothing)</div>
      <div class="patience-bar"><div class="patience-fill" id="pfill"></div></div>
      <div class="blurt-zone">
        <button class="blurt" id="blurt1">😅 “That sounds great, honestly!”</button>
        <button class="blurt" id="blurt2">😰 “I mean— is that, um, negotiable at all?”</button>
      </div>
    </div>`;

  stage.innerHTML = `<div class="scene">${html}</div>`;
  window.scrollTo(0, 0);
  updateHud();

  const fill = document.getElementById('pfill');
  const DURATION = 7000;
  const start = Date.now();

  patienceTimer = setInterval(() => {
    const pct = Math.min(100, ((Date.now() - start) / DURATION) * 100);
    fill.style.width = pct + '%';
    if (pct >= 100) {
      clearInterval(patienceTimer);
      patienceSuccess();
    }
  }, 80);

  document.getElementById('blurt1').addEventListener('click', () => patienceFail('eager'));
  document.getElementById('blurt2').addEventListener('click', () => patienceFail('meek'));
}

function patienceSuccess() {
  S.patienceWon = true;
  const bump = 3000;
  S.offer += bump;
  renderScene(
    `<div class="location">The Keep — The Silence, Held</div>` +
      speech(null, `You hold her gaze. You count the torches. You say <b>nothing</b>. Three seconds. Five. Seven. The silence grows heavy — and it is heavier on <i>her</i> side of the hoard, because she is the one waiting for a yes.`) +
      speech('Guildmaster Vexahlia', `Her tail — definitely a tail this time — flicks. “…You're a quiet one.” She glances at the ledger. “Perhaps I can note it as <b>${S.offer.toLocaleString('en-US')}</b>. The trials <i>did</i> speak well of you.”`) +
      banner('good', `🧘 Patience check passed. The silence alone earned you <b>+${bump.toLocaleString('en-US')} gold</b> — and you learned the number bends.`) +
      debrief(`Silence after an offer is a genuinely documented tactic, and it works on both sides of the table. Most people find silence in a negotiation so uncomfortable they rush to fill it — often with a concession. Recruiters usually have an approved range plus a “stretch” number; a calm pause, or a neutral “hmm, let me think about that,” routinely surfaces flexibility before you've asked for anything. The person who needs the silence broken least has the leverage.`),
    [{ label: '⚔️ Now — the counter-attack', primary: true, go: counterAttack }]
  );
  lesson('After an offer, pause. Silence is uncomfortable — make it their problem, and flexibility often surfaces on its own.');
}

function patienceFail(kind) {
  clearInterval(patienceTimer);
  S.patienceWon = false;
  const blurted =
    kind === 'eager'
      ? speech('You', `“That sounds great, honestly!”`, 'you') +
        speech('Guildmaster Vexahlia', `The dragon's eyes crinkle warmly. Somewhere in her ledger, a stretch-number quietly ceases to exist. “Wonderful. I <i>thought</i> it was a strong figure.”`)
      : speech('You', `“I mean— is that, um, negotiable at all?”`, 'you') +
        speech('Guildmaster Vexahlia', `“Everything is negotiable,” she says pleasantly, in the tone of a creature who now knows exactly how uncomfortable you are. “Is it <i>insufficient</i>?” You have surrendered the silence and gained nothing for it.`);
  renderScene(
    `<div class="location">The Keep — The Silence, Broken</div>` +
      speech(null, `The silence stretches— and you crack like a dry twig.`) +
      blurted +
      banner('bad', `😖 Patience check failed. You filled the silence, and the dragon learned it costs nothing to wait you out.`) +
      debrief(`The pain you just felt is the whole lesson: humans are wired to treat conversational silence as a problem to fix, and the side that fixes it usually pays for it. An enthusiastic instant “yes” tells the employer the offer was already high enough (or too high); a nervous filler question hands back the initiative. Practice one line for this exact moment — “Thank you, I appreciate that. Let me take a day to consider the full picture” — and the silence stops being your enemy.`),
    [{ label: '⚔️ Recover. Mount the counter-attack.', primary: true, go: counterAttack }]
  );
  lesson(`Don't fill the silence after an offer — an instant reaction, eager or nervous, gives away your position for free.`);
}

/* ── The Counter-Attack: stances ── */

function counterAttack() {
  const scrollHint = S.scroll ? ' — and you carry the Escape Scroll' : '';
  renderScene(
    `<div class="location">The Keep — The Counter-Attack</div>` +
      speech(null, `The offer stands at <b>${fmt(S.offer)}</b>. Now comes the counter — and in this hall, <i>how</i> you say it matters as much as what you ask. Choose your stance${scrollHint}.`),
    [
      {
        label: `🤝 Diplomacy stance — “I'm excited about this role, and…”`,
        hint: 'Warm on the person, firm on the number' + (S.scroll ? '. Your scroll strengthens this greatly.' : ''),
        primary: true,
        go: () => counterResult('diplomacy'),
      },
      {
        label: `🪓 Aggressive stance — “You'll have to do far better than that.”`,
        hint: 'Intimidate the dragon. What could go wrong?',
        go: () => counterResult('aggressive'),
      },
      {
        label: `🐁 Meek stance — “That… seems fine. I accept.”`,
        hint: 'The battle ends immediately. So does the climbing.',
        go: () => counterResult('meek'),
      },
    ]
  );
}

function counterResult(stance) {
  S.stance = stance;
  let html = `<div class="location">The Keep — Stance: ${stance === 'diplomacy' ? 'Diplomacy' : stance === 'aggressive' ? 'Aggression' : 'Meekness'}</div>`;

  if (stance === 'diplomacy') {
    // gain scales with preparation
    let pct;
    if (S.knowledge && S.scroll) pct = 0.12;
    else if (S.knowledge) pct = 0.09;
    else if (S.scroll) pct = 0.07;
    else if (S.partialKnowledge) pct = 0.06;
    else pct = 0.04;
    if (S.patienceWon === false) pct -= 0.02;
    const gain = Math.round((S.offer * pct) / 500) * 500;
    const target = S.offer + gain;

    let line = `“I'm <b>genuinely excited</b> about this role — the Great Ledger project is exactly the work I want to do, and I'd be proud to wear the Guild's colors. <b>And</b>, for me to say yes with a whole heart, the gold needs to reflect the market for this work.`;
    if (S.knowledge) line += ` The sages quote <b>up to ${BAND.high.toLocaleString('en-US')}</b> for an engineer of my rank.`;
    if (S.scroll) line += ` I'll also be honest with you, because I'd want the same: the Silverquill Guild has made me a written offer of <b>${RIVAL_OFFER.toLocaleString('en-US')}</b> — but you are my first choice.`;
    line += ` Can we bring it to <b>${target.toLocaleString('en-US')}</b>?”`;

    S.offer = target;
    S.rapport = Math.min(5, S.rapport + 1);

    html +=
      speech('You', line, 'you') +
      speech('Guildmaster Vexahlia', `She listens without interrupting — dragons respect a well-formed claim on a hoard. ${S.scroll ? `Her eyes linger on the sealed scroll at your belt. “Silverquill. In writing. Hm.” ` : ''}${S.knowledge ? `“And you've spoken with the sages. Of course you have.” ` : ''}A long exhale of smoke. <b>“…${target.toLocaleString('en-US')}, then. You argue like a guild treasurer, and I mean that as a compliment.”</b>`) +
      banner('good', `🤝 Diplomacy strikes true: <b>+${gain.toLocaleString('en-US')} gold</b>. The offer stands at <b>${fmt(S.offer)}</b>, and the Guildmaster respects you more, not less.` + (S.patienceWon === false ? ' (Your broken silence earlier dulled the blow somewhat.)' : '')) +
      debrief(`“I'm excited about this role, <b>and</b>…” is the highest-percentage phrasing in real negotiations: enthusiasm removes the employer's fear that you'll bolt, and the firm ask rides in behind it. Research on negotiation framing (including Linda Babcock's work in <i>Women Don't Ask</i>) finds warm-but-firm askers outperform both aggressive and passive ones — assertive content, cooperative tone. Notice also that your counter's power came from stacked preparation: market data made the number credible${S.scroll ? ', and the competing offer made it real' : ' (a competing offer would have made it stronger still)'}. Employers almost never rescind offers over a politely framed counter.`);
    lesson(`Counter warm-but-firm: “I'm excited, and…” — enthusiasm plus a researched number beats both aggression and silence-taking.`);
  } else if (stance === 'aggressive') {
    S.rapport = Math.max(0, S.rapport - 2);
    if (S.scroll) {
      const gain = 3000;
      S.offer += gain;
      html +=
        speech('You', `You slam the Escape Scroll onto the hoard. “<b>You'll have to do far better than that.</b> Silverquill offers ${RIVAL_OFFER.toLocaleString('en-US')} and their keep has better plumbing. Beat it, or I walk tonight.”`, 'you') +
        speech('Guildmaster Vexahlia', `The temperature in the hall drops. Actual frost, from a fire dragon — impressive. “…The scroll is real,” she says at last, coldly. “Very well: <b>${S.offer.toLocaleString('en-US')}</b>. Final.” The quill stabs the parchment. You got a number. You also got a Guildmaster who will remember this conversation at every raise season for the next five years.`) +
        banner('bad', `🪓 The ultimatum wrung out <b>+${gain.toLocaleString('en-US')} gold</b> — but rapport is badly wounded, and “final” means the climbing is over.`);
    } else {
      html +=
        speech('You', `“<b>You'll have to do far better than that.</b> I know my worth.”`, 'you') +
        speech('Guildmaster Vexahlia', `A slow blink, the kind glaciers do. “Do you? Because you've shown me no sages' figures, no rival's scroll — only volume.” She does not move the number. <b>“The offer stands as written. Take the evening to consider your… worth.”</b>`) +
        banner('bad', `🪓 The bluff bounced off dragon scale. <b>No gain</b>, and rapport is badly wounded.`);
    }
    html += debrief(`Aggression in salary negotiations reliably backfires: ultimatums invite ultimatums, and threats you can't back up get called. Even when hardball extracts a concession, studies on negotiation relationships show the counterpart cooperates less afterward — and this person controls your raises, projects, and promotions starting next week. The line between firm and hostile is the line between “here's my data, can we get there?” and “beat it or I walk.” Only say the second one if you're truly, cheerfully ready to walk.`);
    lesson('Aggression is not leverage. Ultimatums damage the relationship you\'re about to live inside — data delivered warmly beats threats.');
  } else {
    // meek
    html +=
      speech('You', `“That… seems fine. I accept.”`, 'you') +
      speech('Guildmaster Vexahlia', `“Splendid!” The contract is signed with remarkable speed — dragons move fast when a deal favors the hoard. As the ink dries, you could swear she looks faintly <i>disappointed</i>, the way a duelist is when the opponent forfeits.`) +
      banner('bad', `🐁 You left the battlefield without swinging. Whatever gold sat above ${fmt(S.offer)} stays on the hoard.`) +
      debrief(`The counter you don't make is the most expensive sentence you never said. Surveys consistently find a large share of candidates accept the first number, while a strong majority of employers report leaving room to negotiate — they <i>expect</i> the counter. A polite ask virtually never costs you the offer, and the raise it wins compounds: every future raise, bonus, and next-job offer is a percentage of today's base. Meekness feels safe in the moment and costs tens of thousands over a career.`);
    lesson('Employers expect a counter and build room for one — accepting the first number donates that room back to them.');
  }

  renderScene(html, [{ label: '➡️ The Guildmaster reaches for the hourglass…', primary: true, go: explodingOffer }]);
}

/* ── The Exploding Offer ── */

function explodingOffer() {
  renderScene(
    `<div class="location">The Keep — The Hourglass Gambit</div>` +
      speech('Guildmaster Vexahlia', `She produces an ornate hourglass and sets it on the hoard with a <i>click</i>. The sand begins to fall. <b>“One more thing. This offer melts at dawn.</b> The Guild has other candidates, you understand. Sign tonight, or the terms return to the hoard.”`) +
      speech(null, `The infamous <b>Exploding Offer</b> — a pressure spell designed to stop you from thinking, comparing, or consulting anyone. The sand hisses. Your pulse argues with your training.`),
    [
      {
        label: `🕰️ Calmly ask for time. “I'm ready to be excited about this. I'd like two days to review the full terms — I don't sign contracts by torchlight.”`,
        hint: 'Polite, firm, unhurried',
        primary: true,
        go: () => explodingResult('calm'),
      },
      {
        label: '✍️ Panic and sign before the sand runs out!',
        hint: 'The dragon smiles',
        go: () => explodingResult('panic'),
      },
      {
        label: '🃏 Flip the hourglass over. “Cute. Deadlines cut both ways — I have a scroll that expires too.”',
        hint: 'Call the bluff with style (a little spicy)',
        go: () => explodingResult('flip'),
      },
    ]
  );
}

function explodingResult(kind) {
  S.explodingChoice = kind;
  let html = `<div class="location">The Keep — The Sand Settles</div>`;

  if (kind === 'calm') {
    html +=
      speech('You', `“I'm ready to be excited about this, and I want to say yes to the <i>right</i> version of it. I'd like two days to review the full terms. I don't sign contracts by torchlight.”`, 'you') +
      speech('Guildmaster Vexahlia', `A beat. Then she tips the hourglass onto its side, where it can menace no one. “…Naturally,” she says, as if the dawn deadline had been a small joke between friends. “Take three. The <i>good</i> candidates always ask.”`) +
      banner('good', `🕰️ The hourglass was a bluff, as it nearly always is. Deadline dissolved, dignity intact, and the negotiation remains open.`) +
      debrief(`Exploding offers are overwhelmingly a pressure tactic, not a real constraint — hiring processes that took six weeks do not genuinely hinge on your answer by morning. A calm, positive request for a few days (“I'm excited, and I want to review the full package properly”) is granted the vast majority of the time; an employer who truly rescinds over a courteous 48-hour ask has told you something important about working there. Urgency is a spell. Naming it quietly breaks it.`);
    lesson('An “offer expires tomorrow” deadline is almost always a bluff — a calm, warm request for a few days nearly always succeeds.');
  } else if (kind === 'panic') {
    html +=
      speech('You', `You snatch the quill and sign before the top bulb is half-empty. Your signature has a small panic-wobble in it that will be legally binding forever.`, 'you') +
      speech('Guildmaster Vexahlia', `“<i>Delightful</i> doing business.” The hourglass, you now notice, isn't even connected to anything. It's decorative. She uses it in every negotiation. It has never once mattered.`) +
      banner('bad', `⏳ You signed under a pressure spell. The remaining treasures of the hoard — the ones beyond gold — stay unclaimed.`) +
      debrief(`Time pressure is used in negotiations precisely because it works: under a deadline, people stop evaluating and start reacting, skipping the comparison and consultation that produce better decisions. The defense is knowing, in advance, that manufactured urgency is a tactic — real offers survive a polite 48-hour request essentially always. If you feel your heart rate making the decision, that's the signal to slow down, not speed up.`);
    lesson('Manufactured urgency is designed to stop you thinking. Real offers survive a polite request for a couple of days.');
    // Signed on the spot: skip the loot table.
    renderScene(html, [{ label: '📜 To the final tally…', primary: true, go: victory }]);
    return;
  } else {
    // flip
    S.rapport = Math.max(0, S.rapport - (S.scroll ? 0 : 1));
    html +=
      speech('You', `You reach across the hoard and flip the hourglass onto its side. “Cute. Deadlines cut both ways${S.scroll ? ` — the Silverquill scroll at my belt has a date on it too` : ''}.”`, 'you') +
      (S.scroll
        ? speech('Guildmaster Vexahlia', `She stares at the toppled hourglass, then barks a laugh that rattles the torches. “Ha! Fine. Fine. Dawn deadlines are for candidates without scrolls.” The pressure spell dissolves — and she looks at you with something like professional admiration.`)
        : speech('Guildmaster Vexahlia', `She stares at the toppled hourglass. The laugh she gives is thinner. “Bold, for an adventurer with no other scroll on their belt.” The deadline dissolves — bluffs usually do — but you feel you spent a little goodwill buying what a polite sentence would have bought for free.`)) +
      banner(S.scroll ? 'good' : 'info', S.scroll ? `🃏 The bluff, called with a real scroll to back it, dies instantly. Style points awarded.` : `🃏 The bluff dies — but swagger without a BATNA behind it cost a little warmth. Same result as asking nicely, higher price.`) +
      debrief(`Calling out a pressure tactic works — the hourglass rarely survives contact with someone who isn't afraid of it — but the delivery is priced by your leverage. With a competing offer in hand, wit reads as confidence. Without one, the same line reads as bravado, and you're spending relationship capital on theatrics when a calm “I'd like a couple of days” achieves the identical outcome for free. Break the urgency spell; just pay the minimum for it.`);
    lesson('You can call out a pressure tactic — but calm beats theatrics unless you truly hold the leverage.');
  }

  renderScene(html, [{ label: '💎 The hoard has more than gold… claim the full loot table', primary: true, go: lootTable }]);
}

/* ── The Full Loot Table: total comp ── */

const LOOT = [
  { id: 'gems', icon: '💎', name: 'Guild Gems (equity)', ask: 'a grant of Guild Gems — shares in the hoard itself', value: 10000, note: 'equity grant, ~yearly value' },
  { id: 'chest', icon: '🧰', name: 'Signing Chest (bonus)', ask: 'a signing chest — one-time gold for joining', value: 8000, note: 'one-time signing bonus' },
  { id: 'mount', icon: '🐎', name: 'Spectral Mount (remote work)', ask: 'a spectral mount — the right to work from my own tower three days a week', value: 6000, note: 'remote flexibility, valued yearly' },
  { id: 'potions', icon: '🧪', name: 'Potions of Rest (extra PTO)', ask: 'five additional Potions of Rest each year', value: 4000, note: 'extra paid leave, valued yearly' },
];

function lootTable() {
  renderScene(
    `<div class="location">The Keep — The Full Loot Table</div>` +
      speech(null, `The gold is settled at <b>${fmt(S.offer)}</b> — but look past the coin. The hoard holds <b>gems</b> (a stake in the Guild itself), a <b>signing chest</b>, a <b>spectral mount</b> (work from your own tower), and <b>potions of rest</b>. Base gold is one slot in the loot table. Most adventurers walk out having never checked the others.`) +
      speech('Guildmaster Vexahlia', `“The gold is the gold — my treasurer will riot if I move it again tonight. But if there is something <i>else</i> that would make this an easy yes… name it. Perhaps two somethings, if you've earned my goodwill.”`) +
      banner('info', `Choose your <b>first ask</b>. Your rapport (${'♥'.repeat(S.rapport)}${'♡'.repeat(5 - S.rapport)}) determines how much of the loot table opens to you.`),
    LOOT.map((item) => ({
      label: `${item.icon} Ask for ${item.name}`,
      hint: `Worth ~${item.value.toLocaleString('en-US')} gold/yr — “I'd love to include ${item.ask}.”`,
      go: () => lootFirst(item),
    }))
  );
}

function lootFirst(first) {
  S.perks.push({ ...first, granted: true });
  const remaining = LOOT.filter((l) => l.id !== first.id);

  if (S.rapport >= 2) {
    renderScene(
      `<div class="location">The Keep — The Loot Table, Second Ask</div>` +
        speech('You', `“I'd love to include ${first.ask}.”`, 'you') +
        speech('Guildmaster Vexahlia', `She waves a claw at a clerk, who scurries. “Done. ${first.name} — the treasurer doesn't even guard that ledger.” She studies you. “You said <i>two</i> somethings with your eyes. Go on, then.”`) +
        banner('good', `${first.icon} <b>${first.name}</b> secured (+${first.value.toLocaleString('en-US')} gold value). A different ledger than base pay — notice how easily it moved.`),
      remaining
        .map((item) => ({
          label: `${item.icon} Also ask for ${item.name}`,
          hint: `Worth ~${item.value.toLocaleString('en-US')} gold/yr`,
          go: () => lootSecond(item),
        }))
        .concat([{ label: '🙏 Press your luck no further — settle the contract', go: victory }])
    );
  } else {
    renderScene(
      `<div class="location">The Keep — The Loot Table</div>` +
        speech('You', `“I'd love to include ${first.ask}.”`, 'you') +
        speech('Guildmaster Vexahlia', `A pause — cooler than before. The earlier clash still hangs in the air. “…That much, I'll grant,” she says finally. “But the hoard closes there. Goodwill spends like gold, adventurer, and yours ran thin tonight.”`) +
        banner('info', `${first.icon} <b>${first.name}</b> secured (+${first.value.toLocaleString('en-US')} gold value) — but low rapport slammed the loot table shut after one ask.`) +
        debrief(`Perks come out of goodwill as much as budget — and this is where the tone of the whole negotiation gets priced. A counterpart you've treated as a partner will hunt for creative extras; one you've bruised grants the minimum and closes the ledger. This is why the warm-but-firm stance wins twice: once on the number, and again here, on everything that isn't the number.`),
      [{ label: '📜 Settle the contract', primary: true, go: victory }]
    );
    lesson('Rapport is a currency: the tone of the negotiation gets paid back when you ask for perks beyond base pay.');
  }
}

function lootSecond(second) {
  S.perks.push({ ...second, granted: true });
  renderScene(
    `<div class="location">The Keep — The Loot Table, Complete</div>` +
      speech('You', `“Then let's also include ${second.ask} — and you'll have my signature with a whole heart.”`, 'you') +
      speech('Guildmaster Vexahlia', `“<i>Done.</i>” The quill flourishes. “You know, most adventurers stare at the gold pile and never once look at the rest of the hoard. My treasurer loves those adventurers.” She slides the contract across. It is, you must admit, a beautiful contract.`) +
      banner('good', `${second.icon} <b>${second.name}</b> secured (+${second.value.toLocaleString('en-US')} gold value). Two perks claimed beyond base gold.`) +
      debrief(`Total compensation is a package, and the parts move independently: base salary is often the most constrained lever (bands, internal equity, the treasurer), while signing bonuses, equity, extra PTO, and remote flexibility come from different budgets with different gatekeepers. When base stalls, the negotiation isn't over — it's just changed ledgers. Always price the whole package before comparing offers; a lower base with better equity, flexibility, and bonus can be the richer deal.`),
    [{ label: '📜 Sign the contract and claim your loot', primary: true, go: victory }]
  );
  lesson('Negotiate the package, not just the number — bonus, equity, PTO, and flexibility sit in different budgets and move when base won\'t.');
}

/* ── Victory screen ── */

function victory() {
  const perkTotal = S.perks.reduce((sum, p) => sum + p.value, 0);
  const total = S.offer + perkTotal;
  const baselineWorst = 85000; // the blind-guess floor
  const delta = S.offer - S.initialOffer;

  let rank, rankNote;
  if (total >= 148000) { rank = 'S'; rankNote = 'Dragonfriend. The sages will sing of this contract.'; }
  else if (total >= 132000) { rank = 'A'; rankNote = 'A masterful hunt. The hoard yielded richly.'; }
  else if (total >= 115000) { rank = 'B'; rankNote = 'A solid campaign. Gold was won; more waited.'; }
  else if (total >= 100000) { rank = 'C'; rankNote = 'You survived the dragon. The dragon also survived you.'; }
  else { rank = 'D'; rankNote = 'The dragon is still chuckling. Train, and return.'; }
  saveBest(1, rank, total);

  const perkRows = S.perks
    .map((p) => `<tr><td>${p.icon} ${p.name} <span style="color:var(--text-dim)">(${p.note})</span></td><td>+${p.value.toLocaleString('en-US')}</td></tr>`)
    .join('');

  const deltaRow =
    delta > 0
      ? `<tr><td style="color:var(--text-dim)">…of which won by negotiating (vs. first number)</td><td class="delta-up">+${delta.toLocaleString('en-US')}</td></tr>`
      : `<tr><td style="color:var(--text-dim)">…won by negotiating after the first number</td><td class="delta-down">+0</td></tr>`;

  const lessonItems = S.lessons.map((l) => `<li>${l}</li>`).join('');

  renderScene(
    `<div class="location">The Contract Is Sealed</div>` +
      `<div class="rank">🏆 Rank ${rank}</div>` +
      `<div class="rank-note">${rankNote}</div>` +
      speech(null, `The quill lifts. The wax seal cools. Guildmaster Vexahlia — dragon, dealmaker, surprisingly reasonable once engaged properly — inclines her head. <b>“Welcome to the Guild, Arcane Engineer.”</b>`) +
      `<table class="loot-table">
        <tr><td>💰 Base gold (annual)</td><td>${S.offer.toLocaleString('en-US')}</td></tr>
        ${deltaRow}
        ${perkRows || `<tr><td style="color:var(--text-dim)">— no perks claimed from the wider hoard —</td><td>+0</td></tr>`}
        <tr class="total"><td>Total loot (package value)</td><td>${total.toLocaleString('en-US')}</td></tr>
      </table>` +
      banner('info', `For scale: the worst path through this keep signs at <b>${baselineWorst.toLocaleString('en-US')}</b> total. The best clears <b>~153,000</b>. Same candidate. Same guild. Same evening. The only variable was the negotiation.`) +
      `<div class="debrief"><div class="debrief-label">📜 Final debrief — what you take back to the real world</div>
        <ul class="lessons">${lessonItems || '<li>Sign nothing by torchlight. Come back and earn some lessons.</li>'}</ul>
        <p style="margin-top:10px">One last real number: a difference like the one on this screen, carried through raises and job changes that each build on your current base, compounds to hundreds of thousands over a career. The dragon conversation is uncomfortable for one hour. The gold is yours for decades.</p>
      </div>`,
    [
      { label: '🗝️ Continue to Quest II — The Raise (one year later…)', primary: true, go: act2Intro },
      { label: '🔄 Replay Quest I — try a different path through the keep', go: intro },
      { label: '🏰 Return to the title screen', go: titleScreen },
    ]
  );
}

/* ══════════════════════════════════════════════════════════════
   QUEST II — THE RAISE
   One year later. Same guild, different dragon-conversation:
   asking for more gold at the job you already have.
══════════════════════════════════════════════════════════════ */

const CURRENT_PAY = 110000;

function act2Intro() {
  S = newState();
  S.quest = 2;
  S.offer = CURRENT_PAY;
  hud.classList.remove('hidden');
  renderScene(
    `<div class="location">Quest II — The Obsidian Ledger Guild, One Year Later</div>` +
      speech(null, `A year in the Guild's colors. You warded the <b>Autumn Caravan</b> through the Howling Pass — two hundred thousand gold of cargo, not one crate lost. You cut the scrying-mirror budget by a third. You trained two apprentices who no longer set things on fire (much).`) +
      speech(null, `Your pay is <b>${fmt(CURRENT_PAY)}</b> — the number you signed at, frozen in amber. Meanwhile the new hires whisper of richer contracts, for the market did not stand still while you worked. It is time for the <i>other</i> dragon conversation: the <b>raise</b>. Different lair. Same dragon. New rules.`) +
      speech(null, `But first — a truth about this battle: it was won or lost <i>months ago</i>. Rewind to a small decision you made every week this year. Did you keep a <b>Deeds Ledger</b>?`),
    [
      {
        label: '📖 You kept the Deeds Ledger — every deed, dated and counted',
        hint: 'Five minutes a week, all year',
        primary: true,
        go: () => act2Ledger(true),
      },
      {
        label: '🧠 You trusted your memory. Surely the Guildmaster remembers the Caravan…',
        hint: 'She has forty adventurers and one memory',
        go: () => act2Ledger(false),
      },
    ]
  );
}

function act2Ledger(kept) {
  S.ledger = kept;
  let html = `<div class="location">The Deeds Ledger</div>`;
  if (kept) {
    html +=
      speech(null, `You open the ledger. It is beautiful. <i>“Warded the Autumn Caravan — 200,000 gold of cargo delivered, zero losses. Cut scrying-mirror costs 30% (11,000 gold/yr). Trained two apprentices to journeyman rank. Covered the Eastern Watch for six weeks unasked.”</i> Dates. Numbers. Witnesses.`) +
      banner('good', `📖 The <b>Deeds Ledger</b> is in your inventory. Your case will be made of stone, not smoke.`) +
      debrief(`This is the “brag document,” and it may be the highest-return five minutes a week in your career. Managers decide raises while looking at whatever is legible at review time — and human memory is brutally recency-biased, including your own: without notes, you'll forget half your own wins from eight months ago. Keep a running doc of what you did, <b>quantified</b> (gold saved, time cut, people trained), and the raise conversation starts from evidence instead of vibes.`);
    lesson('Keep a running brag document with dates and numbers — raise cases are decided on what\'s legible, not what happened.');
  } else {
    html +=
      speech(null, `You close your eyes and inventory the year. You did… things. Good things. The caravan thing. The mirror thing? The exact numbers swim away like fish. It was all very impressive at the time, you're fairly sure.`) +
      banner('bad', `🌫️ No ledger. Your case will be made of adjectives.`) +
      debrief(`Without a record, a year of work compresses into “I've been doing a great job,” which is exactly what everyone says. Managers decide raises looking at whatever is legible at review time, and memory — theirs <i>and</i> yours — is brutally recency-biased. The fix is the “brag document”: five minutes a week logging what you did with numbers attached. It's not vanity; it's evidence, gathered while it's fresh.`);
    lesson('Without a brag document, a year of wins compresses into adjectives — log your deeds with numbers while they\'re fresh.');
  }
  renderScene(html, [{ label: '🕰️ Now — choose your moment to strike', primary: true, go: act2Timing }]);
}

function act2Timing() {
  renderScene(
    `<div class="location">Choosing the Moment</div>` +
      speech(null, `In the raise-hunt, <b>when</b> you strike matters nearly as much as how. Three moments present themselves:`),
    [
      {
        label: '⚔️ One week after the Caravan triumph — before the Winter Budget Council seals the coffers',
        hint: 'Your win is fresh; the gold is not yet allocated',
        primary: true,
        go: () => act2TimingResult('good'),
      },
      {
        label: '🔥 Right now, mid-Goblin-Crisis, while the Guildmaster fights three fires',
        hint: 'She\'s free! Technically. In the sense of being physically present.',
        go: () => act2TimingResult('bad'),
      },
      {
        label: '🎉 Ambush her at the Solstice Feast, goblet in hand',
        hint: 'What could be merrier?',
        go: () => act2TimingResult('feast'),
      },
    ]
  );
}

function act2TimingResult(when) {
  if (when === 'feast') {
    renderScene(
      `<div class="location">The Solstice Feast — A Tactical Retreat</div>` +
        speech('You', `“Guildmaster! Wonderful feast! Speaking of compensation—”`, 'you') +
        speech('Guildmaster Vexahlia', `She lowers her goblet exactly one inch. “Adventurer. It is the <i>solstice</i>. I have had four cups of honeywine and I am holding a small ceremonial sword. Whatever number you are about to say, the honeywine will say <b>no</b> for me — and neither of us will be able to cite it later. Book time with my clerk like a professional.”`) +
        banner('info', `🍷 No harm done — but no gold either. Serious asks need a serious setting.`) +
        debrief(`Hallway and party ambushes fail for a structural reason: a raise requires your manager to go <i>do something</i> — check budgets, talk to their boss, file paperwork — and an ambushed manager can only say the safe word, which is “no” (or worse, a vague “we'll see” that becomes policy). Book a real meeting, say what it's about, and give them the chance to prepare too. You want them able to say yes.`),
      [
        { label: '⚔️ After the Caravan triumph, before the Budget Council', primary: true, go: () => act2TimingResult('good') },
        { label: '🔥 Mid-Goblin-Crisis it is', go: () => act2TimingResult('bad') },
      ]
    );
    lesson('Never ambush — book a real meeting with an agenda, so the answer can be something other than the safe “no.”');
    return;
  }

  S.timing = when;
  let html = `<div class="location">The Moment: ${when === 'good' ? 'After the Triumph' : 'Mid-Crisis'}</div>`;
  if (when === 'good') {
    html +=
      speech(null, `One week after the Caravan's triumphant return, with the ballads still being sung, you book an audience — <i>before</i> the Winter Budget Council meets to seal the year's coffers. The Guildmaster receives you in a good mood, your victory still glowing in her ledger like a hot coal.`) +
      banner('good', `⚔️ Timing struck true: fresh win, unallocated gold, undivided attention.`) +
      debrief(`Raises come out of budget cycles, and the money is divided up <b>before</b> review season — by the time formal reviews happen, most of the pie is already sliced. The strongest timing stacks three things: a recent, visible win (recency bias working <i>for</i> you), a moment before budgets lock, and a manager with attention to spare. Ask your manager when comp planning actually happens; the answer is usually “earlier than you think.”`);
    lesson('Ask before budgets lock and soon after a visible win — by review season, the pie is already sliced.');
  } else {
    S.rapport = Math.max(0, S.rapport - 1);
    html +=
      speech(null, `You catch the Guildmaster between a goblin incursion report and a burning supply depot. She listens with one eye on the window, through which something is audibly exploding.`) +
      speech('Guildmaster Vexahlia', `“Is this about the depot? No? It's about <i>gold</i>? Adventurer, I say this with respect: read the room. The room is on fire.”`) +
      banner('bad', `🔥 Terrible timing. She'll hear you out — with half an ear and no patience. Your ask will land at half strength.`) +
      debrief(`The same case, made at the wrong moment, gets a fraction of the result — a distracted, stressed decision-maker defaults to “not now,” and “not now” has a way of hardening into “no.” Timing is a lever you fully control: after a win, before budgets lock, in a calm scheduled meeting. If the room is on fire, help put out the fire and ask next week; the contrast works in your favor.`);
    lesson('A strong case at a bad moment lands at half strength — timing is the one lever you fully control.');
  }
  renderScene(html, [{ label: '🐉 Make the ask', primary: true, go: act2Ask }]);
}

function act2Ask() {
  renderScene(
    `<div class="location">The Audience — Framing the Ask</div>` +
      speech('Guildmaster Vexahlia', `The reading glasses come out. “So. You wish to discuss your gold.” The quill hovers. “Make your case, Arcane Engineer.”`) +
      speech(null, `Three framings present themselves. Choose the shape of your attack:`),
    [
      {
        label: `💎 The Value Frame — deeds, numbers, market. “Here is what I've delivered, and here is what this expanded work commands.”`,
        hint: S.ledger ? 'Your Deeds Ledger makes this devastating' : 'Without the ledger, this will be… approximate',
        primary: true,
        go: () => act2AskResult('value'),
      },
      {
        label: `🥺 The Need Frame — “Rents in Emberhold have risen, and my tower has a leak…”`,
        hint: 'Appeal to the dragon\'s sympathy',
        go: () => act2AskResult('need'),
      },
      {
        label: `🃏 The Phantom Scroll — “The Silverquill Guild still writes to me, you know.”`,
        hint: 'Imply a rival offer you do not actually hold',
        go: () => act2AskResult('bluff'),
      },
    ]
  );
}

function act2AskResult(frame) {
  S.stance = frame;
  const timingMult = S.timing === 'good' ? 1.0 : 0.5;
  let html = `<div class="location">The Ask — ${frame === 'value' ? 'The Value Frame' : frame === 'need' ? 'The Need Frame' : 'The Phantom Scroll'}</div>`;
  let gain = 0;

  if (frame === 'value') {
    const pct = S.ledger ? 0.12 : 0.06;
    gain = Math.round((CURRENT_PAY * pct * timingMult) / 1000) * 1000;
    if (S.ledger) {
      html +=
        speech('You', `You open the Deeds Ledger on her desk. “In one year: the Autumn Caravan warded — <b>200,000 gold</b> of cargo, zero losses. Scrying costs cut <b>30%</b> — eleven thousand a year, every year. Two apprentices raised to journeyman. My scope has grown well past the contract we signed, and the market has moved with it. I'm asking for <b>${(CURRENT_PAY + gain).toLocaleString('en-US')}</b>.”`, 'you') +
        speech('Guildmaster Vexahlia', `She turns the ledger's pages slowly. Dragons have profound respect for well-kept ledgers; it is practically a courtship gesture. “Dates. <i>Witnesses.</i> You've made my case for me — do you know how rare that is? Usually I must reconstruct an adventurer's year from tavern rumor.”` + (S.timing === 'bad' ? ` She glances at the burning window. “Though your timing remains… crisis-adjacent, which limits me today.”` : ``));
    } else {
      html +=
        speech('You', `“This year I… warded the Caravan, which went very well. And the scrying budget is — smaller now? Substantially, I believe. The point is, my work has grown, and I'm asking for <b>${(CURRENT_PAY + gain).toLocaleString('en-US')}</b>.”`, 'you') +
        speech('Guildmaster Vexahlia', `“The Caravan, yes — that I remember. The rest arrives in the shape of a shrug.” She taps the quill. “I <i>believe</i> you, roughly. But I must defend every raise before the Council with numbers, and you've handed me adjectives.”` + (S.timing === 'bad' ? ` A muffled explosion outside. “At a poor moment, no less.”` : ``));
    }
    html += banner(gain >= 10000 ? 'good' : 'info', `💎 The Value Frame lands: the ask is on the table at <b>+${gain.toLocaleString('en-US')} gold</b> of force${S.ledger ? '' : ' — roughly half of what the ledger version would carry'}${S.timing === 'bad' ? ', dulled further by the burning room' : ''}.`);
    html += debrief(`Raises are approved by people who must justify them upward — your manager doesn't just decide, they <i>defend</i> the decision to a budget owner. The value frame works because it hands them the defense: concrete deliverables, quantified impact, and a note that your scope outgrew your title. “Pay for the job being done, at the market rate for that job” is an argument a budget committee can approve. Adjectives are not.`);
    lesson('Frame a raise as value delivered + market rate for your grown scope — you\'re arming your manager to defend it upward.');
  } else if (frame === 'need') {
    gain = Math.round((CURRENT_PAY * 0.03 * timingMult) / 1000) * 1000;
    html +=
      speech('You', `“Rents in Emberhold have risen terribly. My tower has developed a leak. Familiar feed is not what it cost. I could truly use more gold.”`, 'you') +
      speech('Guildmaster Vexahlia', `Her face softens — dragons are not heartless, merely well-audited. “I <i>am</i> sorry about the tower. Truly.” A pause. “But walk my ledger with me: I cannot write <i>‘his roof leaks’</i> in the justification column. The Council pays for the work, not the weather. Here—” she scratches a small figure, “—a hardship adjustment. It is what sympathy is worth in writing: something, and not much.”`) +
      banner('info', `🥺 Sympathy secured: a small <b>+${gain.toLocaleString('en-US')}</b> of force — the ceiling for need-based asks.`) +
      debrief(`The need frame is the most natural one to reach for and the weakest one to use: your expenses are real, but they're not the employer's pricing model. Compensation is priced on the value of the work and the market for your skills — a need-based ask caps out at whatever sympathy is worth, which is little, and it subtly reframes you as a cost to be managed rather than value to be retained. Same request, value frame, several times the result.`);
    lesson('Employers price work, not needs — a need-based ask caps at sympathy, while the identical request framed as value pays multiples more.');
  } else {
    // bluff
    S.rapport = Math.max(0, S.rapport - 2);
    gain = 0;
    html +=
      speech('You', `You lean back with practiced carelessness. “The Silverquill Guild still writes to me, you know. Frequently. <i>Warmly.</i> It would be a shame if the gold question made their letters more… interesting.”`, 'you') +
      speech('Guildmaster Vexahlia', `The reading glasses come off. This is never good. “Show me the scroll.” Silence. “You've named a rival's offer as your leverage. So: the scroll. The written terms. Show me.” More silence, in which you remember that you have, in fact, only a birthday card from their envoy. “Mm.” The glasses go back on. “Here is what you've taught me today, adventurer: your word requires auditing. That lesson will outlive this meeting.”`) +
      banner('bad', `🃏 Bluff called. <b>No gain</b>, rapport badly wounded — and every future claim you make now gets audited.`) +
      debrief(`Never invoke an offer you don't hold — and never invoke one you hold but wouldn't take. “Match this or I walk” invites exactly two responses: they match it (now you must be ready to stay on soured terms) or they say “safe travels” (now you must actually walk). A bluffed version adds the third and worst outcome: getting called, gaining nothing, and converting your credibility into a permanent audit flag. Real competing offers are excellent leverage — mentioned warmly, as in Quest I. Phantom ones are a self-inflicted wound.`);
    lesson('Only mention a competing offer if it\'s real and you\'d truly take it — a called bluff costs credibility you can\'t buy back.');
  }

  renderScene(html, [{ label: '🏛️ The Guildmaster consults the coffers…', primary: true, go: () => act2Vault(gain) }]);
}

function act2Vault(gain) {
  const halfNow = Math.round(gain / 2 / 500) * 500;
  const remainder = gain - halfNow;

  let opening;
  if (gain > 0) {
    S.offer = CURRENT_PAY + halfNow;
    opening =
      speech('Guildmaster Vexahlia', `She unrolls the budget scrolls and studies them, tapping a claw. “Here is my honest position. The Council has already sealed half the winter coffers. Today, I can grant you <b>${S.offer.toLocaleString('en-US')}</b>” — the quill hovers — “which is real gold, but I suspect not the whole of your hope. The question is what you do with an <i>almost</i>.”`);
  } else {
    S.offer = CURRENT_PAY;
    opening =
      speech('Guildmaster Vexahlia', `She folds her hands. “As matters stand, I'm granting nothing today — you've given me nothing I can carry to the Council.” A beat. The eyes over the reading glasses are, surprisingly, not unkind. “But the meeting isn't over unless you end it. The question is what you do with a <i>no</i>.”`);
  }

  renderScene(
    `<div class="location">The Vault — The Almost</div>` +
      opening +
      speech(null, `Every raise conversation reaches this chamber: the partial yes, or the flat no. Most adventurers mumble thanks and retreat. This is precisely where the real ones are won.`),
    [
      {
        label: `🗝️ “What would it take?” — turn the ${gain > 0 ? 'almost' : 'no'} into written criteria and a date`,
        hint: 'Convert a feeling into a contract',
        primary: true,
        go: () => act2VaultResult('criteria', gain, halfNow, remainder),
      },
      {
        label: '🧰 Pivot to the rest of the hoard — a Senior title and a training stipend',
        hint: 'When gold is sealed, other ledgers stay open',
        go: () => act2VaultResult('pivot', gain, halfNow, remainder),
      },
      {
        label: '🐁 “Ah. Well. Maybe later, then.” — retreat with a vague hope',
        hint: '“Later” is not a date',
        go: () => act2VaultResult('meek', gain, halfNow, remainder),
      },
    ]
  );
}

function act2VaultResult(move, gain, halfNow, remainder) {
  let html = `<div class="location">The Vault — Resolution</div>`;

  if (move === 'criteria') {
    S.rapport = Math.min(5, S.rapport + 1);
    const pactValue = gain > 0 ? Math.max(remainder, 3000) : 5000;
    S.perks.push({ icon: '📜', name: 'The Deeds Pact', value: pactValue, note: 'written raise criteria + review date' });
    html +=
      speech('You', `“Then let me ask the only question that matters: <b>what would it take?</b> Name the deeds, name the standard — and name the date we reopen this scroll. I'll have it in writing, and I'll hold up my half.”`, 'you') +
      speech('Guildmaster Vexahlia', `For the first time tonight, she looks genuinely pleased — the look of a dragon meeting a fellow keeper of ledgers. “<i>That</i> is the question, yes.” The quill moves with purpose. “Criteria: lead the Spring Convoy warding, deliver the new scrying array under budget. Date: first thaw, before the Council. Standard: ${gain > 0 ? `the remainder of your ask, in full` : `a proper raise, market-checked`}. Signed, sealed, witnessed by the clerk. Miss it and we speak plainly about why; meet it and the gold moves <i>without another battle</i>.”`) +
      banner('good', `🗝️ <b>The Deeds Pact</b> secured (+${pactValue.toLocaleString('en-US')} gold value): written criteria, a real date, and a raise that now defends itself.`) +
      debrief(`“What would it take?” is the single best sentence for a stalled raise. It converts a vague deferral into a concrete contract: specific criteria, a specific date, ideally in writing (a follow-up email — “capturing what we agreed” — counts). It also quietly flips the dynamic: your manager just co-signed the case they'll later have to defend. A “maybe later” with criteria and a date is a plan; a “maybe later” without them is a polite goodbye. Always leave with the date.`);
    lesson('When a raise stalls, ask “what would it take?” — then get the criteria and the review date in writing. Never leave with a vague “later.”');
  } else if (move === 'pivot') {
    S.perks.push({ icon: '🎖️', name: 'Senior Arcane Engineer (title)', value: 4000, note: 'seniority — compounds into every future negotiation' });
    S.perks.push({ icon: '📚', name: 'Grimoire Stipend (training)', value: 3000, note: 'annual conference & training budget' });
    html +=
      speech('You', `“Then let's spend from the ledgers that <i>aren't</i> sealed. The scope I carry is a Senior's scope — let the title say so. And a grimoire stipend: the Guild profits every time I learn something expensive.”`, 'you') +
      speech('Guildmaster Vexahlia', `Her eyebrows rise, then settle into approval. “The title costs me a line of ink and is frankly overdue. The stipend comes from the Lore budget, which the Council” — a conspiratorial pause — “never seals, because they never remember it exists. Done, and done.”`) +
      banner('good', `🎖️ <b>Senior title</b> + 📚 <b>Grimoire Stipend</b> secured (+7,000 gold value). The gold ledger was sealed; two others were wide open.`) +
      debrief(`When base salary is genuinely frozen — budget locks, comp bands, hiring freezes — the negotiation isn't over, it has changed ledgers. Titles, training budgets, scope, flexibility, and one-time bonuses all live in different pools with different approvers. The title deserves special note: it looks free, but it re-anchors every future negotiation — your next raise, and especially your next job, price against it. A senior title today is compound interest on every paycheck after it.`);
    lesson('When base pay is frozen, change ledgers: titles, training, scope, and bonuses have different budgets — and a title re-anchors every future negotiation.');
  } else {
    // meek
    html +=
      speech('You', `“Ah. Well. Maybe later, then,” you say, already halfway into a bow, already reaching for the door.`, 'you') +
      speech('Guildmaster Vexahlia', `“Later,” she agrees pleasantly, and the word evaporates even as it's spoken — no date, no deed, no witness. By spring, this meeting will exist only in your memory, and you already know how reliable <i>that</i> ledger is.`) +
      banner('bad', `🐁 You retreated with ${gain > 0 ? 'the partial raise and' : ''} a “later” worth exactly nothing. Undated hopes don't compound.`) +
      debrief(`“Maybe later” feels like a partial victory in the room and becomes nothing outside it: no criteria, no date, no record — and next quarter has its own fires. The uncomfortable truth is that a deferred raise you don't pin down simply doesn't happen; the queue of people asking again is short, and organizations quietly rely on that. If you take away one mechanical habit from this whole quest: never end a comp conversation without a date on the calendar and a sentence in writing.`);
    lesson('“Maybe later” without a date and written criteria is a no that spares your feelings — always pin the follow-up down.');
  }

  renderScene(html, [{ label: '📜 To the reckoning', primary: true, go: victory2 }]);
}

function victory2() {
  const perkTotal = S.perks.reduce((sum, p) => sum + p.value, 0);
  const total = S.offer + perkTotal;
  const delta = S.offer - CURRENT_PAY;

  let rank, rankNote;
  if (total >= 122500) { rank = 'S'; rankNote = 'The Council approves without a fight. The clerk asks for your notes.'; }
  else if (total >= 119000) { rank = 'A'; rankNote = 'A rich year\'s harvest, well argued.'; }
  else if (total >= 115500) { rank = 'B'; rankNote = 'Real progress — with gold left sleeping in the vault.'; }
  else if (total >= 111000) { rank = 'C'; rankNote = 'A step. The vault door barely noticed you.'; }
  else { rank = 'D'; rankNote = 'The coffers rest undisturbed. The Guildmaster files your visit under “weather.”'; }
  saveBest(2, rank, total);

  const perkRows = S.perks
    .map((p) => `<tr><td>${p.icon} ${p.name} <span style="color:var(--text-dim)">(${p.note})</span></td><td>+${p.value.toLocaleString('en-US')}</td></tr>`)
    .join('');

  const lessonItems = S.lessons.map((l) => `<li>${l}</li>`).join('');

  renderScene(
    `<div class="location">Quest II — The Reckoning</div>` +
      `<div class="rank">🏆 Rank ${rank}</div>` +
      `<div class="rank-note">${rankNote}</div>` +
      speech(null, `The audience ends. Guildmaster Vexahlia returns to her scrolls — but as you reach the door: <b>“Adventurer. Same time next year. Bring the ledger.”</b>`) +
      `<table class="loot-table">
        <tr><td>💰 Gold before the audience</td><td>${CURRENT_PAY.toLocaleString('en-US')}</td></tr>
        <tr><td>💰 Gold after (annual)</td><td>${S.offer.toLocaleString('en-US')}</td></tr>
        <tr><td style="color:var(--text-dim)">…raise won in the room</td><td class="${delta > 0 ? 'delta-up' : 'delta-down'}">+${delta.toLocaleString('en-US')}</td></tr>
        ${perkRows || `<tr><td style="color:var(--text-dim)">— nothing secured beyond the gold —</td><td>+0</td></tr>`}
        <tr class="total"><td>Total value claimed</td><td>${total.toLocaleString('en-US')}</td></tr>
      </table>` +
      banner('info', `For scale: the meekest path through this audience leaves with <b>${CURRENT_PAY.toLocaleString('en-US')}</b> and a vague “later.” The best clears <b>~123,500</b> in salary, sealed commitments, and titles. The difference was a ledger, a calendar, and four sentences.`) +
      `<div class="debrief"><div class="debrief-label">📜 Final debrief — what you take back to the real world</div>
        <ul class="lessons">${lessonItems || '<li>The vault opens for the prepared. Return with a ledger.</li>'}</ul>
        <p style="margin-top:10px">Raises compound harder than almost any other money decision you make: this year's base is next year's baseline, and your next job offers price against it. An hour of preparation — a brag document, a calendar check, a value frame, and “what would it take?” — repeats its payment every year you work.</p>
      </div>`,
    [
      { label: '🔄 Replay Quest II — argue it differently', primary: true, go: act2Intro },
      { label: '⚔️ Replay Quest I — The Dragon\'s Hoard', go: intro },
      { label: '🏰 Return to the title screen', go: titleScreen },
    ]
  );
}

/* ── The Sage's Codex: the cheat sheet, no dragons ── */

function codex() {
  S = null;
  hud.classList.add('hidden');
  const entry = (icon, title, body) =>
    `<div class="speech"><div class="speaker">${icon} ${title}</div><div>${body}</div></div>`;
  renderScene(
    `<div class="location">The Sage's Codex — every lesson, plain voice</div>` +
      speech(null, `Everything the quests teach, with the dragons removed. Read it the night before a real negotiation.`) +
      entry('🔮', 'Do the research first', `Before any comp conversation, know the market range for the role, level, and region (Levels.fyi, Glassdoor, posted salary bands). The information gap is the employer's main advantage; fifteen minutes closes most of it.`) +
      entry('📜', 'Build a BATNA', `Your leverage is your best alternative if this deal dies — ideally a real competing offer, but even active interviews change how you negotiate. Strong alternatives raise both your ask and your calm.`) +
      entry('🔥', 'Anchor deliberately', `First numbers pull final outcomes toward them. If you know the market, open high-but-defensible. If you don't, never guess — deflect, or ask “what's the budgeted range for this role?” (increasingly a question employers must answer).`) +
      entry('🧘', 'Hold the silence', `After they name a number, pause. Don't praise the offer, don't nervously ask if it's negotiable — say “thank you, let me consider the full picture,” and let the quiet work. Flexibility often surfaces unprompted.`) +
      entry('🤝', 'Counter warm-but-firm', `“I'm excited about this role, and — for me to say yes — the number needs to reflect the market, which I'm seeing at X.” Enthusiasm plus evidence beats aggression (invites retaliation) and meekness (donates the room they built in). Politely countering essentially never costs a real offer.`) +
      entry('⏳', 'Defuse manufactured urgency', `“This offer expires tomorrow” is almost always a pressure tactic. Calmly ask for a few days to review the full package; real offers survive that request. If your heart rate is making the decision, slow down.`) +
      entry('💎', 'Negotiate the package', `Base salary is one lever with the tightest constraints. Signing bonus, equity, PTO, remote flexibility, title, and training budget sit in different budgets with different approvers — when one lever jams, pull another. Compare offers on total value.`) +
      entry('📖', 'Keep a brag document', `Five minutes a week: what you did, with numbers (money saved, time cut, people trained). Raise decisions are made on what's legible at review time, and everyone's memory — including yours — is recency-biased.`) +
      entry('🕰️', 'Time the ask', `Raises come from budget cycles that lock before review season. Ask after a visible win, before the money is allocated, in a scheduled meeting with a stated agenda. Never ambush; ambushed managers can only say the safe word.`) +
      entry('⚖️', 'Frame value, not need', `Employers price the work and the market, not your rent. “Here's what I delivered, quantified; here's the market for my expanded scope; here's my ask” is an argument your manager can defend upward. Need-based asks cap at sympathy.`) +
      entry('🃏', 'Never bluff an offer', `Mention a competing offer only if it's real and you'd genuinely take it. “Match or I walk” has two honest endings — they match (be ready to stay) or you walk (be ready to go). A called bluff gains nothing and permanently discounts your word.`) +
      entry('🗝️', 'Turn “no” into criteria', `When a raise stalls: “What would it take?” Get specific criteria and a review date, then confirm in writing. A deferral with a date is a plan; a deferral without one is a polite no. Never leave the room without the date.`),
    [{ label: '🏰 Back to the title screen', primary: true, go: titleScreen }]
  );
}

/* ── Boot ── */

titleScreen();
