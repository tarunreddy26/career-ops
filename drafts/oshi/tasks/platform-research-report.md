# Platform Research Report — Virtual Gifting Systems

> **Sprint:** Gift Shop & Hoshi Coins (week of 2026-04-06)
> **Author:** Tarun Reddy Alla (Intern C — Research/QA)
> **Last updated:** 2026-04-07
> **Platforms covered:** SHOWROOM, Pococha, TikTok LIVE, with notes on Hololive/Nijisanji merch culture

---

## Executive Summary

Japan invented the virtual gifting economy. Every platform we studied follows the same core loop:

**Real money → virtual coins → gifts → performer reacts → viewer feels recognized → repeat**

The coin abstraction layer is non-negotiable — it removes the "sting" of per-purchase decisions and dramatically increases gift frequency. Oshi's Hoshi Coin system correctly follows this model.

Key takeaways for Oshi:
1. **The vtuber's reaction IS the product** — the gift is just the trigger. Invest heavily in reaction quality.
2. **Visibility = status** — bigger gifts need bigger on-screen effects. Whales want to be seen.
3. **Ranking/leaderboards drive competition** — fans compete to out-gift each other (V2 feature).
4. **Free gifts create habit** — let non-payers participate to normalize the behavior before conversion.
5. **Seasonal scarcity drives urgency** — limited-time gifts create FOMO spending spikes.

---

## 1. SHOWROOM (Japan's Top Idol Live-Gifting Platform)

### Currency System: Dual Model
- **Show Gold (paid):** Purchased with real money. Used to buy paid gifts that have monetary value to the performer.
- **Show Stars (free):** Earned through daily logins, watching streams, and completing missions. Used for free gifts that contribute to rankings but not performer revenue.
- Stars expire/reset periodically to prevent hoarding — pushes users to spend before they vanish.
- Free stars are the "gateway" — normalize gifting behavior before real spending begins.

### Gift Tiers & Pricing

| Tier | Examples | Cost | Visual Effect |
|------|----------|------|---------------|
| Free/Low | Stars, hearts, seed items | 1–10 Stars (free) | Small icons floating across screen |
| Mid | Flowers, cakes, instruments | 50–500 Gold | Moderate animations, brief screen takeover |
| High | Towers, castles, luxury items | 1,000–5,000 Gold | Full-screen animation lasting several seconds |
| Premium/Event | Limited-edition items | 5,000–50,000+ Gold | Elaborate animations, visible to all viewers |

### Performer Reactions
- **Real-time name call-outs** — performers thank gifters by username immediately
- **Gift menus** — performers set up informal rules: "If someone sends X gift, I'll do Y" (dance, song, funny face)
- **Milestone celebrations** — performers track cumulative counts and celebrate (e.g., "10,000 stars! Thank you!")
- **Memory across sessions** — top gifters are remembered and acknowledged in future streams

### What Makes It Sticky
1. **Parasocial bond** — performers are aspiring idols; fans feel they're supporting a real dream
2. **Real-time leaderboards** — competition for #1 supporter spot during streams
3. **Fan level system** — cumulative support unlocks badges, special chat colors. Switching performers = losing progress (switching cost)
4. **Scarcity** — event-exclusive gifts with hard deadlines create FOMO
5. **Social proof** — big gifts trigger screen-wide animations visible to ALL viewers

### Revenue Split
- **Platform takes ~70%, performer gets ~30%** (before agency cut)
- On mobile, app store takes additional ~30% before SHOWROOM's cut
- Effective performer take: ~15–30% of original purchase
- SHOWROOM pushes web purchases to avoid app store fees

### Unique Mechanics
- **Ranking battles** — real-time competitions where fans coordinate to push performers up rankings
- **Event system** — time-limited competitions tied to real auditions (AKB48, voice acting roles)
- **Gift combos** — rapid-fire tapping creates visible combo counters, social pressure to keep going

### What Oshi should steal
> The ranking system and fan level concept (V2). For V1, focus on the gift reaction loop — SHOWROOM proves that a performer's authentic reaction to a gift is what drives repeat spending.

---

## 2. Pococha (DeNA — Japan's #1 Live Streaming App)

