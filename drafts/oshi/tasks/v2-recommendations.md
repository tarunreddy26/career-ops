# V2 Recommendations — What to Build Next

> **Sprint:** Gift Shop & Hoshi Coins (week of 2026-04-06)
> **Author:** Tarun Reddy Alla (Intern C — Research/QA)
> **Last updated:** 2026-04-07
> **Based on:** Platform research (SHOWROOM, Pococha, TikTok LIVE, Hololive/Nijisanji)

---

## Overview

V1 ships the core gifting loop: buy coins → send gifts → vtuber reacts → Genki increases. This document outlines what to build next, prioritized by impact and effort, based on what the top gifting platforms do to drive retention and revenue.

---

## Priority 1 — High Impact, Medium Effort

### 1.1 Fan Rank / Support Rank System (Pococha-inspired)

**What:** Track cumulative gifting per user. Assign visible rank tiers based on total coins spent over time.

**Why:** Pococha's entire retention engine is built on this. Fans who accumulate rank have switching costs — they won't leave because they'd lose their status. Creates long-term spending habits, not just one-time purchases.

**Suggested tiers:**

| Rank | Cumulative Coins Spent | Badge | Perks |
|------|----------------------|-------|-------|
| New Fan | 0–99 | None | Basic chat |
| Regular | 100–999 | Bronze heart | Chat badge |
| Dedicated | 1,000–4,999 | Silver star | Badge + colored name in chat |
| Core Fan | 5,000–19,999 | Gold crown | Badge + colored name + priority responses |
| Oshi | 20,000+ | Diamond oshi mark | All above + exclusive voice lines + profile badge |

**DB impact:** Add `total_coins_spent` to user record (V1 already logs all transactions in `coin_transactions`, so backfill is easy).

**Frontend:** Badge next to username in chat, visible rank on profile.

---

### 1.2 Gift Combo System

**What:** When a user sends the same gift multiple times rapidly (within 5 seconds), show a combo counter: "Onigiri x5", "Onigiri x10", etc.

**Why:** Every platform has this. It's the single most effective mechanic for driving volume on cheap gifts. Users get caught up in the visual spectacle of the counter climbing. SHOWROOM and TikTok users routinely send 50–100x combos on cheap items.

**Implementation:**
- Frontend: combo counter UI with escalating visual effects (bigger numbers, particle effects)
- Backend: batch the combo as a single transaction (deduct all coins at once on combo end, not per-tap)
- VTuber: escalating reactions — small combo = smile, big combo = overwhelmed/excited

**Effort:** Low-medium. Mostly frontend work with a small backend batch endpoint.

---

### 1.3 Seasonal / Limited-Time Gift Drops

**What:** Rotate seasonal gifts in and out of the catalogue on a calendar schedule tied to Japanese cultural events.

**Why:** Hololive and SHOWROOM both drive massive spending spikes around time-limited releases. Scarcity + cultural relevance = FOMO purchases.

**Suggested calendar:**

| Month | Event | Limited Gifts |
|-------|-------|---------------|
| January | New Year (Oshogatsu) | Kagami Mochi, Otoshidama (money envelope) |
| February | Valentine's Day | Honmei chocolate, heart letter |
| March–April | Hanami (Cherry Blossom) | Sakura bouquet (existing), hanami picnic set |
| July–August | Summer Festival (Natsu Matsuri) | Kakigori, Hanabi, Happi Coat, Goldfish scooping |
| August | Obon | Paper lantern, Yukata (existing) |
| October | Halloween | Costume set, trick-or-treat candy |
| December | Christmas / Year-end | Illumination gift, Christmas cake, kotatsu set (existing) |

**DB impact:** Already supported — `is_seasonal` boolean + `active` flag in `gift_catalogue`. Just need a cron/admin toggle.

---

## Priority 2 — High Impact, Higher Effort

### 2.1 Gift History & Gifting Leaderboard

**What:**
- Personal gift history: "You've sent 47 gifts this month" with a visual timeline
- Public leaderboard: Top 10 gifters for the current week/month

**Why:** TikTok's top gifter leaderboard is one of the strongest competitive spending drivers. Users actively try to outgift each other for the #1 spot. The personal history creates a sense of investment and progress.

**Implementation:**
- Backend: Already have all data in `user_gifts` and `coin_transactions`. Just need aggregation endpoints.
- Frontend: Leaderboard widget on the main screen, history page in profile.

---

### 2.2 Per-Item Unique Animations

