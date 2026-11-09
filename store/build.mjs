// ======================================================
// App Store screenshots
// ======================================================
//
// Turns the raw simulator screenshots in store/raw into
// branded App Store images in store/out, one folder per
// product page:
//   default     the page people find via search
//   restaurant  custom product page for restaurants
//   massage     custom product page for massage salons
//
// Run: node store/build.mjs   (needs Google Chrome)
// ======================================================

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const themes = {
  green: { accent: "#1f5f55", soft: "#e3eeea", bg: "#f3ecdf", deco: "#8fb9a8" },
  terracotta: { accent: "#8a4b22", soft: "#f6e9dc", bg: "#f6f4ef", deco: "#d9c6a5" },
};

// A frame: eyebrow, title, one or two screenshots and an
// optional zoomed callout (a crop of the first screenshot,
// in screenshot pixels: x, y, width, height).
const pages = {
  default: [
    { theme: "green", eyebrow: "AI-receptionist", title: "Elke oproep beantwoord, ook als jij het druk hebt", shots: ["restaurant-calls"], callout: [56, 618, 1208, 330] },
    { theme: "green", eyebrow: "Gesprekken", title: "Lees wat je receptionist met je klant besprak", shots: ["massage-call-detail"], callout: [40, 1090, 1240, 300] },
    { theme: "green", eyebrow: "Voor jouw zaak", title: "Gemaakt voor restaurants én massagesalons", shots: ["restaurant-floor", "massage-agenda"], labels: ["Restaurant", "Massagesalon"] },
    { theme: "green", eyebrow: "Vandaag", title: "Je dag in één oogopslag", shots: ["restaurant-today"] },
  ],
  restaurant: [
    { theme: "green", eyebrow: "AI-receptionist", title: "Elke oproep beantwoord, ook tijdens de service", shots: ["restaurant-calls"], callout: [56, 618, 1208, 330] },
    { theme: "green", eyebrow: "Gesprekken", title: "Reservatie en allergie, meteen genoteerd", shots: ["restaurant-call-detail"], callout: [40, 1090, 1240, 300] },
    { theme: "green", eyebrow: "Reservaties", title: "Je service in één oogopslag", shots: ["restaurant-today"] },
    { theme: "green", eyebrow: "Zaalplan", title: "Zie live wie aan welke tafel zit", shots: ["restaurant-floor"] },
    { theme: "green", eyebrow: "Tijdlijn", title: "Plan je tafels voor de hele avond", shots: ["restaurant-timeline"] },
  ],
  massage: [
    { theme: "terracotta", eyebrow: "AI-receptionist", title: "Elke oproep beantwoord, ook tijdens een massage", shots: ["massage-calls"], callout: [56, 618, 1208, 330] },
    { theme: "terracotta", eyebrow: "Gesprekken", title: "Lees wat je receptionist met je klant besprak", shots: ["massage-call-detail"], callout: [40, 1090, 1240, 300] },
    { theme: "terracotta", eyebrow: "Agenda", title: "Je hele team in één agenda", shots: ["massage-agenda"] },
    { theme: "terracotta", eyebrow: "Vandaag", title: "Afspraken en omzet van vandaag", shots: ["massage-today"] },
    { theme: "terracotta", eyebrow: "Afrekenen", title: "Afrekenen met fooi en kasticket", shots: ["massage-checkout"] },
    { theme: "terracotta", eyebrow: "Team", title: "Wie werkt wanneer, in één scherm", shots: ["massage-team"] },
  ],
};

const W = 1320;
const H = 2868;
const SHOT_W = 1320;
const SHOT_H = 2868;

function phone(src, width, label = null) {
  const height = Math.round((width * SHOT_H) / SHOT_W);
  return `
    <div class="phone-wrap">
      ${label ? `<div class="label">${label}</div>` : ""}
      <div class="phone" style="width:${width}px;height:${height}px">
        <img src="${src}" width="${width - 36}" height="${height - 36}" />
      </div>
    </div>`;
}

