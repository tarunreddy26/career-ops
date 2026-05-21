

| oshi MONETISATION SPRINT  ·  INTERN BRIEF The Gift Shop — Virtual Gifting & Care Economy |
| :---- |

| Feature | Gift Shop — Virtual gifting & care items |
| :---- | :---- |
| **Team** | 3 interns (split: Frontend · Backend · Research/QA) |
| **Sprint length** | 1 week |
| **Total hours** | 30 hours (10 per intern) |
| **Payment provider** | Stripe (Checkout Sessions API) |
| **Currency model** | Virtual coin system — Hoshi Coins (星コイン) |
| **Priority** | P0 — first monetisation layer, unlocks all future paid features |

# **What the Japanese Market Taught Us**

Before building, you should understand why this model works. Japan invented the virtual gifting economy and every decision in this brief is rooted in what those platforms learned.

| Platform / Concept | What Oshi should steal from it |
| :---- | :---- |
| **SHOWROOM** *Japan's top idol live-gifting platform* | Virtual gifts displayed as real animations on screen. Fans buy "items" (roses, stars, stage props) that appear in the stream. The idol reacts live. Gift visibility \= social status. Direct inspiration for Oshi's gift animation system. |
| **Nagesen (投げ銭)** *Japan's digital coin-throwing tradition* | Rooted in the cultural act of throwing coins at shrines. YouTube SuperChat (Supacha) made this digital. Estimated ¥200bn+ domestic market. The emotional act of giving is as important as the amount. Oshi's gifts should feel like an offering, not a transaction. |
| **Pococha** *Japan's \#1 live streaming app* | Uses a "support rank" system — fans earn status based on how much they give over time, not just single large gifts. Creates loyalty loops. Oshi should have a visible fan rank tied to cumulative gifting. |
| **TikTok Coins model** *Global virtual currency benchmark* | Real money → coins → gifts → creator income. The coin layer creates psychological distance from real spending, increases gift frequency, and allows bundle pricing. This is the exact model Oshi should replicate with Hoshi Coins. |
| **Hololive / Nijisanji** *World's top vtuber agencies* | Merch drops, limited seasonal items, fan badges — all timed around vtuber anniversaries, birthdays, and events. Scarcity and timing drive urgency. Oshi's seasonal gift items (New Year omamori, summer festival items) should follow this calendar pattern. |

# **The Hoshi Coin System (星コイン)**

Do not implement direct real-money gifts. A virtual coin layer between the user's wallet and the gift is essential. It is how every successful Japanese gifting platform works.

## **How it works**

* **Step 1:** User buys a bundle of Hoshi Coins with real money via Stripe

* **Step 2:** User spends Hoshi Coins on gifts from the in-app Gift Shop

* **Step 3:** Gift is sent to the vtuber — she reacts in real time with animation \+ voice

* **Step 4:** Coin balance persists. Encourages topping up before running out

## **Coin bundle pricing (recommended starting tiers)**

| Bundle name | Coins | Price (USD) | Best for |
| :---- | :---- | :---- | :---- |
| Otanoshimi | 100 coins | $0.99 | First-time buyer, try it out |
| Otsukare | 500 coins | $4.99 | Regular fan, weekly top-up |
| Daisuki | 1,200 coins | $9.99 | Dedicated fan (\~17% bonus)  ★ Most popular |
| Oshi Forever | 2,800 coins | $19.99 | Power fan (\~40% bonus) |
| Ichiban | 6,500 coins | $39.99 | Top fan, maximum value |

| Why coins and not direct payment? Coins remove the sting of individual spending decisions. A fan who spent ¥1,000 on coins earlier is much more likely to send a 300-coin gift than a fan who has to approve a £2.40 card charge for each item. This is the core psychological mechanism that makes TikTok, SHOWROOM, and Bilibili's gifting economies work. It also gives Oshi a margin layer to build in value (bonus coins on larger bundles). |
| :---- |

# **The Gift Catalogue — Oshikatsu Item List**

All gifts must feel rooted in Japanese fan and care culture. Every item should have a visible reaction from the vtuber and a meaningful effect on her Genki meter or mood state.

## **Care items — free well-being (low cost, high frequency)**

