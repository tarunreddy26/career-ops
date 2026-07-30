import pptxgen from "/home/user/career-ops/node_modules/pptxgenjs/dist/pptxgen.cjs.js";

// ================= Canvas: 90 x 120 cm portrait =================
const CM = 1 / 2.54;
const SW = 90 * CM, SH = 120 * CM, M = 2 * CM;     // 35.433 x 47.244, margin .787

const DIR = "/home/user/career-ops/poster-v2/";
const OUT = "/home/user/career-ops/TNASICON2026-Poster-v3-Metastatic-Ileal-Perforation.pptx";

// ---- palette: white / blue / teal (no gold) ----
const NAVY = "12355B", BLUE = "1B5E9C", TEAL = "2A9D8F", CHAR = "2E3438",
      BORDER = "D9D9D9", WHITE = "FFFFFF",
      TEALTINT = "E7F4F1", BLUETINT = "EAF0F7", CAPGREY = "5B6166";

const SERIF = "Cambria", SANS = "Calibri";
const FS = { title: 50, sub: 31, present: 27, guide: 23, inst: 21,
             sec: 29, body: 32, cap: 20, foot: 20, stat: 40, statL: 20, ref: 17,
             callT: 29, callB: 31 };

const pptx = new pptxgen();
pptx.defineLayout({ name: "POSTER", width: SW, height: SH });
pptx.layout = "POSTER";
const s = pptx.addSlide();
s.background = { color: WHITE };

// ---- geometry: 28% / 44% / 28% ----
const usableW = SW - 2 * M, rightX = SW - M, colGap = 0.5;
const contentW = usableW - 2 * colGap;
const c1W = 0.28 * contentW, c2W = 0.44 * contentW, c3W = 0.28 * contentW;
const c1X = M, c2X = M + c1W + colGap, c3X = c2X + c2W + colGap;

const MIN_DPI = 120;   // print-quality floor for large-format printing
const IMG = {
  breast:  { p: DIR + "v2-1-breast-clinical.png",        px: 793,  py: 845 },
  xray:    { p: DIR + "v2-2-xray-pneumoperitoneum.jpeg", px: 546,  py: 630, dpi: 108 },
  ct:      { p: DIR + "v2-3-ct-slices-annotated.jpeg",   px: 671,  py: 616, dpi: 95 },
  intraop: { p: DIR + "v2-4-intraop-perforation.png",    px: 521,  py: 972 },
  bhpe:    { p: DIR + "v2-5-breast-hpe.png",             px: 1200, py: 1600 },
  ihpe:    { p: DIR + "v2-6-ileal-hpe-lowpower.jpeg",    px: 1218, py: 1035 },
  ihpe2:   { p: DIR + "v2-7-ileal-hpe-wall.jpeg",        px: 772,  py: 646 },
  logo:    { p: DIR + "v2-logo-tnasicon.jpeg",           px: 1286, py: 688 },
};
for (const k in IMG) {
  const i = IMG[k];
  i.r = i.py / i.px;                 // aspect (h/w)
  const floor = i.dpi || MIN_DPI;    // per-image print floor
  i.dpiMaxW = i.px / floor;          // widest we may print it
  i.dpiMaxH = i.py / floor;
}

const shadow  = () => ({ type: "outer", color: "8A8A8A", blur: 5, offset: 3, angle: 90, opacity: 0.3 });
const soft    = () => ({ type: "outer", color: "B4B4B4", blur: 4, offset: 2, angle: 90, opacity: 0.28 });

// ---------- measurement ----------
function estLines(text, w, fs, indent = 0.34) {
  const cw = 0.5 * fs / 72;
  return Math.max(1, Math.ceil(text.length / Math.max(6, (w - indent - 0.12) / cw)));
}
function bulletsH(items, w, fs) {
  const lh = 1.2 * fs / 72, gap = 0.11;
  let n = 0;
  for (const it of items) n += estLines(typeof it === "string" ? it : it.t, w, fs);
  return n * lh + items.length * gap + 0.1;
}
function capH(text, w) { return estLines(text, w, FS.cap, 0) * 1.2 * FS.cap / 72 + 0.1; }