function callout(src, [x, y, w, h], width) {
  const scale = width / w;
  return `
    <div class="callout" style="width:${width}px;height:${Math.round(h * scale)}px;
      background-image:url('${src}');
      background-size:${Math.round(SHOT_W * scale)}px ${Math.round(SHOT_H * scale)}px;
      background-position:-${Math.round(x * scale)}px -${Math.round(y * scale)}px"></div>`;
}

function html(frame) {
  const t = themes[frame.theme];
  const raw = (name) => `file://${path.join(here, "raw", name + ".png")}`;
  const two = frame.shots.length === 2;
  const phones = two
    ? frame.shots.map((s, i) => phone(raw(s), 600, frame.labels?.[i])).join("")
    : phone(raw(frame.shots[0]), 1000);

  return `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@500;600&family=Fraunces:opsz,wght@9..144,500;9..144,600&display=block" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; }
  body { width:${W}px; height:${H}px; overflow:hidden; background:${t.bg}; font-family: Inter, sans-serif; position:relative; }
  .deco { position:absolute; border:56px solid ${t.deco}; border-bottom:0; border-radius:600px 600px 0 0; opacity:.35; }
  .d1 { width:900px; height:1100px; left:-420px; top:1500px; }
  .d2 { width:700px; height:900px; right:-360px; top:900px; }
  .dot { position:absolute; width:120px; height:120px; border-radius:50%; background:${t.deco}; opacity:.55; right:150px; top:150px; }
  header { position:relative; text-align:center; padding:190px 110px 0; }
  .eyebrow { display:inline-block; font-weight:600; font-size:38px; letter-spacing:.18em; text-transform:uppercase;
    color:${t.accent}; border:4px solid ${t.accent}; border-radius:999px; padding:18px 44px; }
  h1 { font-family: Fraunces, Georgia, serif; font-weight:600; font-size:112px; line-height:1.08; letter-spacing:-.01em;
    color:${t.accent}; margin-top:64px; text-wrap:balance; }
  .stage { position:absolute; left:0; right:0; top:${two ? 900 : 820}px; display:flex; justify-content:center; gap:60px; }
  .phone-wrap { display:flex; flex-direction:column; align-items:center; gap:28px; }
  .label { font-weight:600; font-size:40px; color:${t.accent}; background:${t.soft}; padding:14px 36px; border-radius:999px; }
  .phone { background:#111; border-radius:${two ? 84 : 132}px; padding:18px; box-shadow:0 60px 120px rgba(20,30,25,.28); }
  .phone img { border-radius:${two ? 68 : 116}px; display:block; }
  .callout { position:absolute; left:50%; transform:translateX(-50%); top:${two ? 0 : 1600}px; border-radius:44px;
    background-repeat:no-repeat; box-shadow:0 40px 90px rgba(20,30,25,.30); border:6px solid #fff; }
</style></head><body>
  <div class="deco d1"></div><div class="deco d2"></div><div class="dot"></div>
  <header><span class="eyebrow">${frame.eyebrow}</span><h1>${frame.title}</h1></header>
  <div class="stage">${phones}</div>
  ${frame.callout ? callout(raw(frame.shots[0]), frame.callout, 1180) : ""}
</body></html>`;
}

// ------------------------------------------------------
// iPad 13", landscape (2752 x 2064), from store/raw-ipad
// ------------------------------------------------------

