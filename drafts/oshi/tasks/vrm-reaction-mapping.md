# VRM Reaction Mapping — Gift Category → Animation States

> **Sprint:** Gift Shop & Hoshi Coins (week of 2026-04-06)
> **Author:** Tarun Reddy Alla (Intern C — Research/QA)
> **Last updated:** 2026-04-07

## Overview

Each gift triggers a VTuber reaction. For V1, reactions are mapped **per category** (not per individual item) to keep the animation workload manageable. This document maps every gift category to its VRM animation state, facial expression blend shapes, voice line type, and Genki meter effect.

---

## Existing Genki Tier System (for reference)

The VTuber already has 4 idle animation states based on Genki value:

| Tier | Genki Range | Idle Animation |
|------|------------|----------------|
| `full_energy` | 76–100 | Bouncy idle, bright eyes |
| `good` | 51–75 | Normal idle, standard expressions |
| `tired` | 26–50 | Slower idle, drooped posture |
| `very_tired` | 0–25 | Minimal movement, half-closed eyes |

Gift reactions are **overlay animations** that play on top of the current idle state, then return to idle.

---

## V1 Shared Animation States (4 base reactions)

These are the 4 reaction animations needed for V1. Each plays for 2–4 seconds, then blends back to idle.

| Reaction ID | Animation Description | Used By |
|-------------|----------------------|---------|
| `react_eat` | Holds item near mouth, chewing motion, happy expression | Food, Snack, Drink |
| `react_equip` | Touches head/body where item goes, twirl/pose, proud smile | Accessory, Outfit |
| `react_blush` | Hands near face, looks down, cheeks flush, shy smile | Affection, Tegami |
| `react_happy` | Arms up or clasped, big smile, sparkle eyes, excited bounce | Flowers, Lucky item, Premium, Milestone |

---

## Full Reaction Mapping Table

### Care Items (low cost, high frequency)

| Gift | Coins | Category | Reaction ID | Blend Shapes | Voice Line Type | Genki Boost |
|------|-------|----------|-------------|-------------|----------------|-------------|
| Onigiri (おにぎり) | 20 | Food | `react_eat` | `mouthOpen: 0.6`, `eyeSquint: 0.4` (happy squint) | Eating sounds + "おいしい！" (Delicious!) | +5 |
| Ramen bowl (ラーメン) | 50 | Food | `react_eat` | `mouthOpen: 0.8`, `eyeWide: 0.5` (excitement) | Slurp SFX + "あったかい～" (So warm~) | +10 |
| Matcha latte | 30 | Drink | `react_eat` | `mouthFunnel: 0.4`, `eyeClosed: 0.3` (content sip) | Sip SFX + "ほっとする…" (So relaxing...) | +7 |
| Taiyaki (鯛焼き) | 40 | Snack | `react_eat` | `mouthSmile: 0.7`, `eyeSquint: 0.5` (giggle) | Bite SFX + "しっぽから食べるタイプ！" (Tail-first type!) | +8 |
| Strawberry daifuku | 35 | Snack | `react_eat` | `mouthSmile: 0.8`, `eyeClosed: 0.4` (savoring) | "いちご大福大好き！" (I love strawberry daifuku!) | +7 |
| Warm blanket | 60 | Comfort | `react_blush` | `eyeClosed: 0.5`, `mouthSmile: 0.4` (cozy) | "あったかい…ありがとう" (Warm... thank you) | +12 |
| Head pat (頭なでなで) | 25 | Affection | `react_blush` | `cheekPuff: 0.3`, `eyeLookDown: 0.6` (shy) | "えへへ…" (Ehehe...) + blush SFX | +6 |
| Morning greeting card | 15 | Daily care | `react_blush` | `mouthSmile: 0.5`, `eyeWide: 0.3` (touched) | "おはよう！読んでくれたの？" (Good morning! You read it?) | +3 |

### Accessories & Cosmetics (medium cost, equips on model)

