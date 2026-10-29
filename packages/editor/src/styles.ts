// The look of the studio, after Rebodocs' editor: islands on a warm canvas
// (the bar, the rail, the panels and the pages each a card of its own), warm
// greys and ReboSlides' purple, in a light and a dark theme. Put in the page
// once, its names all under `rs-` for the studio and `sp-` for the controls.

const CSS = `
.rs-app {
  /* Warm greys, as Rebodocs has them, light. */
  --gray-25: #ffffff; --gray-50: #fbfaf8; --gray-75: #efede8; --gray-100: #f3f1ec; --gray-200: #e6e3dc; --gray-300: #dddad3;
  --gray-400: #ccc8bf; --gray-500: #9b9890; --gray-600: #6b6964; --gray-700: #5f5d58; --gray-800: #2f2e2b; --gray-900: #1c1b19;
  --accent: #6741d9; --accent-hover: #5230c4; --accent-down: #4a26b8; --accent-subtle: #f0ebf8; --accent-ink: #ffffff;
  --negative: #b13a2a; --negative-hover: #962f21; --focus: #6741d9;
  --canvas: var(--gray-75); --surface: var(--gray-50); --surface-2: var(--gray-100); --text: var(--gray-800); --text-2: var(--gray-700); --text-3: var(--gray-600);
  --border: var(--gray-200); --field-border: var(--gray-200); --hover: var(--gray-100); --down: #ebe8e1;
  --field: #ffffff; --selection: #6741d9; --selection-rgb: 103 65 217; --guide: #e2185b;
  --elevation: 0 1px 4px rgb(47 46 43 / .1), 0 16px 36px rgb(47 46 43 / .14);
  --island: 0 1px 2px rgb(47 46 43 / .05), 0 10px 30px -18px rgb(47 46 43 / .28);
  --r-s: 5px; --r-m: 9px; --r-l: 14px; --r-xl: 16px;
  position: fixed; inset: 0; display: grid; grid-template-rows: 48px 1fr; gap: 8px; padding: 8px; background: var(--canvas); color: var(--text);
  font: 14px/1.4 system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  -webkit-font-smoothing: antialiased; overflow: hidden; color-scheme: light;
}
.rs-app[data-theme="dark"] {
  /* And dark. */
  --gray-25: #2c2b28; --gray-50: #242321; --gray-75: #1c1b19; --gray-100: #363431; --gray-200: #3d3b37; --gray-300: #47443f;
  --gray-400: #55524d; --gray-500: #7a776f; --gray-600: #9c988f; --gray-700: #b1ada5; --gray-800: #ecebe7; --gray-900: #f7f6f3;
  --accent: #a18bf0; --accent-hover: #b6a5f4; --accent-down: #c9bcf7; --accent-subtle: #2e2547; --accent-ink: #160f2b;
  --negative: #ff8a73; --negative-hover: #ffa594; --focus: #a18bf0;
  --canvas: var(--gray-75); --surface: var(--gray-50); --surface-2: var(--gray-100); --text: var(--gray-800); --text-2: var(--gray-700); --text-3: var(--gray-600);
  --border: var(--gray-200); --field-border: var(--gray-200); --hover: var(--gray-100); --down: var(--gray-300);
  --field: #1f1e1c; --selection: #a18bf0; --selection-rgb: 161 139 240;
  --elevation: 0 1px 4px rgb(0 0 0 / .5), 0 8px 28px rgb(0 0 0 / .45);
  --island: 0 1px 2px rgb(0 0 0 / .3), 0 10px 30px -18px rgb(0 0 0 / .6);
  color-scheme: dark;
}
/* The slide alone, for an application that draws its own bar and panels around it. */
.rs-app.rs-bare { display: block; padding: 0; background: transparent; }
.rs-app.rs-bare .rs-viewport { position: absolute; inset: 0; border-radius: 0; background: var(--canvas); }
/* Inside a box of a page, not over the window. */
.rs-app.rs-embedded { position: absolute; }
.rs-app *, .rs-app *::before, .rs-app *::after { box-sizing: border-box; }
.rs-app button, .rs-app input, .rs-app select, .rs-app textarea { font: inherit; color: inherit; }
.rs-app :focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
.rs-app svg { flex: none; }

/* —— The islands: the bar, the rail, the panels and the pages, each a card on the canvas —— */
.rs-top, .rs-rail, .rs-panel, .rs-props, .rs-bottom { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-l); box-shadow: var(--island); }

/* —— App bar —— */
.rs-top { display: flex; align-items: center; gap: 4px; padding: 0 8px; }
/* The suite's tile: a slide on its stand, white on purple. */
.rs-app-icon { width: 26px; height: 26px; flex: none; background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%236741d9'/%3E%3Crect x='6.5' y='7.5' width='19' height='13.5' rx='1.8' fill='%23fff'/%3E%3Cpath d='M10 12h7.5M10 15.5h4.5' stroke='%236741d9' stroke-width='1.6' stroke-linecap='round'/%3E%3Cpath d='M16 21v3.5M12.5 24.5h7' stroke='%23fff' stroke-width='1.8' stroke-linecap='round'/%3E%3C/svg%3E") center / contain no-repeat; }
.rs-app-name { font-weight: 700; font-size: 15px; margin: 0 6px 0 8px; white-space: nowrap; }
.rs-divider-v { width: 1px; height: 20px; background: var(--border); margin: 0 6px; flex: none; }
.rs-spacer { flex: 1; min-width: 8px; }
.rs-title { height: 32px; width: min(340px, 32vw); border: 1px solid transparent; border-radius: var(--r-m); background: transparent; padding: 0 10px;
  text-align: center; font-weight: 600; color: var(--text); }
.rs-title:hover { background: var(--hover); }
.rs-title:focus { outline: none; border-color: var(--focus); background: var(--surface); text-align: left; }
.rs-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 32px; min-width: 32px; padding: 0 8px;
  border: 0; border-radius: var(--r-m); background: transparent; color: var(--text-2); cursor: pointer; white-space: nowrap; }
.rs-btn:hover { background: var(--hover); color: var(--text); }
.rs-btn:active { background: var(--down); }
.rs-btn:disabled { color: var(--gray-400); background: transparent; cursor: default; }
.rs-menu-button { flex-direction: row-reverse; font-weight: 600; color: var(--text); }

/* —— Buttons —— */
.sp-button { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 32px; padding: 0 14px; border-radius: var(--r-m);
  border: 1px solid transparent; font-weight: 600; cursor: pointer; white-space: nowrap; background: transparent; transition: background .13s, border-color .13s; }
.sp-button svg { width: 16px; height: 16px; }
.sp-button-accent { background: var(--accent); color: var(--accent-ink) !important; }
.sp-button-accent:hover { background: var(--accent-hover); }
.sp-button-accent:active { background: var(--accent-down); }
.sp-button-secondary { border-color: var(--gray-300); background: var(--field); color: var(--text) !important; }
.sp-button-secondary:hover { background: var(--hover); border-color: var(--gray-500); }
.sp-button-negative { border-color: var(--negative); color: var(--negative) !important; }
.sp-button-negative:hover { background: var(--negative); color: #fff !important; }
.sp-button-quiet { color: var(--text-2) !important; font-weight: 600; }
.sp-button-quiet:hover { background: var(--hover); }
.sp-block { width: 100%; }

/* —— Body —— */
.rs-body { display: grid; grid-template-columns: 56px 288px minmax(0, 1fr) 288px; gap: 8px; min-height: 0; }
.rs-body.rs-folded { grid-template-columns: 56px minmax(0, 1fr) 288px; }
.rs-rail { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px 0; }
.rs-rail button { width: 44px; border: 0; background: none; border-radius: var(--r-m); display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 7px 0 5px; font-size: 10px; font-weight: 600; color: var(--text-3); cursor: pointer; }
.rs-rail button:hover { background: var(--hover); color: var(--text); }
.rs-rail button.rs-on { background: var(--accent-subtle); color: var(--accent); }
.rs-panel, .rs-props { overflow: auto; min-width: 0; scrollbar-width: thin; }
.rs-folded .rs-panel { display: none; }
.sp-panel-header { position: sticky; top: 0; z-index: 2; display: flex; align-items: center; gap: 8px; height: 48px; padding: 0 8px 0 16px; background: var(--surface);
  border-bottom: 1px solid var(--border); }
.sp-panel-header h2 { margin: 0; font-size: 15px; font-weight: 700; flex: 1; }
.sp-badge { font-size: 12px; font-weight: 600; color: var(--text-2); background: var(--gray-100); border-radius: var(--r-s); padding: 2px 8px; }
.sp-panel-body { padding: 4px 16px 16px; }
.rs-panel h3, .sp-section-title { font-size: 12px; font-weight: 700; color: var(--text-2); margin: 16px 0 8px; letter-spacing: .01em; }
.sp-section { padding: 4px 0 14px; border-bottom: 1px solid var(--border); display: flex; flex-direction: column; gap: 10px; }
.sp-section .sp-section-title { margin: 12px 0 0; }
.sp-section:last-of-type { border-bottom: 0; }
.sp-help, .rs-note { margin: 0; color: var(--text-3); font-size: 12px; }

/* —— Fields —— */
.sp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 8px; }
.sp-row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.sp-field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.sp-field-label { font-size: 12px; color: var(--text-2); }
.sp-textfield-wrap { position: relative; display: block; }
.sp-textfield, .sp-picker { width: 100%; height: 32px; border: 1px solid var(--field-border); border-radius: var(--r-m); background: var(--field); padding: 0 10px; color: var(--text); }
.sp-textfield-wrap .sp-textfield { padding-right: 28px; }
.sp-textfield:hover, .sp-picker:hover { border-color: var(--gray-400); }
.sp-textfield:focus, .sp-picker:focus { outline: none; border-color: var(--focus); box-shadow: 0 0 0 1px var(--focus); }
.sp-textfield:disabled { color: var(--gray-500); background: var(--surface-2); border-color: var(--border); }
.sp-textfield::-webkit-inner-spin-button { opacity: .5; }
.sp-unit { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); font-size: 12px; color: var(--text-3); pointer-events: none; }
.sp-picker { appearance: none; cursor: pointer; padding-right: 30px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Cpath d='M1.5 3.5l3.5 3.5 3.5-3.5' fill='none' stroke='%23808080' stroke-width='1.6' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 11px center; }
.sp-color-field { display: flex; gap: 8px; }
.sp-swatch-button { position: relative; width: 32px; height: 32px; flex: none; cursor: pointer; }
.sp-swatch { position: absolute; inset: 0; border-radius: var(--r-m); box-shadow: inset 0 0 0 1px rgb(0 0 0 / .18); }
.sp-swatch-button input { position: absolute; inset: 0; opacity: 0; width: 100%; height: 100%; cursor: pointer; border: 0; padding: 0; }
.sp-hex { font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 13px; text-transform: uppercase; }
.sp-slider-field { display: flex; flex-direction: column; gap: 4px; }
.sp-slider-label { display: flex; justify-content: space-between; font-size: 12px; color: var(--text-2); }
.sp-slider-value { color: var(--text); font-variant-numeric: tabular-nums; }
.sp-slider { -webkit-appearance: none; appearance: none; width: 100%; height: 24px; background: transparent; cursor: pointer; margin: 0; }
.sp-slider::-webkit-slider-runnable-track { height: 4px; border-radius: 2px; background: linear-gradient(to right, var(--accent) var(--fill, 50%), var(--gray-300) var(--fill, 50%)); }
.sp-slider::-moz-range-track { height: 4px; border-radius: 2px; background: var(--gray-300); }
.sp-slider::-moz-range-progress { height: 4px; border-radius: 2px; background: var(--accent); }
.sp-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; margin-top: -6px; border-radius: 50%; background: var(--field); border: 2px solid var(--accent); }
.sp-slider::-moz-range-thumb { width: 12px; height: 12px; border-radius: 50%; background: var(--field); border: 2px solid var(--accent); }
.sp-slider:hover::-webkit-slider-thumb { border-color: var(--accent-hover); }

.sp-size-row { display: grid; grid-template-columns: 1fr 32px 1fr; gap: 8px; align-items: end; }
.sp-size-row .sp-action-button { height: 32px; }
.sp-ratio.is-selected { background: var(--accent-subtle); color: var(--accent); }
.sp-checkbox { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text); cursor: pointer; position: relative; }
.sp-checkbox input { position: absolute; opacity: 0; width: 16px; height: 16px; margin: 0; cursor: pointer; }
.sp-checkbox-box { width: 16px; height: 16px; flex: none; border: 2px solid var(--gray-600); border-radius: 3px; display: grid; place-items: center; }
.sp-checkbox input:checked + .sp-checkbox-box { background: var(--accent); border-color: var(--accent); }
.sp-checkbox input:checked + .sp-checkbox-box::after { content: ""; width: 8px; height: 4px; border: 2px solid var(--gray-25); border-top: 0; border-right: 0; transform: translateY(-1px) rotate(-45deg); }
.sp-checkbox input:focus-visible + .sp-checkbox-box { outline: 2px solid var(--focus); outline-offset: 2px; }
.rs-unit { width: auto; height: 28px; padding: 0 26px 0 8px; font-size: 12px; background-position: right 8px center; }

.sp-export { width: 320px; padding: 12px; display: flex; flex-direction: column; gap: 12px; }
.sp-export-title { margin: 0; font-size: 15px; font-weight: 700; }
.sp-error { margin: 0; color: var(--negative); font-size: 12px; }
.sp-error:empty { display: none; }
.sp-progress { height: 4px; border-radius: 2px; background: var(--gray-200); overflow: hidden; }
.sp-progress[hidden] { display: none; }
.sp-progress-bar { height: 100%; width: 0; background: var(--accent); transition: width .15s; }

/* —— Action buttons —— */
.sp-action-group { display: inline-flex; gap: 2px; padding: 2px; border-radius: var(--r-m); background: var(--surface-2); border: 1px solid var(--border); }
.sp-action-button { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 28px; border: 0; border-radius: 6px; background: transparent;
  color: var(--text-2); cursor: pointer; }
.sp-panel-header .sp-action-button, .sp-footer .sp-action-button { height: 32px; }
.sp-action-button:hover { background: var(--hover); color: var(--text); }
.sp-action-button:active { background: var(--down); }
.sp-action-button.is-selected { background: var(--accent-subtle); color: var(--accent); }
.sp-action-button:disabled { color: var(--gray-400); background: transparent; cursor: default; }
.sp-action-button svg { width: 18px; height: 18px; }
.sp-footer { display: flex; align-items: center; gap: 4px; padding-top: 14px; }
.sp-spacer { flex: 1; }
.sp-preview { height: 56px; border-radius: var(--r-m); box-shadow: inset 0 0 0 1px rgb(0 0 0 / .1); }
.sp-tips { margin: 0; padding-left: 18px; list-style: disc; color: var(--text-2); font-size: 13px; display: flex; flex-direction: column; gap: 6px; }

/* —— Left panels —— */
.rs-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.rs-grid-3 { grid-template-columns: repeat(3, 1fr); }
.rs-grid-4 { grid-template-columns: repeat(4, 1fr); }
.rs-tile { border: 1px solid var(--border); background: var(--field); border-radius: var(--r-m); padding: 0; cursor: pointer; overflow: hidden;
  display: flex; align-items: center; justify-content: center; transition: border-color .13s, box-shadow .13s; }
.rs-tile:hover { border-color: var(--accent); }
.rs-tile:focus-visible { outline-offset: 1px; }
.rs-tile canvas, .rs-tile img { display: block; width: 100%; height: auto; }
.rs-tile svg { width: 64%; height: auto; }
.rs-app .rs-shape-tile { aspect-ratio: 1; color: var(--text-2); }
.rs-app .rs-shape-tile:hover { color: var(--accent); }
.rs-emoji { aspect-ratio: 1; font-size: 26px; background: transparent; border-color: transparent; }
.rs-emoji:hover { background: var(--hover); }
.rs-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.rs-chip { height: 32px; border: 1px solid var(--field-border); background: var(--field); border-radius: 16px; padding: 0 12px 0 6px; cursor: pointer;
  display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: var(--text); }
.rs-chip:hover { background: var(--hover); }
.rs-chip i { width: 20px; height: 20px; border-radius: 50%; display: inline-block; }
.rs-chip.rs-on { background: var(--accent-subtle); border-color: var(--accent); color: var(--accent); }
.rs-wide { width: 100%; justify-content: flex-start; border: 1px solid var(--border); margin-bottom: 8px; height: auto; padding: 10px 12px; text-align: left;
  border-radius: var(--r-m); color: var(--text); background: var(--field); }
.rs-wide:hover { border-color: var(--accent); background: var(--field); }
.rs-add-heading { font-size: 24px; font-weight: 800; }
.rs-add-sub { font-size: 18px; font-weight: 700; }
.rs-add-body { font-size: 14px; }
.rs-pair { display: block; width: 100%; border: 1px solid var(--border); border-radius: var(--r-m); background: var(--field); padding: 12px; margin-bottom: 8px;
  cursor: pointer; text-align: left; color: var(--text); }
.rs-pair:hover { border-color: var(--accent); }
.rs-pair b { display: block; font-size: 22px; line-height: 1.1; }
.rs-pair span { display: block; font-size: 12px; color: var(--text-3); margin-top: 4px; }
.rs-swatch { aspect-ratio: 1; border-radius: var(--r-m); border: 0; box-shadow: inset 0 0 0 1px rgb(0 0 0 / .14); cursor: pointer; padding: 0; }
.rs-swatch:hover { box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px var(--gray-800); }
.rs-drop { border: 2px dashed var(--gray-400); border-radius: var(--r-l); padding: 20px 16px; text-align: center; color: var(--text-2); margin: 12px 0; }
.rs-drop p { margin: 0 0 12px; }
.rs-drop.rs-over { border-color: var(--accent); background: var(--accent-subtle); }
.rs-layer { display: flex; align-items: center; gap: 10px; padding: 6px; border-radius: var(--r-m); cursor: pointer; }
.rs-layer:hover { background: var(--hover); }
.rs-layer.rs-on { background: var(--accent-subtle); box-shadow: inset 0 0 0 1px var(--accent); }
.rs-layer canvas { width: 36px; height: 36px; border-radius: 6px; background: var(--gray-100); flex: none; }
.rs-layer span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rs-layer .rs-btn { height: 28px; min-width: 28px; padding: 0 4px; }

/* —— Canvas —— */
.rs-main { display: grid; grid-template-rows: minmax(0, 1fr) auto; gap: 8px; min-width: 0; min-height: 0; }
.rs-viewport:focus-visible { outline-offset: -2px; }
.rs-viewport { position: relative; overflow: auto; min-height: 0; display: grid; place-items: center; padding: 24px; outline: none; background: var(--canvas); border-radius: var(--r-l); }
.rs-stage { position: relative; background: #fff; flex: none; box-shadow: 0 1px 3px rgb(47 46 43 / .12), 0 8px 24px -12px rgb(47 46 43 / .18); }
.rs-stage canvas { display: block; width: 100%; height: 100%; }
.rs-overlay { position: absolute; inset: 0; overflow: visible; }
.rs-box { position: absolute; pointer-events: none; transform-origin: center; }
.rs-hover-box { outline: 1px solid var(--selection); }
/* Someone else's selection, in their colour, their name over it. */
.rs-peer-box { outline: 2px solid var(--peer); }
.rs-peer-name { position: absolute; left: -2px; bottom: 100%; margin-bottom: 2px; padding: 1px 6px; border-radius: 5px 5px 5px 0; background: var(--peer); color: #fff; font-size: 11px; font-weight: 600; white-space: nowrap; }
.rs-sel-box { outline: 1.5px solid var(--selection); }
.rs-group-box { outline: 1.5px solid var(--selection); box-shadow: 0 0 0 4px rgb(var(--selection-rgb) / .12); }
.rs-group-box ~ .rs-group-box, .rs-overlay:has(.rs-group-box) .rs-sel-box { outline-style: dashed; outline-width: 1px; }
.rs-handle { position: absolute; width: 10px; height: 10px; margin: -5px 0 0 -5px; background: #fff; border: 1.5px solid var(--selection); border-radius: 2px;
  pointer-events: auto; box-shadow: 0 1px 2px rgb(0 0 0 / .2); }
.rs-handle.rs-side-h { width: 6px; height: 16px; margin: -8px 0 0 -3px; border-radius: 3px; }
.rs-handle.rs-side-v { width: 16px; height: 6px; margin: -3px 0 0 -8px; border-radius: 3px; }
.rs-handle.rs-rotate { width: 24px; height: 24px; margin: -12px 0 0 -12px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: grab;
  color: var(--selection); border-width: 1px; }
.rs-size-tag { position: absolute; transform: translate(-50%, 0); background: var(--gray-900); color: var(--gray-25); font-size: 11px; font-weight: 600;
  padding: 2px 6px; border-radius: var(--r-s); white-space: nowrap; pointer-events: none; font-variant-numeric: tabular-nums; }
.rs-guide { position: absolute; background: var(--guide); pointer-events: none; }
.rs-marquee { position: absolute; border: 1px solid var(--selection); background: rgb(var(--selection-rgb) / .08); pointer-events: none; }
.rs-caret { position: absolute; width: 2px; background: var(--selection); animation: rs-blink 1s steps(1) infinite; }
.rs-sel-rect { position: absolute; background: rgb(var(--selection-rgb) / .28); }
@keyframes rs-blink { 50% { opacity: 0; } }
.rs-input { position: fixed; left: -9999px; top: 0; width: 20px; height: 20px; opacity: 0; }

/* —— Pages —— */
.rs-bottom { display: flex; align-items: center; gap: 12px; padding: 8px 12px; min-width: 0; }
.rs-strip { display: flex; gap: 10px; overflow-x: auto; padding: 4px 2px; flex: 1; min-width: 0; align-items: center; scrollbar-width: thin; }
.rs-thumb { position: relative; flex: none; width: auto; border-radius: var(--r-m); cursor: pointer; border: 2px solid transparent; padding: 2px; background: none; }
.rs-thumb:hover { border-color: var(--gray-400); }
.rs-thumb canvas { display: block; height: 68px; width: auto; max-width: 160px; object-fit: contain; border-radius: 5px; box-shadow: 0 0 0 1px var(--border); }
.rs-thumb.rs-on { border-color: var(--accent); }
.rs-thumb.rs-drop-before { box-shadow: -7px 0 0 -3px var(--accent); }
.rs-thumb .rs-num { position: absolute; left: 6px; bottom: 6px; background: rgb(0 0 0 / .65); color: #fff; font-size: 10px; font-weight: 700; border-radius: 3px; padding: 0 5px; }
.rs-thumb .rs-thumb-tools { position: absolute; right: 5px; top: 5px; display: none; gap: 3px; }
.rs-thumb:hover .rs-thumb-tools { display: flex; }
.rs-thumb-tools span { background: var(--surface); color: var(--text); border-radius: 6px; width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center;
  box-shadow: var(--elevation); }
.rs-thumb-tools span:hover { background: var(--gray-100); }
.rs-thumb-tools svg { width: 14px; height: 14px; }
.rs-add-slide { flex: none; width: 68px; height: 68px; border: 1px dashed var(--gray-500); border-radius: var(--r-m); background: none; cursor: pointer; color: var(--text-2);
  display: grid; place-items: center; }
.rs-add-slide:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-subtle); }
.rs-zoom { display: flex; align-items: center; gap: 8px; color: var(--text-2); font-size: 12px; white-space: nowrap; font-variant-numeric: tabular-nums; }
.rs-zoom input { width: 110px; accent-color: var(--accent); }

/* —— Popovers —— */
.rs-menu { position: fixed; z-index: 50; background: var(--field); border: 1px solid var(--border); border-radius: var(--r-l); box-shadow: var(--elevation);
  padding: 4px; min-width: 220px; color: var(--text); }
.rs-menu > button { display: flex; width: 100%; align-items: center; gap: 10px; border: 0; background: none; padding: 0 10px; height: 32px; border-radius: var(--r-m);
  cursor: pointer; text-align: left; color: var(--text); }
.rs-menu > button svg { width: 18px; height: 18px; color: var(--text-2); }
.rs-menu > button:hover { background: var(--hover); }
.rs-menu hr { border: 0; border-top: 1px solid var(--border); margin: 4px 6px; }
.rs-toast { position: fixed; left: 50%; bottom: 120px; transform: translateX(-50%); background: var(--gray-800); color: var(--gray-25); padding: 0 16px; height: 44px;
  display: flex; align-items: center; border-radius: var(--r-m); z-index: 60; box-shadow: var(--elevation); font-size: 14px; font-weight: 600; }
.rs-present { position: fixed; inset: 0; background: #000; z-index: 100; display: flex; align-items: center; justify-content: center; cursor: none; }
.rs-present canvas { max-width: 100%; max-height: 100%; }
.rs-present-count { position: absolute; bottom: 14px; right: 18px; color: rgb(255 255 255 / .5); font-size: 13px; }

/* —— The menu of the deck: a screen over the studio, its parts down one side, as Rebodocs has it —— */
.rs-side { position: absolute; inset: 0; z-index: 40; display: flex; background: var(--surface); color: var(--text); animation: rs-side-in .16s ease-out; }
@keyframes rs-side-in { from { opacity: 0; transform: scale(1.01); } }
.rs-side[hidden] { display: none; }
.rs-side-nav { flex: none; display: flex; flex-direction: column; gap: 2px; width: 260px; padding: 18px 14px; border-right: 1px solid var(--border); overflow-y: auto; }
.rs-side-list { display: contents; }
.rs-side-glyph { display: inline-flex; color: var(--text-3); }
.rs-side-back { display: flex; align-items: center; gap: 8px; height: 38px; margin-bottom: 14px; padding: 0 10px; border: 0; border-radius: 10px; background: var(--hover); font-weight: 600; cursor: pointer; text-align: left; }
.rs-side-back:hover { background: var(--down); }
.rs-side-back .rs-side-glyph { color: inherit; }
.rs-side-tab { display: flex; align-items: center; gap: 10px; height: 40px; padding: 0 12px; border: 0; border-radius: 10px; background: none; text-align: left; font-size: 14px; cursor: pointer; }
.rs-side-tab:hover { background: var(--hover); }
.rs-side-tab[aria-selected="true"] { background: var(--field); color: var(--accent); font-weight: 600; box-shadow: 0 0 0 1px var(--border), 0 1px 3px rgb(47 46 43 / .12); }
.rs-side-tab[aria-selected="true"] .rs-side-glyph { color: var(--accent); }
.rs-side-doc { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 12px; background: var(--field); border: 1px solid var(--border); }
.rs-side-nav .rs-side-doc { margin-top: auto; }
.rs-side-doc b { display: block; font-size: 15px; }
.rs-side-doc small { display: block; margin-top: 2px; color: var(--text-3); font-size: 12px; }
.rs-side-pane .rs-side-doc { border: 0; padding: 0; background: none; margin-bottom: 14px; }
.rs-side-icon { display: grid; place-items: center; flex: none; width: 40px; height: 40px; border-radius: 10px; background: var(--accent-subtle); color: var(--accent); }
.rs-side-icon svg { width: 20px; height: 20px; }
.rs-side-main { position: relative; flex: 1; min-width: 0; overflow-y: auto; padding: 40px clamp(20px, 5vw, 64px); }
.rs-side-pane { max-width: 760px; }
.rs-side-pane[hidden] { display: none; }
.rs-side-pane h2 { margin: 0 0 6px; font-size: 28px; font-weight: 800; letter-spacing: -.02em; }
.rs-side-pane > p { margin: 0 0 24px; color: var(--text-3); font-size: 14px; }
.rs-side-x { position: absolute; right: 16px; top: 16px; display: grid; place-items: center; width: 36px; height: 36px; border: 0; border-radius: 10px; background: none; cursor: pointer; color: var(--text-2); }
.rs-side-x:hover { background: var(--hover); color: var(--text); }
.rs-side-tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
.rs-side-tile { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; min-height: 104px; padding: 12px; border: 1px solid var(--border); border-radius: 12px; background: var(--field); cursor: pointer; }
.rs-side-tile .rs-side-glyph { color: var(--accent); }
.rs-side-tile small { color: var(--text-3); font-size: 11px; }
.rs-side-tile:hover, .rs-side-format:hover, .rs-side-choice:hover { border-color: var(--accent); }
.rs-side-formats { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 8px; }
.rs-side-format { display: flex; align-items: center; gap: 14px; padding: 16px; border: 1px solid var(--border); border-radius: 12px; background: var(--field); text-align: left; cursor: pointer; }
.rs-side-format b { display: block; font-size: 14px; }
.rs-side-format small { display: block; margin-top: 3px; color: var(--text-3); font-size: 12px; line-height: 1.4; }
.rs-side-choices { display: flex; flex-wrap: wrap; gap: 8px; }
.rs-side-choice { display: flex; align-items: center; gap: 10px; min-width: 160px; height: 44px; padding: 0 14px; border: 1px solid var(--border); border-radius: 12px; background: var(--field); cursor: pointer; }
.rs-side-dot { width: 16px; height: 16px; border-radius: 50%; border: 1.5px solid var(--gray-400); flex: none; }
.rs-side-choice[aria-checked="true"] { border-color: var(--accent); color: var(--accent); font-weight: 600; }
.rs-side-choice[aria-checked="true"] .rs-side-dot { border: 5px solid var(--accent); }
@media (max-width: 700px) {
  .rs-side { flex-direction: column; }
  .rs-side-nav { flex-direction: row; width: auto; margin-right: 48px; padding: 10px; gap: 4px; border-right: 0; overflow-x: auto; }
  .rs-side-nav .rs-side-doc { display: none; }
  .rs-side-back { margin: 0; padding: 0 8px; }
  .rs-side-back span:last-child { display: none; }
  .rs-side-tab { flex: none; }
  .rs-side-main { padding: 22px 16px; border-top: 1px solid var(--border); }
  .rs-side-x { top: 10px; right: 8px; }
}

@media (max-width: 1100px) {
  .rs-body { grid-template-columns: 56px 248px minmax(0, 1fr) 256px; }
  .rs-app-name, .rs-btn-text { display: none; }
}
`;

let injected = false;

export function injectStyles(): void {
  if (injected || typeof document === 'undefined') return;
  injected = true;
  const style = document.createElement('style');
  style.dataset.reboslides = '';
  style.textContent = CSS;
  document.head.appendChild(style);
}