**What:** Upgrade from 4 shared reaction animations (eat, equip, blush, happy) to unique animations per gift item.

**Why:** V1 uses category-based reactions (all food items trigger `react_eat`). This works for launch but gets repetitive. Unique reactions per gift make each purchase feel special and increase perceived value of premium items.

**Effort:** High — requires VRM animation work per item. Prioritize the top 5 most-sent gifts first, then expand.

---

### 2.3 Gift Goals / Milestones

**What:** VTuber sets a visible "gift goal" — a progress bar that fills as viewers collectively send gifts. When the goal is met, something special happens (special animation, outfit unlock, exclusive voice line).

**Why:** TikTok's gift goals turn individual gifting into a collective effort. Users who might not spend alone will spend to contribute to a shared goal. Drives volume from mid-tier spenders.

**Implementation:**
- Backend: `gift_goals` table (id, target_coins, current_coins, reward_type, active)
- Frontend: progress bar widget, celebration animation on completion
- VTuber: special reaction when goal is hit

---

## Priority 3 — Medium Impact, Low Effort (Quick Wins)

### 3.1 Free Daily Gift

**What:** Give every user 1 free gift per day (e.g., a heart or basic greeting) that costs 0 coins.

**Why:** SHOWROOM's free Stars and TikTok's 1-coin Rose normalize gifting behavior before users spend real money. Users who gift for free are far more likely to convert to paid gifters. This is the #1 conversion tactic across all platforms studied.

**Implementation:** Add a 0-coin gift to catalogue + daily cooldown check (similar to daily check-in logic already in Genki meter).

---

### 3.2 Gift Preview Before Purchase

**What:** Tapping a gift in the shop shows a preview of the VTuber's reaction animation before the user commits to buying.

**Why:** Previews increase conversion — users want to see what they're paying for. Also builds anticipation and makes the experience feel premium.

**Implementation:** Frontend-only. Play the VRM reaction animation in a modal/overlay without actually sending the gift.

---

### 3.3 "Insufficient Coins" → Coin Shop Redirect

**What:** When a user tries to send a gift they can't afford, show a clear message with the deficit and a one-tap button to the Coin Shop, pre-selecting the smallest bundle that covers the gap.

**Why:** This is in the V1 brief but worth emphasizing — every friction point in the purchase flow is lost revenue. The redirect should feel helpful, not pushy.

**Implementation:** Frontend logic — compare balance vs gift cost, calculate deficit, recommend bundle.

---

## Priority 4 — Future / Long-Term

### 4.1 Gift Gacha / Mystery Box

**What:** A mystery gift box at a set coin price that randomly gives one of several possible items (with different rarities). Think gacha mechanics.

**Why:** Gacha is a proven Japanese monetization mechanic (Fate/Grand Order, Genshin Impact). Users spend more on randomized rewards than fixed-price items due to the dopamine of uncertainty.

**Caution:** Legal considerations — some regions regulate gacha/loot boxes. Research local laws before implementing.

---

### 4.2 Group Gifting

**What:** Multiple users pool coins to collectively send an expensive gift that no single user could afford alone.

**Why:** Makes premium gifts accessible to casual spenders. Creates community bonding moments. Pococha's Family system hints at this — fans coordinate to achieve collective goals.

---

### 4.3 Gift Reactions Based on Genki State

**What:** The VTuber reacts differently to the same gift based on her current Genki tier. A tired VTuber reacts more dramatically to food ("I was so hungry...!") than a full-energy one.

**Why:** Makes the Genki system feel more alive and adds replay value to gifting. Users learn to "read" the VTuber's mood and gift accordingly.

**Implementation:** Multiply the reaction animation intensity / voice line set based on current `GenkiTier`. 4 tiers × 4 base reactions = 16 reaction variants.

---

## Build Order Recommendation

If building sequentially after V1 ships:

1. **Free daily gift** (P3 — quick win, drives conversion) — 1–2 hours
2. **Gift combo system** (P1 — drives volume) — 4–6 hours
3. **Fan rank system** (P1 — drives retention) — 6–8 hours
4. **Seasonal drops** (P1 — drives FOMO) — 2–3 hours (mostly catalogue + toggle)
5. **Leaderboard** (P2 — drives competition) — 4–6 hours
6. **Gift goals** (P2 — drives collective spending) — 6–8 hours
7. **Per-item animations** (P2 — drives perceived value) — ongoing
8. **Genki-aware reactions** (P4 — polish) — 4–6 hours