// ---------- primitives ----------
function bulletRuns(items, fs, color) {
  return items.map(it => {
    const o = typeof it !== "string";
    return { text: o ? it.t : it, options: {
      fontFace: SANS, fontSize: fs, color: o && it.c ? it.c : color,
      bold: !!(o && it.b), italic: !!(o && it.i), bullet: { code: "2022", indent: 20 },
      paraSpaceAfter: 9, breakLine: true, align: "left" } };
  });
}
// rounded coloured header bar + bordered body panel (panel stretches to fill)
const HDR_H = 0.98;
function headerBar(x, y, colW, num, title) {
  s.addShape(pptx.ShapeType.roundRect, { x, y, w: colW, h: HDR_H, rectRadius: 0.16, fill: { color: NAVY }, line: { type: "none" }, shadow: soft() });
  const d = 0.6;
  s.addShape(pptx.ShapeType.ellipse, { x: x + 0.26, y: y + (HDR_H - d) / 2, w: d, h: d, fill: { color: TEAL }, line: { type: "none" } });
  s.addText(String(num), { x: x + 0.26, y: y + (HDR_H - d) / 2, w: d, h: d, align: "center", valign: "middle", fontFace: SERIF, fontSize: 23, bold: true, color: WHITE, margin: 0 });
  s.addText(title.toUpperCase(), { x: x + 0.26 + d + 0.2, y, w: colW - d - 0.64, h: HDR_H, valign: "middle", align: "left", fontFace: SERIF, fontSize: FS.sec, bold: true, color: WHITE, margin: 0, charSpacing: 0.6 });
}
function section(num, title, items, colW) {
  const padX = 0.28, padY = 0.3;
  const bH = bulletsH(items, colW - 2 * padX, FS.body);
  const natH = HDR_H + bH + 2 * padY;
  return { natH, stretch: true, draw(x, y, h) {
    const hh = h ?? natH;
    // body panel behind, header bar on top
    s.addShape(pptx.ShapeType.roundRect, { x, y: y + HDR_H / 2, w: colW, h: hh - HDR_H / 2, rectRadius: 0.14, fill: { color: WHITE }, line: { color: BORDER, width: 1.5 } });
    headerBar(x, y, colW, num, title);
    s.addText(bulletRuns(items, FS.body, CHAR), { x: x + padX, y: y + HDR_H + padY, w: colW - 2 * padX, h: hh - HDR_H - 2 * padY + 0.1, valign: "top", margin: 0 });
  } };
}
// coloured callout box (stretches)
function callout(title, items, colW, opt = {}) {
  const fill = opt.fill || TEALTINT, line = opt.line || TEAL,
        tcol = opt.tcol || NAVY, bcol = opt.bcol || "204A45";
  const padX = 0.34, hdr = 0.66;
  const bH = bulletsH(items, colW - 2 * padX, FS.callB) * 1.08;
  const natH = 0.36 + hdr + 0.14 + bH + 0.42;
  return { natH, stretch: true, tight: true, draw(x, y, h) {
    const hh = h ?? natH;
    s.addShape(pptx.ShapeType.roundRect, { x, y, w: colW, h: hh, rectRadius: 0.16, fill: { color: fill }, line: { color: line, width: 2.5 }, shadow: soft() });
    s.addText(title.toUpperCase(), { x: x + padX, y: y + 0.34, w: colW - 2 * padX, h: hdr, valign: "middle", align: "left", fontFace: SERIF, fontSize: FS.callT, bold: true, color: tcol, margin: 0, charSpacing: 0.5 });
    s.addText(bulletRuns(items, FS.callB, bcol), { x: x + padX, y: y + 0.34 + hdr + 0.14, w: colW - 2 * padX, h: hh - 0.34 - hdr - 0.5, valign: "top", margin: 0 });
  } };
}
// references block (stretches)
function refsSection(num, title, refs, colW) {
  const padX = 0.28, padY = 0.28;
  const lh = 1.2 * FS.ref / 72;
  let bH = 0.08;
  for (const r of refs) bH += estLines(r, colW - 2 * padX, FS.ref, 0.2) * lh + 0.12;
  bH += estLines("Written informed consent was obtained from the patient for publication of clinical images and case details.", colW - 2 * padX, FS.ref, 0) * lh + 0.2;
  const natH = HDR_H + bH + 2 * padY;
  return { natH, stretch: true, draw(x, y, h) {
    const hh = h ?? natH;
    s.addShape(pptx.ShapeType.roundRect, { x, y: y + HDR_H / 2, w: colW, h: hh - HDR_H / 2, rectRadius: 0.14, fill: { color: WHITE }, line: { color: BORDER, width: 1.5 } });
    headerBar(x, y, colW, num, title);
    const runs = refs.map(r => ({ text: r, options: { fontFace: SANS, fontSize: FS.ref, color: "5A6066", paraSpaceAfter: 8, breakLine: true, align: "left" } }));
    runs.push({ text: "Written informed consent was obtained from the patient for publication of clinical images and case details.", options: { fontFace: SANS, fontSize: FS.ref, italic: true, color: NAVY, breakLine: true, paraSpaceBefore: 10 } });
    s.addText(runs, { x: x + padX, y: y + HDR_H + padY, w: colW - 2 * padX, h: hh - HDR_H - 2 * padY + 0.1, valign: "top", margin: 0 });
  } };
}
// framed image with thin border
function frame(x, y, w, key) {
  const im = IMG[key], ih = w * im.r;
  s.addShape(pptx.ShapeType.rect, { x: x - 0.05, y: y - 0.05, w: w + 0.1, h: ih + 0.1, fill: { color: WHITE }, line: { color: "BFC6CC", width: 1.25 }, shadow: soft() });
  s.addImage({ path: im.p, x, y, w, h: ih });
  return ih;
}
function legend(x, y, w, fig, text, align = "left") {
  const h = capH(fig + "  " + text, w);
  s.addText([
    { text: fig + "  ", options: { fontFace: SANS, fontSize: FS.cap, bold: true, color: NAVY, breakLine: false } },
    { text, options: { fontFace: SANS, fontSize: FS.cap, italic: true, color: CAPGREY, breakLine: true } },
  ], { x, y, w, h, valign: "top", align, margin: 0 });
  return h;
}
// Fill a column exactly. Images scale up to their cap; any space still left is
// absorbed by the stretchable panels so leftover never shows as a gap.
function fill(x, top, bottom, blocks, gap = 0.5) {
  const avail = bottom - top;
  const gaps = gap * (blocks.length - 1);
  const el = blocks.filter(b => b.elastic);
  const fixed = blocks.filter(b => !b.elastic).reduce((a, b) => a + b.natH, 0);
  const chrome = el.reduce((a, b) => a + b.chrome, 0);
  const baseImg = el.reduce((a, b) => a + b.baseH, 0);
  // 1) grow images (capped at maxH)
  let scale = baseImg > 0 ? (avail - gaps - fixed - chrome) / baseImg : 1;
  for (const b of el) if (b.baseH * scale > b.maxH) scale = Math.min(scale, b.maxH / b.baseH);
  scale = Math.max(0.3, scale);
  let heights = blocks.map(b => b.elastic ? b.baseH * scale + b.chrome : b.natH);
  // 2) absorb remaining slack into stretchable panels, proportional to their
  //    natural height and capped, so small boxes never balloon half-empty
  let slack = avail - gaps - heights.reduce((a, b) => a + b, 0);
  const idx = blocks.map((b, i) => b.stretch ? i : -1).filter(i => i >= 0);
  if (slack > 0 && idx.length) {
    const capOf = i => blocks[i].natH * (blocks[i].tight ? 0.14 : 0.34);
    const totalNat = idx.reduce((a, i) => a + blocks[i].natH, 0);
    let given = 0;
    for (const i of idx) {
      const want = slack * (blocks[i].natH / totalNat);
      const add = Math.min(want, capOf(i));
      heights[i] += add; given += add;
    }
    slack -= given;
  }
  const g = blocks.length > 1 ? gap + Math.max(0, slack) / (blocks.length - 1) : 0;
  let y = top;
  blocks.forEach((b, i) => {
    b.draw(x, y, b.elastic ? b.baseH * scale : heights[i]);
    y += heights[i] + g;
  });
  return y - g;
}

