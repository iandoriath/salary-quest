# ⚔️ Salary Quest 🐉

**Slay the dragon. Get the gold.**

*Your greatest foe is saying a number first.*

Salary Quest is a short, replayable browser game that teaches real, research-backed salary
negotiation — wearing a fantasy trench coat. You're an adventurer settling terms with a Guild.
The dragon isn't a monster; it's the salary conversation everyone's afraid of.

Every encounter teaches one principle in fantasy voice, then drops the act for a two-sentence
**post-battle debrief** that tells you the actual research behind what just happened. That
debrief is where the training lands.

## ▶️ Play

No build, no dependencies. Either:

- Open `index.html` in any browser, or
- Serve the folder: `python3 -m http.server` → http://localhost:8000

One run takes ~5 minutes. Different choices, different gold — the worst path signs at
**85,000**, the best clears **~153,000**. Same candidate, same guild, same evening.

## 🗺️ Fantasy → real-world mappings

| In the game | In real life |
|---|---|
| 🍺 Consulting the sages at the tavern | Market research (Levels.fyi, Glassdoor, posted pay bands). Skipping it debuffs you. |
| 📜 The Escape Scroll (rival guild's offer) | Your **BATNA** — a competing offer changes what you dare to ask for |
| 🔥 Casting the first spell | **Anchoring** — whoever names a number first sets the battlefield |
| 🧘 The Patience Check (a literal, real-time meter) | **Silence** after an offer. Don't blurt. Seriously, don't click the button. |
| 🤝 Diplomacy stance — "I'm excited about this role, *and*…" | Warm-but-firm counters, vs. Aggressive (backfires) and Meek (leaves gold on the hoard) |
| ⏳ The Hourglass Gambit | The **exploding offer** — manufactured urgency, and how to calmly dissolve it |
| 💎 The full loot table | **Total comp** — gold (base) is one slot; gems (equity), potions (PTO), the mount (remote), and the signing chest sit in different budgets |

## 🏗️ Structure

- `index.html` — shell + HUD
- `style.css` — dark-fantasy theme, parchment debriefs, the trembling blurt buttons
- `game.js` — scene-based state machine; all encounter logic, outcome math, and debrief text

State tracked per run: current offer, rapport with the Guildmaster (♥), market lore,
the Escape Scroll, patience-check result, chosen stance, and claimed perks — all of which
feed the final loot table and rank (D through S).

## 📚 The real ideas underneath

Anchoring effects (Tversky & Kahneman; Galinsky & Mussweiler on first offers), BATNA
(Fisher & Ury, *Getting to Yes*), warm-but-firm framing (Babcock, *Women Don't Ask*),
the documented discomfort of silence, why exploding offers are almost always bluffs, and
why total compensation is a package with independently movable parts.

This is a training game, not financial advice — but the dragon conversation is uncomfortable
for one hour, and the gold is yours for decades.
