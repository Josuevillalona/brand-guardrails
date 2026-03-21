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

## Current state summary

| Component              | Initial                     | Current                                        |
|------------------------|-----------------------------|------------------------------------------------|
| Brand extraction       | Firecrawl markdown → Claude text | Firecrawl + screenshotone (parallel) → Claude vision + text |
| Brand Kit fields       | 12                          | 18                                             |
| Prompt Block 2         | "professional quality, high detail" | DoF + camera angle + typography aesthetic |
| Prompt Block 3         | Global color palette        | Environmental/ambient tones; natural subject colors |
| Prompt Block 7         | `--no` Midjourney syntax    | "Do not include:" natural language             |
| Image generation       | DALL-E 3, 2× parallel calls | FLUX.1-dev via Replicate, single call num_outputs: 2 |
| Scoring                | Single aggregate score      | 6-dimension rubric + hard prohibited override  |
| Scoring enforcement    | Hero-mode for all images    | imageMode selector (Hero / Supporting / B-roll) |
| Scorer intent context  | None                        | userPrompt passed; subject matter treated as deliberate |
| Score calibration      | Conservative 55–75 range    | Explicit 0–100 band instructions               |