// =====================================================================
// HEADER
// =====================================================================
const headH = 5.15;
s.addShape(pptx.ShapeType.roundRect, { x: M, y: M, w: usableW, h: headH, rectRadius: 0.16, fill: { color: NAVY }, line: { type: "none" }, shadow: shadow() });
const logoW = 5.5, logoH = logoW * IMG.logo.r;
const logoX = rightX - 0.42 - logoW, logoY = M + (headH - logoH) / 2;
s.addShape(pptx.ShapeType.roundRect, { x: logoX, y: logoY, w: logoW + 0.3, h: logoH + 0.3, rectRadius: 0.1, fill: { color: WHITE }, line: { type: "none" }, shadow: soft() });
s.addImage({ path: IMG.logo.p, x: logoX + 0.15, y: logoY + 0.15, w: logoW, h: logoH });

const tX = M + 0.6, tW = logoX - tX - 0.4;
s.addText("UNMASKING BREAST CANCER IN THE ACUTE ABDOMEN:", { x: tX, y: M + 0.42, w: tW, h: 1.5, valign: "middle", align: "left", fontFace: SERIF, fontSize: FS.title, bold: true, color: WHITE, margin: 0, lineSpacingMultiple: 0.95 });
s.addText("A Rare Case of Metastatic Ileal Perforation from Invasive Ductal Carcinoma", { x: tX, y: M + 1.95, w: usableW - 1.2, h: 0.72, valign: "middle", align: "left", fontFace: SERIF, fontSize: FS.sub, italic: true, color: "CFE0F0", margin: 0 });
s.addText([
  { text: "Presenter:  ", options: { fontFace: SANS, fontSize: FS.present, color: "AFC6DE", breakLine: false } },
  { text: "Dr. Alla Varun Reddy", options: { fontFace: SANS, fontSize: FS.present, bold: true, color: WHITE, breakLine: true } },
  { text: "Under the guidance of  ", options: { fontFace: SANS, fontSize: FS.guide, color: "AFC6DE", breakLine: false } },
  { text: "Prof. & HOD Dr. P. S. Saravanan", options: { fontFace: SANS, fontSize: FS.guide, bold: true, color: WHITE, breakLine: false } },
  { text: "    ·    ", options: { fontFace: SANS, fontSize: FS.guide, color: TEAL, breakLine: false } },
  { text: "Dr. Manoj Priyan", options: { fontFace: SANS, fontSize: FS.guide, bold: true, color: WHITE, breakLine: true } },
  { text: "Department of General Surgery", options: { fontFace: SANS, fontSize: FS.inst, italic: true, color: "8FA9C6", breakLine: false } },
], { x: tX, y: M + 2.72, w: usableW - 1.2, h: 2.3, valign: "top", align: "left", margin: 0, paraSpaceAfter: 8 });

