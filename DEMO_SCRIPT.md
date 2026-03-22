# Demo Script — AI Brand Guardrails
**Audience:** Canva APM exercise reviewers
**Target time:** 5 minutes
**Format:** Live walkthrough of the running prototype

---

## Opening frame (30 sec)

> "Canva Teams is where brand governance matters most — multiple creators, one brand, constant risk of drift. Today I'll show a prototype for a feature I'm calling AI Brand Guardrails: a system that evaluates AI-generated images against a Brand Kit *before* they reach the canvas.
>
> The core product bet is that brand compliance is best enforced upstream — at generation time — not downstream in Design Approvals after the image is already on a slide."

---

## Phase 1 — Brand extraction (60 sec)

**What to show:** Brand setup screen → URL input → extraction in progress → Brand Kit reveal

**Steps:**
1. Open the app (homescreen: "What will you create today?")
2. Click "Start designing" → Brand setup screen
3. Enter a well-known brand URL (e.g. `stripe.com` or `notion.so`)
4. Hit Extract — walk through the loading steps as they animate

**Talking points while loading:**
- "Firecrawl scrapes the site into markdown. Claude reads it and infers 12 brand signals — not just colors, but render style, lighting preferences, mood adjectives, prohibited elements."
- "The key insight here: we ask Claude to return descriptive color names alongside hex values. *Deep navy blue* encodes better in image models than *#1a2744*. Hex is machine-native; descriptive names are model-native. That's the #1 fix for color drift."

**When kit reveals:**
- Point out the color palette strip — "these are the extracted palette colors, editable in one click"
- Point out the prohibited elements pills — "anything the brand explicitly avoids, surfaced automatically"
- "The user can tweak any field before generating. This is the contract between brand and AI."

---

## Phase 2 — Image generation (90 sec)

**What to show:** Generator panel → mode selector → generate → images appear → scores populate

**Steps:**
1. Click through to canvas → open the image generator panel
2. Select **Hero mode** — point to the mode callout: "Strict enforcement — color, render style, composition all scored to full brand standards"
3. Type a prompt: `"A laptop on a desk in a bright modern office"`
4. Hit Generate — two images generate in parallel
5. Watch score badges appear as scoring completes asynchronously

**Talking points:**
- "Two images always generate in parallel — different seeds, same prompt — giving the user an instant comparison."
- "Scoring is non-blocking: images render first, the score badge fills in after. The user never waits."
- "The score has six dimensions: color alignment, render style, mood/lighting, composition, overall cohesion, and a hard prohibited check. If any prohibited element is detected, the image is flagged off-brand regardless of all other scores."

**Show the score badge and dimension breakdown:**
- Click an image card to expand the score — walk through the dimension bars
- "The failing dimension is called out directly. This tells the creator *why* the image missed, not just that it did."

**Switch to B-roll mode, generate again:**
- "Switch to B-roll mode — now texture and atmosphere are weighted most heavily, composition is flexible. Watch how the score changes on the same type of image."

---

## Phase 3 — Alternatives and governance (60 sec)

**What to show:** Get alternative → off-brand override modal

**Steps:**
1. On a low-scoring image, click "Get alternative" — explain what's happening
2. Then deliberately place an off-brand image on the canvas

**Talking points:**
- "When an image misses, the system knows *which* dimension failed. The alternative generation uses that signal — if color alignment failed, the re-generation prompt adds explicit color reinforcement. It's a closed feedback loop."

**When placing off-brand image:**
- Override modal appears: "This is the governance gate. Off-brand images can still be placed, but the decision is captured. In production this feeds a compliance log — brand managers can audit what was overridden and why."

---

## Canvas and export (30 sec)

**What to show:** Drag image to canvas → download

**Steps:**
1. Accept an on-brand image — it lands on the canvas
2. Show it can be repositioned, resized
3. Hit the Download button — PNG downloads

**Talking point:**
- "The canvas is lightweight by design — this prototype focuses on the generation and scoring loop, not the full editor. The download means reviewers can take something away."

---

## Closing frame (30 sec)

> "What this prototype demonstrates is that brand compliance can be evaluated at the moment of generation — not after. The Brand Kit becomes a living spec that every AI image is measured against, automatically.
>
> The upstream enforcement model means fewer off-brand assets ever reach Design Approvals. The governance capture means when they do, there's an audit trail.
>
> This is the v1 surface. The roadmap extends it to post-generation compositing, a brand score trend dashboard, and a full 18-field Brand Kit — but the core loop is live and working today."

---

## Objections and responses

| Objection | Response |
|-----------|----------|
| "Why not just train the model on brand assets?" | "Fine-tuning is high-effort and brittle — every brand update requires a retraining cycle. This system works from a URL and updates in real time." |
| "What if the score is wrong?" | "Scores are a signal, not a gate. Users can always override with a reason. The system captures the decision either way — that's the governance value." |
| "This could slow down the generation flow." | "Scoring is fully asynchronous and non-blocking. Images render immediately, scores fill in after. Zero added latency on the generation path." |
| "What about non-image brand elements?" | "The Brand Kit includes a voice summary field for copy tone. The same extraction and scoring pattern applies to text generation — same architecture, different model task." |
| "How does this fit the Teams roadmap?" | "It's an additive feature: a Brand Kit connects to a Workspace, the scoring layer wraps the existing AI generation pipeline. No changes to the canvas or export path required." |

---

## Demo tips

- **Pre-warm the URL:** Run the extraction once before the demo so the API keys are warm and the response is fast.
- **Use Stripe or Notion:** Both have clean, crawlable homepages with strong visual brand signals. Avoid SPAs that require JavaScript rendering.
- **Have a fallback Brand Kit:** If extraction fails live, the store persists the last kit. Have it loaded before you start.
- **Score timing:** Scoring takes 8–15 seconds after images appear. Fill that time with the dimension breakdown explanation — it feels designed, not like waiting.
- **Off-brand image:** If no image scores off-brand naturally, use B-roll mode with a very specific brand prompt — the scoring is stricter and a low score is more likely.
