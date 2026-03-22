# Engineering decisions log
## AI Brand Guardrails — prototype

Running record of findings, changes, and trade-offs from initial scaffold to current state.
Ordered chronologically. Intended as context for future development and demo narrative.

---

## 1. Brand extraction: markdown-only → screenshot-augmented

**Initial approach**
Firecrawl scrapes the site into clean markdown. Claude reads the markdown and infers all brand
signals — colors, render style, lighting, mood — from copy tone and text descriptions.

**Finding**
Text inference cannot reliably extract visual signals. A site can describe itself as "bold and
modern" in copy while rendering in muted slate and gold. Claude's inferred colors were
reasonable but not pixel-accurate, and render style inference was essentially a guess based on
industry conventions rather than what the site actually looked like.

**Change**
Run `firecrawl.scrapeUrl()` and `screenshotone.com` in parallel via `Promise.all`. Pass the
screenshot as a base64 JPEG image block to Claude vision alongside the markdown. The extraction
prompt explicitly partitions tasks: all visual signals (colors, render style, lighting, DoF,
color grade, camera angle, environment) are read from the screenshot pixels; voice summary,
company name, and prohibited elements are read from the markdown.

**Trade-offs**
- New dependency: screenshotone.com (free tier: 100 screenshots/month — sufficient for demo)
- No latency penalty: screenshot and scrape run in parallel, not sequentially
- Graceful degradation: screenshot wrapped in try/catch — if it fails, falls through to
  markdown-only extraction without surfacing an error to the user
- Increased Claude input tokens (image block) → marginally higher extraction cost

---

## 2. Brand Kit: 12 fields → 18 fields

**Initial approach**
12-field Brand Kit per the original PRD: company name, URL, voice, colors (with descriptive
names), color temperature, color saturation, render style, mood adjectives, lighting style,
lighting temperature, shot type, negative space, prohibited elements.

**Finding**
Generated images consistently had a "heavy AI-generated" feel even with correct brand colors
and style. Root cause analysis identified three specific missing fields as the primary drivers:

- **Depth of field** — editorial photography is defined by shallow DoF (f/1.8–f/2.8). Without
  it, DALL-E/FLUX defaults to everything-in-sharp-focus renders — the primary visual marker of
  AI-generated imagery.
- **Color grade** — without an explicit grade instruction, FLUX defaults to its punchy,
  saturated baseline. Muted/neutral brands like OWN IT Coaching need `"desaturated highlights,
  warm lifted shadows, low contrast matte finish"` to prevent this.
- **Environmental context** — without it, the model improvises backgrounds arbitrarily.

**Change**
Promoted all six deferred roadmap fields into the live kit: `depthOfField`, `colorGrade`,
`environmentalContext`, `cameraAngle`, `aspectRatioConvention`, `typographyPersonality`.
All six are extracted from the screenshot by Claude vision (not inferred from copy).
Defaults are applied in the parser if a field isn't returned.

**Trade-offs**
- More complex extraction prompt and larger BrandKit JSON
- BrandKitPreview UI expanded — more to review before confirming
- `typographyPersonality` has the lowest direct impact on image generation (typography isn't
  renderable) but contributes to the aesthetic register language in Block 2
- The six fields add meaningful prompt tokens per generation call

---

## 3. Prompt engine Block 2: generic AI tropes → photography-specific language

**Initial approach**
Block 2 (style base): `"${renderStyle} style, professional quality, high detail"`

**Finding**
`"professional quality, high detail"` is the most overused DALL-E prompt pattern. The model
pattern-matches it to hyper-rendered, over-sharpened, uncanny-valley outputs — exactly the
opposite of editorial brand photography. This single phrase was a primary contributor to the
AI-generated feel across all brands tested.

**Change**
Block 2 now assembles: `"${renderStyle} style, ${depthOfField}, ${cameraAngle} camera angle,
${typographyPersonality} aesthetic"`. Photography-specific language reads as "real photography
reference" to the model rather than "generate with maximum AI processing."

**Trade-offs**
- None meaningful. Pure improvement.
- `typographyPersonality aesthetic` is slightly indirect as a generation signal but contributes
  to the overall register without causing harm.

---

## 4. Block 3 color direction: global → environmental/ambient scoping

**Initial approach**
Block 3: `"color palette featuring ${colorNames}, ${colorTemperature} color temperature,
${colorSaturation} saturation, ${colorGrade}"`

**Finding**
For a health coaching brand with charcoal, gold, and slate in its palette, generating an
avocado produced a charcoal-colored avocado. The model applied brand palette to the subject
itself, not just the environment.

**Product principle identified**
Brand-aware generation ≠ brand-colored generation. Brand color direction applies to
backgrounds, environments, and accent elements — not to subjects that have natural,
recognizable colors. An avocado on a charcoal slate surface with gold accent lighting is
on-brand. An avocado that has been turned charcoal-colored is broken. This distinction is worth
communicating explicitly in the deck.