// =====================================================================
// KEY-NUMBERS BAND (callout boxes)
// =====================================================================
const statTop = M + headH + 0.3, statH = 1.5;
{
  const stats = [
    { n: "38", l: "year-old woman" },
    { n: "2 days", l: "of abdominal pain" },
    { n: "0.5 × 0.5 cm", l: "solitary ileal perforation" },
    { n: "40 cm", l: "proximal to IC junction" },
  ];
  const g = 0.4, w = (usableW - 3 * g) / 4;
  stats.forEach((st, i) => {
    const x = M + i * (w + g);
    s.addShape(pptx.ShapeType.roundRect, { x, y: statTop, w, h: statH, rectRadius: 0.12, fill: { color: TEALTINT }, line: { color: TEAL, width: 1.5 }, shadow: soft() });
    s.addText(st.n, { x, y: statTop + 0.14, w, h: 0.76, align: "center", valign: "middle", fontFace: SERIF, fontSize: FS.stat, bold: true, color: NAVY, margin: 0 });
    s.addText(st.l, { x, y: statTop + 0.88, w, h: 0.46, align: "center", valign: "top", fontFace: SANS, fontSize: FS.statL, color: CHAR, margin: 0 });
  });
}

const bodyTop = statTop + statH + 0.36;
const footH = 0.85, footY = SH - M - footH, bodyBottom = footY - 0.34;