| Gift | Coins | Category | Reaction ID | Blend Shapes | Voice Line Type | Duration |
|------|-------|----------|-------------|-------------|----------------|----------|
| Hair ribbon | 150 | Accessory | `react_equip` | `mouthSmile: 0.7`, `eyeWide: 0.4` (excited) | "似合う？" (Does it suit me?) + twirl | 7 days |
| Cat ear clip | 200 | Accessory | `react_equip` | `mouthOpen: 0.3`, `eyeWide: 0.6` (playful) | "にゃん！" (Nyan!) + cat pose | 7 days |
| Flower crown | 180 | Seasonal | `react_equip` | `mouthSmile: 0.8`, `eyeClosed: 0.3` (graceful) | "お姫様みたい…" (Like a princess...) | 7 days |
| Star hairpin | 120 | Accessory | `react_equip` | `mouthSmile: 0.6`, `eyeSquint: 0.4` (pleased) | "キラキラ！" (Sparkly!) | 7 days |
| School bag charm | 100 | Accessory | `react_equip` | `mouthSmile: 0.5`, `eyeWide: 0.3` (happy) | "かわいい！つけるね" (Cute! I'll put it on) | 7 days |

### Clothing & Outfits (premium, high impact)

| Gift | Coins | Category | Reaction ID | Blend Shapes | Voice Line Type | Duration |
|------|-------|----------|-------------|-------------|----------------|----------|
| Summer yukata | 500 | Outfit | `react_equip` | `mouthSmile: 0.8`, `eyeClosed: 0.5` (elegant) | "夏祭り気分！" (Summer festival mood!) + twirl | 30 days |
| Winter kotatsu set | 600 | Outfit | `react_equip` | `eyeClosed: 0.6`, `mouthSmile: 0.5` (cozy) | "こたつ最高…出られない" (Kotatsu is the best... can't leave) | 30 days |
| School uniform | 450 | Outfit | `react_equip` | `mouthSmile: 0.6`, `eyeWide: 0.4` (energetic) | "学校行くよ！" (Going to school!) + salute | 14 days |
| Idol stage outfit | 800 | Outfit | `react_equip` | `mouthOpen: 0.5`, `eyeWide: 0.7` (starstruck) | "ステージに立てる！" (I can stand on stage!) + pose | 30 days |
| Maid café uniform | 600 | Outfit | `react_equip` | `mouthSmile: 0.7`, `eyeSquint: 0.3` (playful) | "お帰りなさいませ、ご主人様！" (Welcome home, master!) + bow | 14 days |

### Special / High-Value Gifts (nagesen moment)

| Gift | Coins | Category | Reaction ID | Blend Shapes | Voice Line Type | Effect |
|------|-------|----------|-------------|-------------|----------------|--------|
| Omamori charm (お守り) | 300 | Lucky item | `react_happy` | `eyeClosed: 0.4`, `mouthSmile: 0.6` (reverent) | "大切にするね…" (I'll treasure it...) + whisper | Mood boost 24h |
| Sakura bouquet | 400 | Flowers | `react_happy` | `eyeWide: 0.6`, `mouthOpen: 0.5` (awestruck) | "きれい…！" (Beautiful...!) + sparkle SFX | Full genki restore |
| Handwritten letter | 250 | Tegami | `react_blush` | `eyeWide: 0.5`, `cheekPuff: 0.2` (emotional) | "読むね…" (Let me read it...) + reading animation | +15 genki |
| Uchiwa fan (うちわ) | 350 | Idol culture | `react_happy` | `mouthSmile: 0.8`, `eyeSquint: 0.4` (idol mode) | "応援ありがとう！" (Thanks for cheering me on!) + wave | Fan rank badge |
| Birthday cake | 1,000 | Milestone | `react_happy` | `eyeWide: 0.8`, `mouthOpen: 0.6` (overwhelmed) | "えっ…誕生日覚えてくれたの？" (You remembered my birthday?) | Birthday scene unlock |
| Shooting star | 2,000 | Premium | `react_happy` | `eyeWide: 0.9`, `mouthOpen: 0.7` (speechless) | "星に名前…？泣いちゃう…" (A star with my name? I'll cry...) | Named star + badge |

---

## Animation Priority Rules

1. **Gift reactions override idle** — when a gift is sent, the reaction plays immediately (2–4s), then blends back to the current Genki idle state
2. **Queue, don't skip** — if multiple gifts arrive quickly, queue reactions (max 3 in queue, drop oldest if exceeded)
3. **Genki tier transition** — if a gift's Genki boost pushes the user into a new tier, the idle animation transitions AFTER the gift reaction ends
4. **Equip persistence** — accessories/outfits stay on the model after the reaction ends, for the duration specified

---

## Blend Shape Reference (VRM Standard)

These are standard VRM blend shape names used above:

| Blend Shape | What it controls |
|------------|-----------------|
| `mouthOpen` | Jaw open amount (0–1) |
| `mouthSmile` | Corners of mouth up (0–1) |
| `mouthFunnel` | Lips pursed/forward (0–1, for drinking) |
| `eyeWide` | Eyes open wide — surprise/excitement (0–1) |
| `eyeSquint` | Eyes squinting — happy/laughing (0–1) |
| `eyeClosed` | Eyes closed — content/savoring (0–1) |
| `eyeLookDown` | Eyes cast down — shy (0–1) |
| `cheekPuff` | Cheeks puffed — cute/pouty (0–1) |

---

## V2 Enhancements (out of scope this sprint)

- **Per-item unique animations** — instead of 4 shared reactions, each gift gets a custom animation
- **Combo reactions** — sending 3+ gifts in a row triggers a special "combo" animation (excited jumping, confetti)
- **Tier-aware reactions** — reactions differ based on Genki state (a tired VTuber reacts more dramatically to food)
- **Sound layering** — background music shifts momentarily when high-value gifts are sent
