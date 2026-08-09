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
  invEl.innerHTML = badges.map((b) => `<span class="inv-badge">${b}</span>`).join('');
}

function lesson(text) {
  if (!S.lessons.includes(text)) S.lessons.push(text);
}

/* ── Title screen ── */

function titleScreen() {
  S = null;
  hud.classList.add('hidden');
  renderScene(
    `<div class="title-screen">
      <div class="dragon">🐉</div>
      <h1>Salary Quest</h1>
      <div class="tagline">Slay the dragon. Get the gold.</div>
      <div class="subtag">Your greatest foe is saying a number first.</div>
    </div>`,
    [
      { label: '⚔️ Begin the Quest', primary: true, go: intro },
      {
        label: '❓ What is this?',
        go: () =>
          renderScene(
            `<div class="title-screen"><div class="dragon">🐉</div><h1>Salary Quest</h1></div>` +
            speech(null, `A short interactive story about negotiating a job offer. The fantasy is a skin; every encounter teaches one real, research-backed negotiation principle, and a plain-language debrief after each battle tells you what just happened and why it works. One run takes about five minutes. Different choices, different gold.`),
            [{ label: '⚔️ Begin the Quest', primary: true, go: intro }]
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
      { label: '🔄 New quest — try a different path through the keep', primary: true, go: intro },
      { label: '🏰 Return to the title screen', go: titleScreen },
    ]
  );
}

/* ── Boot ── */

titleScreen();