// =====================================================================
// CONTENT (from the supplied abstract; refs verified)
// =====================================================================
const T = {
  intro: [
    "Breast carcinoma most often metastasises to bone, liver and lung; gastrointestinal spread is rare and arises far more often from lobular than from ductal carcinoma. [1,2]",
    "Intestinal metastasis from breast carcinoma is uncommon, and perforation as the initial manifestation is exceedingly rare — only a limited number of cases have been reported. [3,4]",
  ],
  caseRep: [
    { t: "38-year-old woman presented to the emergency department with abdominal pain for two days.", b: true, c: NAVY },
    "History of chronic non-steroidal anti-inflammatory drug (NSAID) use for pain related to a right breast lump, which had been misdiagnosed as a breast abscess.",
  ],
  clinical: [
    "Tachycardic at presentation.",
    { t: "Generalized abdominal rigidity.", b: true, c: NAVY },
    "Right breast lump on examination (Fig 1).",
  ],
  investig: [
    { t: "Erect abdominal radiograph demonstrated pneumoperitoneum (Fig 2).", b: true, c: NAVY },
    { t: "Contrast-enhanced CT: free intraperitoneal air, confirming hollow-viscus perforation (Fig 3, arrows).", b: true, c: NAVY },
    "Findings prompted emergency exploratory laparotomy.",
  ],
  operative: [
    "Emergency exploratory laparotomy performed.",
    { t: "Solitary ileal perforation ≈ 0.5 × 0.5 cm, 40 cm proximal to the ileocaecal junction (Fig 4).", b: true, c: NAVY },
    "Primary closure of the perforation after biopsy from the perforation margin.",
  ],
  histo: [
    { t: "Trucut biopsy of the breast lump: invasive ductal carcinoma (Fig 5).", b: true, c: NAVY },
    { t: "Ileal perforation-margin biopsy: metastatic deposits (Fig 6).", b: true, c: NAVY },
    "Deposits at the perforation site establish metastatic carcinoma — rather than NSAID-related injury — as the cause of the perforation.",
    "Stains: haematoxylin and eosin (H&E).",
  ],
  discussion: [
    "The gastrointestinal tract is an unusual site for breast metastasis; the small bowel is rarer still, and perforation as the initial manifestation is exceptional.",
    "Diagnostic trap: acute peritonitis overshadows the primary, and the breast lump had been dismissed as an abscess — delaying the true diagnosis.",
    "Reported practice confirms breast origin of a gastrointestinal metastasis immunohistochemically (GATA3, GCDFP-15, mammaglobin, oestrogen receptor); E-cadherin positivity favours ductal type. [5]",
    "Management requires emergency surgery followed by evaluation and treatment of the primary breast malignancy.",
  ],
  differential: [
    "NSAID-induced ulcer perforation",
    "Infective enteritis (e.g., enteric fever)",
    "Intestinal tuberculosis",
    "Primary small-bowel malignancy",
    { t: "Metastatic malignancy — confirmed here", b: true, c: NAVY },
  ],
  conclusion: [
    "Ileal perforation can rarely be the presenting manifestation of metastatic breast carcinoma.",
    "A high index of suspicion together with early histopathological confirmation is essential for accurate diagnosis and appropriate management.",
  ],
  outcome: [
    "Primary closure of the ileal perforation; the patient recovered from the acute surgical episode.",
    { t: "[Editable placeholder — add staging, receptor status (ER/PR/HER2), adjuvant oncological treatment and follow-up]", i: true, c: "6B7280" },
  ],
  keymsg: [
    "An acute surgical abdomen may be the first presentation of a previously unrecognised metastatic malignancy.",
    "Always biopsy the perforation margin — it may carry the only diagnostic tissue.",
  ],
  refs: [
    "1.  McLemore EC, et al. Breast cancer: presentation and intervention in women with gastrointestinal metastasis and carcinomatosis. Ann Surg Oncol. 2005;12(11):886–894.",
    "2.  Ambroggi M, et al. Metastatic breast cancer to the gastrointestinal tract: report of five cases and review of the literature. Int J Breast Cancer. 2012;2012:439023.",
    "3.  Li Y, et al. Small intestinal metastatic breast cancer: a case report and literature review. Front Oncol. 2022;12:900832.",
    "4.  Shen F, et al. Small intestinal metastasis from primary breast cancer: a case report and review of the literature. Front Immunol. 2024;15:1475018.",
    "5.  Gown AM. Markers of metastatic carcinoma of breast origin. Histopathology. 2016;68(1):86–95.",
  ],
};

// ---------- elastic image blocks (height driven; scaled by fill()) ----------
function imgBlock(colW, key, fig, cap, maxFrac = 1) {
  const cH = capH(fig + "  " + cap, colW);
  const chrome = 0.1 + 0.14 + cH;
  const maxH = Math.min(colW * maxFrac * IMG[key].r, IMG[key].dpiMaxH);
  return { elastic: true, baseH: maxH, maxH, chrome, natH: maxH + chrome,
    draw(x, y, ih) {
      const h = ih ?? maxH, iw = h / IMG[key].r;
      frame(x + (colW - iw) / 2, y + 0.05, iw, key);
      legend(x, y + h + 0.19, colW, fig, cap, "center");
    } };
}
// two images side by side, EQUAL HEIGHT, widths from aspect ratio
function imgPair(colW, k1, k2, f1, c1, f2, c2) {
  const g = 0.4;
  const inv = 1 / IMG[k1].r + 1 / IMG[k2].r;
  const maxH = Math.min((colW - g) / inv, IMG[k1].dpiMaxH, IMG[k2].dpiMaxH);
  const w1max = maxH / IMG[k1].r, w2max = maxH / IMG[k2].r;
  const cH = Math.max(capH(f1 + "  " + c1, w1max), capH(f2 + "  " + c2, w2max));
  const chrome = 0.1 + 0.14 + cH;
  return { elastic: true, baseH: maxH, maxH, chrome, natH: maxH + chrome,
    draw(x, y, ih) {
      const h = ih ?? maxH;
      const w1 = h / IMG[k1].r, w2 = h / IMG[k2].r;
      const tot = w1 + w2 + g, sx = x + (colW - tot) / 2;
      frame(sx, y + 0.05, w1, k1);
      frame(sx + w1 + g, y + 0.05, w2, k2);
      legend(sx, y + h + 0.19, w1, f1, c1);
      legend(sx + w1 + g, y + h + 0.19, w2, f2, c2);
    } };
}