**Change**
Block 3 now reads: `"background and environmental tones: ${colorNames}, ${colorTemperature}
color temperature, ${colorSaturation} saturation, ${colorGrade}, subject rendered with natural
authentic colors"`. The explicit `"subject rendered with natural authentic colors"` clause
prevents palette bleed onto the subject.

**Trade-offs**
- Slightly longer block
- The `"background and environmental tones"` scoping may over-constrain environments in
  fully abstract or hero images where the subject IS the brand color — acceptable edge case
  given the frequency of supporting/object imagery in real brand content

---

## 5. Negative prompt syntax: `--no` → natural language

**Initial approach**
Block 7 appended a Midjourney-style negative: `"--no stock photo staging, lens flare, clip
art..."`

**Finding**
DALL-E 3 (and FLUX) do not parse `--no` syntax. DALL-E's content filter was tripping on the
combination of arbitrary prohibited terms following `--no`, producing `content_policy_violation`
errors on otherwise clean prompts. The syntax is Midjourney-native and has no meaning in other
models.

**Change**
Block 7: `"Do not include: ${allNegatives.join(', ')}"`. Natural language instruction that
both models understand. Also trimmed the universal negative list to remove ambiguous terms
that could independently trigger content filters.

**Trade-offs**
- FLUX and DALL-E handle natural-language negatives less precisely than Midjourney's
  architectural negative prompt system. Some prohibited elements may still appear.
- Accepted: the hard `noProhibited` boolean in the scorer catches any violations regardless.

---

## 6. Image generation model: DALL-E 3 → FLUX.1-dev via Replicate

**Initial approach**
Two parallel OpenAI `images.generate()` calls (DALL-E 3, n=1 each) to produce two images.

**Findings**
- Content policy violations on brand prompts with prohibited element lists — even after
  fixing `--no` syntax, DALL-E's filter was sensitive to certain brand contexts
- Outputs had a characteristic DALL-E over-rendering quality inconsistent with editorial
  brand photography
- Required two separate API calls for two images (DALL-E 3 enforces n=1)
- Scoring latency downstream was affected by DALL-E's signed URL expiry

**Change**
Swapped to `black-forest-labs/flux-dev` via Replicate SDK. Single call with `num_outputs: 2`
replaces two parallel DALL-E calls. Params: `aspect_ratio: "1:1"`, `output_format: "webp"`,
`output_quality: 90`, `go_fast: false` (full quality weights), `guidance: 3.5`.

**Trade-offs**
- New dependency: Replicate (separate billing from OpenAI)
- FLUX.1-dev has no built-in content safety filtering — relies entirely on our prompt
  construction and the `noProhibited` scorer dimension for guardrails
- FLUX output URLs are Replicate CDN URLs (webp format) — scoring route fetches and converts
  to base64 immediately, so URL expiry is not a practical issue at prototype scale
- FLUX.1-dev is slower than DALL-E 3 for single images (~8–12s vs ~5–8s) but produces
  meaningfully higher quality photorealistic outputs with better prompt adherence
- Demo story: FLUX.1-dev is the same model tier as Canva's Dream Lab — using it positions
  the prototype as production-realistic, not a toy demo

---

## 7. Scoring: single aggregate → 6-dimension rubric with hard prohibited override

**Initial approach**
Single 0–100 score with a label and one-sentence explanation.

**Finding**
A single score gives no actionable direction. A score of 72 with no breakdown tells the user
their image is off-brand but not why or what to fix. The PRD's core claim — that the system
surfaces exactly what drifted — requires dimension-level visibility.

**Change**
Six-dimension rubric: `colorAlignment` (30%), `renderStyleMatch` (25%), `moodLighting` (20%),
`compositionFit` (15%), `overallCohesion` (10%), plus `noProhibited` as a hard boolean
override independent of the weighted average. The weighted score is recalculated server-side —
the model's self-reported score is discarded to prevent trusting model arithmetic.

`failingDimension` surfaces the single lowest-scoring dimension for targeted alternative
generation. "Get on-brand version" uses `buildAlternativePrompt()` which inserts a
dimension-specific reinforcement clause before the negative block.

**Trade-offs**
- Claude vision scoring takes 3–8s per image — async parallel to image display, never blocks
- Dimension scores are non-deterministic across repeated calls — same image may score ±5–10
  points across runs. Acceptable for a prototype; production would need score averaging or
  deterministic re-ranking