const ipadPages = {
  default: [
    { theme: "green", eyebrow: "AI-receptionist", title: "Elke oproep beantwoord, ook als jij het druk hebt", shot: "restaurant-calls" },
    { theme: "green", eyebrow: "Zaalplan", title: "Je zaal live, op een groot scherm", shot: "restaurant-floor" },
    { theme: "green", eyebrow: "Agenda", title: "Je hele team in één agenda", shot: "massage-agenda" },
    { theme: "green", eyebrow: "Vandaag", title: "Je dag in één oogopslag", shot: "restaurant-today" },
  ],
  restaurant: [
    { theme: "green", eyebrow: "AI-receptionist", title: "Elke oproep beantwoord, ook tijdens de service", shot: "restaurant-calls" },
    { theme: "green", eyebrow: "Zaalplan", title: "Zie live wie aan welke tafel zit", shot: "restaurant-floor" },
    { theme: "green", eyebrow: "Reservaties", title: "Je service in één oogopslag", shot: "restaurant-today" },
    { theme: "green", eyebrow: "Tijdlijn", title: "Plan je tafels voor de hele avond", shot: "restaurant-timeline" },
  ],
  massage: [
    { theme: "terracotta", eyebrow: "AI-receptionist", title: "Elke oproep beantwoord, ook tijdens een massage", shot: "massage-calls" },
    { theme: "terracotta", eyebrow: "Agenda", title: "Je hele team in één agenda", shot: "massage-agenda" },
    { theme: "terracotta", eyebrow: "Vandaag", title: "Afspraken en omzet van vandaag", shot: "massage-today" },
  ],
};

const IPAD_W = 2752;
const IPAD_H = 2064;

function ipadHtml(frame) {
  const t = themes[frame.theme];
  const src = `file://${path.join(here, "raw-ipad", frame.shot + ".png")}`;
  const width = 2240;
  const height = Math.round((width * 2064) / 2752);

  return `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@500;600&family=Fraunces:opsz,wght@9..144,500;9..144,600&display=block" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; }
  body { width:${IPAD_W}px; height:${IPAD_H}px; overflow:hidden; background:${t.bg}; font-family: Inter, sans-serif; position:relative; }
  .deco { position:absolute; border:64px solid ${t.deco}; border-bottom:0; border-radius:700px 700px 0 0; opacity:.35; }
  .d1 { width:1000px; height:1200px; left:-520px; top:900px; }
  .d2 { width:900px; height:1100px; right:-480px; top:520px; }
  .dot { position:absolute; width:120px; height:120px; border-radius:50%; background:${t.deco}; opacity:.55; right:220px; top:110px; }
  header { position:relative; text-align:center; padding:110px 200px 0; }
  .eyebrow { display:inline-block; font-weight:600; font-size:38px; letter-spacing:.18em; text-transform:uppercase;
    color:${t.accent}; border:4px solid ${t.accent}; border-radius:999px; padding:16px 44px; }
  h1 { font-family: Fraunces, Georgia, serif; font-weight:600; font-size:104px; line-height:1.08; letter-spacing:-.01em;
    color:${t.accent}; margin-top:44px; text-wrap:balance; }
  .tablet { position:absolute; left:50%; transform:translateX(-50%); top:460px; width:${width}px; height:${height}px;
    background:#111; border-radius:72px; padding:30px; box-shadow:0 60px 140px rgba(20,30,25,.28); }
  .tablet img { width:100%; height:100%; border-radius:44px; display:block; }
</style></head><body>
  <div class="deco d1"></div><div class="deco d2"></div><div class="dot"></div>
  <header><span class="eyebrow">${frame.eyebrow}</span><h1>${frame.title}</h1></header>
  <div class="tablet"><img src="${src}" /></div>
</body></html>`;
}

// ------------------------------------------------------
// Render every frame with headless Chrome
// ------------------------------------------------------

const tmp = path.join(here, ".tmp");
fs.mkdirSync(tmp, { recursive: true });

function render(markup, width, height, name, png) {
  const file = path.join(tmp, `${name}.html`);
  fs.writeFileSync(file, markup);
  execFileSync(chrome, [
    "--headless=new", "--disable-gpu", "--hide-scrollbars", "--allow-file-access-from-files",
    `--window-size=${width},${height}`, "--virtual-time-budget=8000", `--screenshot=${png}`, `file://${file}`,
  ], { stdio: "ignore" });
  console.log(png.replace(here + "/", ""));
}

