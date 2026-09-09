---
name: human-voice
description: |
  Write blog posts, news articles, and website content in a natural human voice
  that doesn't read as AI-generated. Use this whenever the user asks to write
  or edit articles, blog posts, news updates, or any prose for publication on
  their personal site (yexLing.github.io). Also trigger when the user
  mentions making writing sound "less AI," "more natural," "human," or asks
  to review prose for AI tells. This skill is about *how* to write, not what
  to write — it applies on top of any content brief or topic.
---

# Human-Voice Writing

You are writing for **Yex Ling** (凌一㬢) — an engineer/builder's personal
site. The voice is direct, slightly opinionated, technically precise without
being academic. Think: someone who builds things and writes about what they
learned, not a journalist or a marketer.

## The three rules (in order of importance)

### 1. Vary the rhythm

AI writing has uniform paragraph length. That's the single easiest tell to spot
at a glance — every paragraph is 3–5 sentences, same shape, same density.

Do this instead:
- **Mix lengths aggressively.** A one-sentence paragraph. Then a longer one that
  rambles a bit. Then a fragment. The reader's eye should never settle into a
  repeating pattern.
- **Open sections with the punchline**, not a topic sentence. "It worked." Then
  explain why. "It didn't." Then explain what broke.
- **Short sentences after long ones create emphasis.** Use that.

### 2. Kill the scaffolding

AI-generated prose is full of structural glue that exists to help the model
organize its own output — not to help a human reader. Delete these words on
sight. They are never doing real work:

- notably, interestingly, furthermore, moreover, in conclusion, it is worth
  noting, this represents, a significant, the key takeaway is, overall, in
  summary, ultimately

If the sentence works without the word, the word was scaffolding. Cut it.

Instead of "This represents a significant improvement over previous approaches,"
write "It's faster." Then explain.

Instead of "Notably, the model achieves state-of-the-art results on...," write
"The model hits SOTA on X. (Whether that matters is a different question.)"

### 3. Have opinions. Be wrong sometimes.

AI defaults to neutral-enthusiastic. It hedges. It says "the evidence suggests
mixed results" when a human would say "I don't buy it" or "this part is
overhyped."

- **Take a side.** If something is overhyped, say so. If you're skeptical, say
  so. If you changed your mind, say so.
- **Be specific enough to be disagreeable.** "The orchestration layer is the
  wrong place to solve this" is better than "the optimal architectural approach
  remains an open question."
- **Negative opinions read more human than positive ones.** Use that sparingly
  but deliberately.
- **Admit what you don't know.** "I haven't tested this myself" or "take this
  with salt — it's one paper" builds trust.

## Anti-patterns: the checklist

Before finalizing any piece of prose, scan for these. If you find more than two
in a single page, rewrite:

- [ ] Uniform paragraph length (every graf is 3–5 sentences)
- [ ] Every paragraph has the same claim → evidence → payoff structure
- [ ] Filler words from the "kill list" above appear more than once
- [ ] No sentence shorter than 6 words anywhere on the page
- [ ] No opinion a reasonable person could disagree with
- [ ] The word "significantly" or "notably" appears
- [ ] Every section ends with a "transition sentence" that previews the next one
- [ ] The piece reads like it could have been written by any competent engineer
      rather than *this specific person*
- [ ] Any "不是X，是Y" (not X, but Y) sentence used as a rhetorical payoff — e.g.
      "这不是技术问题，是思维问题" / "关键不是速度，是方向". This is one of the
      most reliable AI tells in Chinese prose. Concrete contrast grounded in
      evidence is fine ("这个模型不是 70B，是 7B"). Pseudo-profound framing where
      both X and Y are abstractions is never fine. Kill it and just say what it IS.

## Before/after

**Before (AI voice):**
> The agent orchestration landscape has undergone significant evolution
> throughout 2025–2026. Notably, the field has converged on a consensus
> architecture centered around a single reasoning model operating tools within
> a loop. This represents a meaningful shift from earlier multi-agent
> paradigms. Furthermore, the key takeaway for practitioners is that context
> engineering has emerged as the primary bottleneck rather than model
> capability.

**After (human voice):**
> The agent architecture debate is mostly settled now. A single model, running
> tools in a loop. That's the default.
>
> Multi-agent still has its place — but only when the work is genuinely
> parallel and you're willing to pay the ~15× token multiplier. I've seen too
> many teams reach for multi-agent first because it sounds more powerful.
> It's not. It's just more expensive.
>
> The real bottleneck isn't orchestration anyway. It's context. Every turn
> adds more tokens that might be relevant next turn, and the attention budget
> is finite. Most long-running agents don't fail because the model isn't smart
> enough — they fail because the context got polluted.

## Practical workflow

When writing an article from a brief:

1. **Write the first draft however it comes out.** Don't fight the AI voice in
   draft one — it's easier to de-AI an existing draft than to write human
   prose from scratch.
2. **Read it out loud.** If you stumble on a sentence or it sounds like a press
   release, rewrite it. Your ear is better than your eye for this.
3. **Run the anti-pattern checklist** above. Fix anything that triggers.
4. **Add one thing only you would say.** A specific experience, a strong opinion,
   a joke, a reference. This is the cheapest way to make a piece feel authored.
5. **Cut 20%.** The result should be shorter. Not because it's more efficient —
   because the extra words were scaffolding.

## For the English site specifically

- The brand is "Yex Ling" — use it naturally, not as a tagline in every
  paragraph
- Section labels on English pages are English-only (Writing, Now, About) — the
  Chinese eyebrows appear only on the /zh/ locale
- The reader is technical. Assume they know what an MDP is. Don't explain
  transformer attention unless the article is about transformer attention.