- `overallCohesion` proved difficult to calibrate (see finding #8 below)

---

## 8. Scoring calibration: hero-only enforcement → imageMode (Hero / Supporting / B-roll)

**Initial approach**
All images scored against the same 6-dimension rubric with identical weights regardless of
what the image was or why it was generated.

**Core finding**
This is not a calibration bug — it's a missing product concept. Real brand content teams
think in tiers. Hero images (campaign, key product shots) require full brand signal enforcement.
Supporting images (food, lifestyle, objects) use the brand's aesthetic feel but have subjects
with natural colors. B-roll (texture, detail, abstract) carries the brand primarily through
lighting and atmosphere.

Applying hero-mode enforcement to a food image produces false failures: an avocado scored 52
on `overallCohesion` because the scorer invented a "lacks connection to coaching themes"
narrative mismatch — a content strategy judgment the scorer has no business making when the
user deliberately chose the subject.

**Changes — implemented as three sub-fixes:**

**8a. Pass `userPrompt` to scorer**
The scorer previously received only the image and Brand Kit. With no context about intent,
it invented narrative mismatches. Now `userPrompt` is passed to the scoring API and injected
into the prompt: *"The user intended to generate: [userPrompt]. The subject matter was a
deliberate creative decision."*

**8b. `imageMode` selector (Hero / Supporting / B-roll)**
Three modes with different dimension weights:

| Dimension         | Hero | Supporting | B-roll |
|-------------------|------|------------|--------|
| colorAlignment    | 30%  | 15%        | 10%    |
| renderStyleMatch  | 25%  | 30%        | 30%    |
| moodLighting      | 20%  | 30%        | 35%    |
| compositionFit    | 15%  | 15%        | 15%    |
| overallCohesion   | 10%  | 10%        | 10%    |

Mode-specific prompt instructions for supporting/broll explicitly instruct Claude:
- Evaluate `colorAlignment` on environment/background only; subjects have natural colors
- Evaluate `overallCohesion` as *aesthetic* cohesion only — does it feel like the brand? Not:
  does it tell the brand story?
- Explanation text scoped to aesthetic signals only — never reference subject matter fit

**8c. Score range calibration**
Claude's scoring tends toward conservative middle values (55–75) when uncertain. Added explicit
band instructions: reserve 50–65 for genuine partial failures; correct render style + lighting
should produce 75+ even with minor secondary drift.

**Trade-offs**
- `imageMode` is user-selected — adds a decision point before generation. Mitigated by
  defaulting to `"supporting"` which covers the majority of real-world brand content use cases
- Mode selection is not persisted between sessions — acceptable at prototype scale
- The `noProhibited` hard override applies in all modes regardless of imageMode

---

---

## 9. Alternative generation: dimension name only → dimension + specific visual failures

**Initial approach**
"Generate alternative" passed only the `failingDimension` name (e.g. `"colorAlignment"`) to
`buildAlternativePrompt`. The function added a generic reinforcement clause for that dimension.

**Finding**
The reinforcement was accurate in category but not specific to the actual image. Two images can
both fail `colorAlignment` for completely different reasons — one because the colors are too
saturated, another because the brand's cool tones were replaced by warm ones. A generic
reinforcement clause doesn't know which problem to fix.

**Change**
`score.issues[]` and `score.explanation` (Claude's own written diagnosis of the image) are now
forwarded through the call chain: `onGetAlternative` → `generate()` → API route →
`buildAlternativePrompt`. The prompt appends:
- `"correct these specific issues: [issue1]; [issue2]"`
- `"previous attempt failed because: [explanation]"`

This closes the loop between the scorer and the generator — the model generating the
alternative now has the scorer's exact written diagnosis of what was wrong.

**Trade-offs**
- Adds ~50–100 tokens per alternative call
- Issues are written in Claude's evaluation language, not pure FLUX visual language. Mitigated
  because the issues tend to be visually descriptive ("colors too saturated", "background
  too bright") rather than abstract

---

## 10. FLUX guidance: fixed 3.5 → mode-adaptive (3.5 normal / 5.0 alternative)

**Finding**
FLUX guidance at 3.5 is "balanced prompt adherence" — the model is free to interpret loosely.
For a standard generation this is correct. For an alternative generation where we've injected
specific corrections, the model needs to follow the additions more strictly. At 3.5, the
reinforcement block was being partially ignored.

**Change**
`guidance: isAlternative ? 5.0 : 3.5`. Normal generations stay at 3.5. Alternative generations
bump to 5.0 to tighten adherence to the correction instructions.

**Trade-offs**
- Higher guidance can produce mild over-processing artifacts at the edges of complex prompts.
  5.0 is well within FLUX's safe range and was tested to not cause quality regressions.

---

## 11. noProhibited false positives: color inference → explicit logo detection only

**Finding**
Claude vision was setting `noProhibited: false` (triggering the hard off-brand override) when
an image contained colors associated with a competitor brand. For example: a pink jacket on a
passenger in an Uber-branded prompt was being interpreted as Lyft branding. The scoring prompt
said "detect ANY prohibited element" with no precision requirement.

**Change**
Added explicit instruction to the scoring prompt:
> "noProhibited: false ONLY if a prohibited element is explicitly and unambiguously visible —
> a legible logo, identifiable brand mark, or clearly depicted banned object. Do NOT set
> noProhibited: false based on color similarity alone. When uncertain, keep noProhibited: true."

**Trade-offs**
- Slightly increases false negative rate (missed actual violations). Accepted: a false positive
  (correctly scored image flagged as off-brand) is worse UX than a rare false negative.

---

## 12. Supporting mode scoring: "food, objects" → explicit human subject coverage

**Finding**
The supporting mode instruction read: *"Subjects (food, objects) have natural colors — do not
penalize for this."* Human lifestyle subjects (people, families, skin tones, clothing) were not
listed, so Claude vision was still penalizing a warm family-in-car image against Uber's black/
white palette even in supporting mode.

**Change**
Updated to: *"Subjects — including people, their skin tones, hair, and clothing — have natural
colors. Do NOT penalize for this."*

**Trade-offs**
- None. The existing intent always covered human subjects; the text just didn't say so.

---

## 13. Brand extractor: generic "competing brand logos" → named competitors

**Finding**
Prohibited elements were being extracted as generic phrases ("competing brand logos") that go
directly into the FLUX negative prompt. Generic phrases have weak effect on diffusion models.
For Uber, FLUX was generating rideshare imagery that occasionally included Lyft visual trade
dress (pink/magenta) because the negative prompt didn't name Lyft specifically.

**Change**
Updated extraction prompt to instruct Claude to name actual direct competitors:
> "For well-known brands, name actual direct competitors (e.g. for Uber: 'Lyft branding or
> pink trade dress', 'competing rideshare logos'). Be concrete and visual, not abstract."

**Trade-offs**
- Requires re-extraction to take effect on existing brand kits
- Claude may not know competitor names for niche brands — falls back to generic descriptions,
  which is acceptable

---

## 14. Background brand extraction: silent completion → visible progress + completion signal

**Finding**
If a user started brand extraction and closed the modal, the async fetch continued in the
background (Zustand state, not React state) and silently applied the brand kit on completion.
Users had no idea this happened — the brand kit would just appear applied without explanation.

**Change**
- During extraction (`brandExtracting: true`): nav shows animated dots + "Extracting brand…";
  brand panel shows a dedicated extracting state with the same messaging
- On completion: nav color swatches get a brief ring highlight; label flashes
  "[CompanyName] ready" for 2 seconds then settles
- Behavior unchanged: background fetch continues regardless of modal state

**Trade-offs**
- Extraction is not cancellable. If the user navigates away and back, the brand kit will
  silently apply. This is acceptable — canceling would lose all extraction progress for no
  benefit (the fetch is already in flight).

---

## 15. Default image mode: supporting → hero

**Decision**
Changed the default mode from `"supporting"` to `"hero"`.

**Reasoning**
Hero mode is full brand enforcement — the most demonstrably impressive mode for a first
impression. Supporting mode was a sensible default for real-world usage (most brand content
is lifestyle/supporting), but for a prototype demo the first generation should show the
system at maximum brand discipline.

---

## Current state summary

| Component              | Initial                     | Current                                        |
|------------------------|-----------------------------|------------------------------------------------|
| Brand extraction       | Firecrawl markdown → Claude text | Firecrawl + screenshotone (parallel) → Claude vision + text |
| Brand Kit fields       | 12                          | 18                                             |
| Prompt Block 2         | "professional quality, high detail" | DoF + camera angle + typography aesthetic |
| Prompt Block 3         | Global color palette        | Environmental/ambient tones; natural subject colors |
| Prompt Block 7         | `--no` Midjourney syntax    | "Do not include:" natural language             |
| Image generation       | DALL-E 3, 2× parallel calls | FLUX.1-dev via Replicate, single call num_outputs: 2 |
| Alternative generation | Dimension name only         | Dimension + score.issues + score.explanation   |
| Alternative guidance   | 3.5 (same as normal)        | 5.0 (tighter adherence to corrections)         |
| Scoring                | Single aggregate score      | 6-dimension rubric + hard prohibited override  |
| Scoring enforcement    | Hero-mode for all images    | imageMode selector (Hero / Supporting / B-roll) |
| Scorer intent context  | None                        | userPrompt passed; subject matter treated as deliberate |
| Score calibration      | Conservative 55–75 range    | Explicit 0–100 band instructions               |
| noProhibited trigger   | Any color/element inference | Explicit visible logos only                    |
| Supporting mode scope  | Food and objects only        | Food, objects, and human subjects              |
| Prohibited elements    | Generic phrases              | Named competitors + visual trade dress         |
| Default image mode     | Supporting                  | Hero                                           |
| Extraction progress    | Silent background            | Nav indicator + brand panel state + completion flash |