### Currency System: Coins → Diamonds
- **Coins (viewer side):** Purchased with real money via in-app purchase
- **Diamonds (streamer side):** Earned when viewers send gifts. Cashed out for real money.
- Separation lets DeNA control exchange rates and take their platform cut
- Also has **free interactions** (hearts, pokes) that contribute to engagement metrics without costing coins

### Gift Tiers & Pricing

| Tier | Coin Cost | Examples | Animation |
|------|-----------|----------|-----------|
| Free | 0 | Hearts, pokes, emojis | Small, subtle |
| Low | 1–10 | Small flowers, stars | Brief pop-up |
| Mid | 10–100 | Cakes, drinks, plushies | Medium animation (2–3s) |
| High | 100–500 | Crowns, bouquets | Full-screen (3–5s) |
| Ultra | 500–10,000+ | Event-specific items | Elaborate full-screen with SFX |

Coin purchase: ~110 coins ≈ $1 USD

### Performer Reactions
- Name call-outs are considered **essential etiquette** on the platform
- Top-tier gifts get extended thanks, special poses, song requests
- Post-stream timeline posts thanking top supporters
- Combo counters trigger escalating excitement reactions

### Engagement Mechanics (Pococha's Secret Sauce)

**Family System:**
- Viewers join a streamer's "Family" (fan community)
- Family ranks based on cumulative support (watch time + gifts)
- Creates social switching costs — leaving means abandoning community status

**Ranking System (THE core differentiator):**
- Streamers placed on a ranked ladder: E → D → C → B → A → S (with sub-tiers)
- Rank determined by a "Rank Meter" that resets daily/weekly
- **Rank affects diamond conversion rate** — higher rank = more income per gift
- **Zero-sum** — for one streamer to go up, another must go down → creates urgency
- Fans coordinate to protect their streamer's rank

**Time-Based Engagement:**
- Watch time counts toward streamer metrics even without spending
- "Poco Boxes" — gacha-like rewards for accumulating watch time
- Daily login bonuses (free coins/items)

### Revenue Model
- ~100% gift-economy driven (minimal advertising)
- Streamer effective take: ~20–30% of original purchase (after app store + DeNA cut)
- **Unique: "Time Diamonds"** — streamers earn diamonds just for streaming, even with zero gifts. Subsidizes new streamers.

### What Oshi should steal
> The Family/fan community concept and the idea that passive presence has value. For V1, the key insight is that **rank-gated benefits drive long-term spending**, not just one-time gifts. Consider fan levels tied to cumulative gifting for V2.

---

## 3. TikTok LIVE (Global Virtual Currency Benchmark)

### Currency System: Coins → Gifts → Diamonds
- **Coins:** Purchased with real money (app or web)
- **Gifts:** Purchased with Coins, sent during LIVE streams
- **Diamonds:** What creators receive (cashed out for real money)

### Coin Pricing (US)

| Coins | Price (USD) | Rate |
|-------|-------------|------|
| 65 | $0.99 | ~$0.015/coin |
| 330 | $4.99 | ~$0.015/coin |
| 660 | $9.99 | ~$0.015/coin |
| 1,321 | $19.99 | ~$0.015/coin |
| 3,303 | $49.99 | ~$0.015/coin |
| 6,607 | $99.99 | ~$0.015/coin |
| 16,500 | $249.99 | ~$0.015/coin |

### Gift Catalogue

| Tier | Coin Range | Examples | Visual |
|------|-----------|----------|--------|
| Low | 1–99 | Rose (1), Ice Cream (1), Heart Me (10), Perfume (20) | Small icon in chat |
| Mid | 100–999 | Paper Crane (99), Love You (199), Money Gun (500) | Visible animation overlay |
| High | 1,000–9,999 | Drama Queen (5,000), Interstellar (10,000) | Full-screen takeover |
| Ultra | 10,000+ | Lion (~30,000), TikTok Universe (~35,000) | Massive multi-second animation, push notification to viewers |

Key insight: **Rose at 1 coin** is the entry-level gift. It costs almost nothing but creates the habit. Oshi's Morning Greeting Card (15 coins) serves this role.