// ---------- COLUMN 1 : sections 1-3 + Fig 1 ----------
const col1 = [
  section(1, "Introduction", T.intro, c1W),
  section(2, "Case Report", T.caseRep, c1W),
  section(3, "Clinical Findings", T.clinical, c1W),
  callout("Differential Diagnosis", T.differential, c1W, { fill: BLUETINT, line: BLUE, tcol: NAVY, bcol: "24384F" }),
  imgBlock(c1W, "breast", "Fig 1.", "Clinical photograph of the right breast showing the lump misdiagnosed as a breast abscess.", 1.0),
];
const e1 = fill(c1X, bodyTop, bodyBottom, col1);

// ---------- COLUMN 2 : sections 4-6 (image-dominant centre) ----------
const col2 = [
  section(4, "Investigations", T.investig, c2W),
  imgPair(c2W, "xray", "ct", "Fig 2.", "Erect abdominal radiograph — pneumoperitoneum.", "Fig 3.", "Contrast-enhanced CT — arrows indicate free intraperitoneal air (pneumoperitoneum)."),
  section(5, "Operative Findings", T.operative, c2W),
  imgBlock(c2W, "intraop", "Fig 4.", "Intraoperative photograph — solitary ileal perforation, 40 cm proximal to the ileocaecal junction.", 0.30),
  section(6, "Histopathology", T.histo, c2W),
  imgPair(c2W, "bhpe", "ihpe", "Fig 5.", "Breast trucut biopsy — invasive ductal carcinoma (H&E).", "Fig 6.", "Ileal biopsy — metastatic deposits at the perforation site (H&E)."),
];
const e2 = fill(c2X, bodyTop, bodyBottom, col2);

// ---------- COLUMN 3 : sections 7-9 ----------
const col3 = [
  section(7, "Discussion", T.discussion, c3W),
  callout("Management & Outcome", T.outcome, c3W, { fill: BLUETINT, line: BLUE, tcol: NAVY, bcol: "24384F" }),
  callout("Key Message", T.keymsg, c3W, { fill: TEALTINT, line: TEAL, tcol: NAVY, bcol: "1E4A44" }),
  section(8, "Conclusion", T.conclusion, c3W),
  refsSection(9, "References", T.refs, c3W),
];
const e3 = fill(c3X, bodyTop, bodyBottom, col3);

// =====================================================================
// FOOTER
// =====================================================================
s.addShape(pptx.ShapeType.roundRect, { x: M, y: footY, w: usableW, h: footH, rectRadius: 0.1, fill: { color: NAVY }, line: { type: "none" } });
s.addText([
  { text: "TNASICON 2026", options: { fontFace: SERIF, fontSize: FS.foot, bold: true, color: WHITE, breakLine: false } },
  { text: "    ·    49th Annual Conference  ·  Coimbatore, Tamil Nadu  ·  August 6–9, 2026", options: { fontFace: SANS, fontSize: FS.foot, color: "BFD3E8", breakLine: false } },
], { x: M + 0.5, y: footY, w: usableW - 9, h: footH, align: "left", valign: "middle", margin: 0 });
s.addText("Case Report  ·  Department of General Surgery", { x: rightX - 9.5, y: footY, w: 9, h: footH, align: "right", valign: "middle", fontFace: SANS, fontSize: FS.foot, italic: true, color: "BFD3E8", margin: 0 });

console.log(`bodyTop ${bodyTop.toFixed(2)} bottom ${bodyBottom.toFixed(2)}`);
console.log(`c1 ${e1.toFixed(2)}  c2 ${e2.toFixed(2)}  c3 ${e3.toFixed(2)}`);
await pptx.writeFile({ fileName: OUT });
console.log("WROTE", OUT);