| Gift item | Coins | Genki boost | Category | Vtuber reaction |
| :---- | :---- | :---- | :---- | :---- |
| Onigiri (おにぎり) | 20 | \+ 5 | Food | She eats it, makes happy sounds |
| Ramen bowl (ラーメン) | 50 | \+ 10 | Food | Slurp animation, eyes light up |
| Matcha latte | 30 | \+ 7 | Drink | Sips slowly, sighs contentedly |
| Taiyaki (鯛焼き) | 40 | \+ 8 | Snack | Bites the tail first, giggles |
| Strawberry daifuku | 35 | \+ 7 | Snack | Smiles, says it's her favourite |
| Warm blanket | 60 | \+ 12 | Comfort | Wraps up, looks cozy |
| Head pat (頭なでなで) | 25 | \+ 6 | Affection | Blushes, looks down shyly |
| Morning greeting card | 15 | \+ 3 | Daily care | Reads it aloud, smiles |

## **Accessories & cosmetics (medium cost, visible on model)**

| Gift item | Coins | Effect | Category | Notes |
| :---- | :---- | :---- | :---- | :---- |
| Hair ribbon | 150 | Equips on model | Accessory | Stays on for 7 days |
| Cat ear clip | 200 | Equips on model | Accessory | Fan favourite archetype |
| Flower crown | 180 | Equips on model | Seasonal | Spring/summer only |
| Star hairpin | 120 | Equips on model | Accessory | Small, stackable |
| School bag charm | 100 | Equips on model | Accessory | Dangles from outfit |

## **Clothing & outfits (premium, high impact)**

| Gift item | Coins | Duration | Category | Notes |
| :---- | :---- | :---- | :---- | :---- |
| Summer yukata | 500 | 30 days | Outfit | Seasonal — Obon event |
| Winter kotatsu set | 600 | 30 days | Outfit | Includes blanket prop |
| School uniform | 450 | 14 days | Outfit | Back to school event |
| Idol stage outfit | 800 | 30 days | Outfit | Premium — debut anniversary only |
| Maid café uniform | 600 | 14 days | Outfit | Permanent catalogue item |

## **Special / high-value gifts (nagesen moment)**

| Gift item | Coins | Effect | Category | Notes |
| :---- | :---- | :---- | :---- | :---- |
| Omamori charm (お守り) | 300 | Mood boost 24h | Lucky item | She holds it, whispers a wish |
| Sakura bouquet | 400 | Full genki restore | Flowers | Spring limited. Big reaction. |
| Handwritten letter | 250 | \+15 genki, special dialogue | Tegami | She reads it aloud to you |
| Uchiwa fan (うちわ) | 350 | Fan rank badge | Idol culture | She waves it back at you |
| Birthday cake | 1,000 | Unlocks birthday scene | Milestone | One per year per user |
| Shooting star | 2,000 | Named star, permanent profile badge | Premium | She names it after you |

# **Technical Architecture**

## **Why Stripe**

* Supports 135+ currencies and 50+ countries — global from day one

* Checkout Sessions API is the fastest integration path — minimal custom payment UI

* Built-in fraud protection, PCI DSS compliance — no card data touches Oshi servers

* Webhook system is reliable and well-documented for coin crediting on payment success

* Easy to add Apple Pay / Google Pay later with no architecture change

## **Core data model — new tables**

| Field | Type | Description |
| :---- | :---- | :---- |
| **hoshi\_balance** | INTEGER | User's current coin balance. On user record. |
| **coin\_transactions** | TABLE | id, user\_id, type (purchase/spend), amount, stripe\_payment\_id, gift\_id, created\_at |
| **gift\_catalogue** | TABLE | id, name, name\_jp, coin\_cost, category, genki\_boost, duration\_days, is\_seasonal, active |
| **user\_gifts** | TABLE | id, user\_id, gift\_id, gifted\_at, expires\_at, is\_equipped (for accessories/outfits) |

## 

## **Stripe integration flow**

1. User taps a coin bundle in app → frontend calls backend POST /coins/checkout

2. Backend creates a Stripe Checkout Session with the bundle's price\_id and user metadata

3. User is redirected to Stripe hosted checkout (handles card, Apple Pay, Google Pay)

4. On success, Stripe fires webhook → payment.intent.succeeded to Oshi backend

5. Backend verifies webhook signature, credits hoshi\_balance, logs coin\_transaction

6. Frontend polls or listens for balance update → shows confetti \+ new balance

| Important: idempotency Always store the stripe\_payment\_id on the coin transaction before crediting coins. Check for duplicates before processing any webhook — Stripe may fire the same webhook more than once. This prevents double coin credits. |
| :---- |

# **Frontend — Gift Shop UI**

## **Three screens to build**

* **Screen 1:** Gift Shop tab — grid of all available gifts, sorted by category, with coin costs and a short description. Tapping a gift shows a preview of the vtuber reaction before purchase.