### Creator Reactions
- Verbal shoutouts by username
- Escalating reactions proportional to gift value
- Gift goals: "If we hit 10,000 roses, I'll do X" — gamifies collective gifting
- Rose Battles: two creators head-to-head, audiences gift to make their creator win

### Engagement Mechanics
- **Combo/streak counters** — rapid-fire same gift creates visible combo ("Rose x100")
- **Real-time top gifter leaderboard** — top 3 get crown icons in chat
- **Weekly Top Gifter badge** — persists on viewer profile
- **Fan levels** — cumulative gifting unlocks badges, chat colors, emotes
- **Gifting battles** — two creators compete, whichever audience sends more wins
- **Gift goals** — visible progress bars that creators set

### Revenue Split

| Entity | Approximate Take |
|--------|-----------------|
| Apple/Google (mobile) | ~30% |
| TikTok | ~35–40% |
| Creator | ~30–35% |

Desktop purchases skip app store cut → better margins.

### What Oshi should steal
> The 1-coin entry gift (Rose equivalent) to create the gifting habit at near-zero cost. Also the combo counter mechanic — rapid-fire cheap gifts feel exciting and drive volume. Gift goals are a V2 feature worth building.

---

## 4. Hololive / Nijisanji (VTuber-Specific Patterns)

While these agencies use YouTube Super Chat rather than a custom gifting system, their merch and fan culture patterns are directly relevant:

### Calendar-Driven Releases
- **Debut anniversaries** — special merch drops, limited items
- **Birthday streams** — custom voice packs, commemorative badges
- **Seasonal events** — New Year, Valentine's, summer festival themed items
- **Milestone celebrations** — subscriber count milestones unlock special content

### Fan Badges & Membership
- YouTube channel memberships with tiered badges
- Members-only streams and emotes
- Fan marks (oshi marks) — unique emoji combos fans put in their bios

### What Oshi should steal
> The calendar-driven scarcity model. Plan gift catalogue refreshes around the vtuber's "birthday," seasonal Japanese events (hanami, tanabata, obon, New Year), and arbitrary "anniversary" dates. Scarcity + timing = urgency.

---

## Cross-Platform Comparison Table

| Feature | SHOWROOM | Pococha | TikTok LIVE | Oshi (V1) |
|---------|----------|---------|-------------|-----------|
| Virtual currency | Show Gold + Stars | Coins | Coins | Hoshi Coins |
| Free gifts | Yes (Stars) | Yes (hearts) | Yes (Rose = 1 coin) | Not in V1 |
| Gift tiers | 4+ | 5 | 4+ | 4 categories |
| Performer reaction | Live, personalized | Live, personalized | Live, personalized | Automated VRM |
| Ranking system | Yes (competition) | Yes (zero-sum) | Yes (leaderboard) | Not in V1 |
| Fan levels | Yes | Yes (Family) | Yes | Not in V1 |
| Seasonal gifts | Yes (event-driven) | Yes | Yes | Planned |
| Revenue split | ~70/30 (platform/creator) | ~70-80/20-30 | ~65-70/30-35 | N/A (AI vtuber) |
| Combo mechanic | Yes | Yes | Yes | Not in V1 |

---

## Recommendations for Oshi V1

1. **Nail the reaction loop first** — every platform proves that the performer's reaction is what drives repeat spending. Oshi's VRM reactions must feel genuine, not robotic.
2. **Keep a low-cost entry gift** (Morning Greeting at 15 coins works, but consider a 5-coin option for even lower friction)
3. **Make gift effects proportional to cost** — cheap = small icon, expensive = full-screen spectacle
4. **Log everything** — every transaction, every gift, every balance change. You'll need this data for V2 optimization.
5. **Don't build ranking/fan levels yet** — but design the DB schema to support them later (cumulative gift tracking per user).

---

## Sources & References

- SHOWROOM official platform (showroom-live.com)
- Pococha official platform (pococha.com)
- TikTok LIVE gifting documentation (support.tiktok.com)
- Hololive fan culture documentation and merch patterns
- Japanese virtual gifting market research (nagesen/投げ銭 culture analysis)