for (const [page, frames] of Object.entries(pages)) {
  const out = path.join(here, "out", page);
  fs.mkdirSync(out, { recursive: true });
  frames.forEach((frame, i) => {
    const number = String(i + 1).padStart(2, "0");
    render(html(frame), W, H, `${page}-${number}`, path.join(out, `${number}-${frame.shots[0]}.png`));
  });
}

for (const [page, frames] of Object.entries(ipadPages)) {
  const out = path.join(here, "out-ipad", page);
  fs.mkdirSync(out, { recursive: true });
  frames.forEach((frame, i) => {
    const number = String(i + 1).padStart(2, "0");
    render(ipadHtml(frame), IPAD_W, IPAD_H, `ipad-${page}-${number}`, path.join(out, `${number}-${frame.shot}.png`));
  });
}

// ------------------------------------------------------
// Header of the product page (3840 x 1646)
// ------------------------------------------------------

const HEADER_W = 3840;
const HEADER_H = 1646;

function headerHtml() {
  const t = themes.green;
  const icon = `file://${path.join(here, "..", "assets", "images", "icon.png")}`;
  const ipad = `file://${path.join(here, "raw-ipad", "massage-agenda.png")}`;
  const phone = `file://${path.join(here, "raw", "restaurant-calls.png")}`;

  return `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@500;600&family=Fraunces:opsz,wght@9..144,500;9..144,600&display=block" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; }
  body { width:${HEADER_W}px; height:${HEADER_H}px; overflow:hidden; background:${t.bg}; font-family: Inter, sans-serif; position:relative; }
  .deco { position:absolute; border:80px solid ${t.deco}; border-bottom:0; border-radius:900px 900px 0 0; opacity:.35; }
  .d1 { width:1300px; height:1500px; left:-620px; top:760px; }
  .d2 { width:1100px; height:1300px; right:-520px; top:-200px; }
  .text { position:absolute; left:260px; top:50%; transform:translateY(-50%); width:1500px; }
  .brand { display:flex; align-items:center; gap:36px; }
  .brand img { width:150px; height:150px; border-radius:36px; }
  .brand span { font-weight:600; font-size:64px; color:${t.accent}; letter-spacing:-.01em; }
  h1 { font-family: Fraunces, Georgia, serif; font-weight:600; font-size:150px; line-height:1.04; letter-spacing:-.015em;
    color:${t.accent}; margin-top:80px; }
  p { font-size:54px; line-height:1.4; color:#36403c; margin-top:56px; max-width:1300px; }
  .pills { display:flex; gap:24px; margin-top:64px; }
  .pill { font-weight:600; font-size:40px; color:${t.accent}; background:${t.soft}; padding:20px 44px; border-radius:999px; }
  .ipad { position:absolute; left:1980px; top:260px; width:1640px; height:1230px; background:#111; border-radius:64px; padding:26px;
    box-shadow:0 70px 160px rgba(20,30,25,.28); }
  .ipad img, .phone img { width:100%; height:100%; display:block; }
  .ipad img { border-radius:40px; }
  .phone { position:absolute; left:1820px; top:560px; width:520px; height:1130px; background:#111; border-radius:80px; padding:14px;
    box-shadow:0 60px 140px rgba(20,30,25,.35); }
  .phone img { border-radius:68px; }
</style></head><body>
  <div class="deco d1"></div><div class="deco d2"></div>
  <div class="text">
    <div class="brand"><img src="${icon}" /><span>AtrioNovo</span></div>
    <h1>Elke oproep beantwoord, ook als jij het druk hebt</h1>
    <p>Je AI-receptionist neemt elke oproep op en boekt meteen in je agenda.</p>
    <div class="pills"><span class="pill">Restaurants</span><span class="pill">Massagesalons</span></div>
  </div>
  <div class="ipad"><img src="${ipad}" /></div>
  <div class="phone"><img src="${phone}" /></div>
</body></html>`;
}

fs.mkdirSync(path.join(here, "out-header"), { recursive: true });
render(headerHtml(), HEADER_W, HEADER_H, "header", path.join(here, "out-header", "header-3840x1646.png"));