* **Screen 2:** Coin Shop — the bundle purchase page. Five tiers displayed as cards. Most popular tier highlighted. Stripe Checkout triggered on tap.

* **Screen 3:** Hoshi Balance widget — persistent coin display in the main chat UI (top bar or near avatar). Updates instantly after a gift is sent.

## **Gift send animation**

This is the most important UX moment in the whole feature. When a gift is sent:

7. Gift item animates from the bottom of the screen upward toward the vtuber

8. VRM model triggers the gift-specific reaction animation (eating, equipping, blushing)

9. A short voice line plays — unique per gift category, not per individual item at v1

10. Genki bar visibly fills by the gift's boost amount with a satisfying animation

11. A small floating notification appears: "\[Gift name\] \+X 元気"

| V1 scope note For this sprint, gift reactions can use a small set of shared animations (eat, equip, blush, happy) mapped to gift categories — not unique animations per item. Unique per-item animations are a v2 enhancement once the system is proven. |
| :---- |

# **30-Hour Sprint Breakdown**

10 hours per intern. Each owns one workstream completely.

**Intern A — Backend & Payments (10 hrs)**

| Task | Notes | Hours |
| :---- | :---- | ----- |
| **Stripe account setup & test keys** | Leni to manage | **Create account, configure webhooks, get test keys** |
| **DB migration — 4 new tables/fields** |  | **coin\_transactions, gift\_catalogue, user\_gifts, hoshi\_balance on user** |
| **POST /coins/checkout endpoint** |  | **Create Stripe Checkout Session, return redirect URL** |
| **Stripe webhook handler** |  | **Verify signature, credit coins, idempotency check** |
| **POST /gifts/send endpoint** |  | **Deduct coins, log transaction, apply genki boost, return gift result** |
| **Seed gift\_catalogue with v1 items** |  | **Insert all items from this brief with correct coin costs** |
| **API testing (Stripe test mode)** | 1h | **End-to-end test: buy coins → send gift → check balance** |

**Intern B — Frontend & Gift UI (10 hrs)**

| Task | Notes | Hours |
| :---- | :---- | ----- |
| **Hoshi Coin balance widget** |  | **Persistent display in chat UI, live update after gift send** |
| **Coin Shop screen** |  | **5 bundle tiers, card layout, Stripe redirect on tap** |
| **Gift Shop tab — grid layout** |  | **Category filters, item cards, coin cost display** |
| **Gift send flow** |  | **Tap → preview → confirm → send. Deduct coins from displayed balance.** |
| **Gift animation system** |  | **Item floats up, VRM reaction trigger, genki bar fill animation** |
| **Success/error states** |  | **Insufficient coins message, payment success screen** |

**Intern C — Research, QA & Gift Design (10 hrs)**

| Task | Notes | Hours |
| :---- | :---- | ----- |
| **Platform research report** |  | **Deep dive: SHOWROOM, Pococha, Niconico, TikTok Coins — document mechanics** |
| **Gift catalogue expansion** |  | **Research 10 more culturally appropriate gifts to add to v2 backlog** |
| **VRM reaction mapping** |  | **Map each gift category to an existing VRM animation state** |
| **Full QA pass — happy path** |  | **Buy coins → open shop → send gift → verify all states** |
| **Edge case QA** |  | **Insufficient coins, failed payment, expired gift, duplicate webhook** |
| **Write v2 recommendations** |  | **What to build next: fan rank system, limited drops, seasonal events** |

| Total sprint hours | 30 hours |
| :---- | :---: |

# **Acceptance Criteria**

12. A user can purchase a Hoshi Coin bundle via Stripe and see their balance update in-app

13. Coins are credited only after Stripe webhook is verified — not before

14. A user can open the Gift Shop and send any item to the vtuber

15. Sending a gift deducts the correct coin amount and triggers the vtuber reaction animation

16. Genki bar increases by the correct amount after a gift is sent

17. A user with insufficient coins sees a clear message and is directed to the Coin Shop

18. All transactions are logged in coin\_transactions with a stripe reference

19. Sending the same gift twice in the same session works correctly (no duplicate deduction)

20. Stripe test mode passes end-to-end with a test card

# **Out of Scope This Sprint**

| Do not build yet Fan rank / support rank system (Pococha-style) — v2 Limited/seasonal drops with timers — v2 Gift history / gifting leaderboard — v2 Revenue share or creator payout system — not applicable for AI vtuber Apple/Google in-app purchase (IAP) — use Stripe web checkout for v1 to avoid platform fees Real-money direct gifts bypassing the coin layer — never |
| :---- |

