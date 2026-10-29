// The studio drawn in the hero: a picture of a slide being made, of CSS
// alone, laid out as the studio comes, islands on a warm canvas: the bar, the
// tools on the left, the slide with a shape being dragged to a guide, the
// properties on the right, the pages below. Its words are the studio's own.

import type { L } from '@/lib/i18n';
import { getT } from '@/lib/locale';

const HEADING: L = { en: 'Q3 in review', es: 'El trimestre' };
const SUB: L = { en: 'What we built, and what comes next', es: 'Lo que hicimos y lo que sigue' };

const Field = ({ label, value }: { label: string; value: string }) => (
  <div className="min-w-0">
    <p className="m-0 text-[9px] text-[#6b6964]">{label}</p>
    <p className="m-0 mt-0.5 truncate rounded-[6px] border border-[#e6e3dc] bg-white px-1.5 py-[3px] text-[10px] text-[#2f2e2b]">{value}</p>
  </div>
);

const island = 'rounded-[14px] border border-[#e6e3dc] bg-[#fbfaf8]';

export function HeroStudio() {
  const t = getT();
  return (
    <div aria-hidden="true" className="relative mx-auto mt-14 max-w-[1040px] select-none text-left">
      <div className="flex flex-col gap-2 overflow-hidden rounded-[22px] border border-border bg-[#efede8] p-2 shadow-editor sm:gap-2.5 sm:p-2.5">
        {/* The bar. */}
        <div className={`${island} flex items-center gap-2 px-3 py-2`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" width={20} height={20} />
          <span className="text-[11px] font-bold text-[#2f2e2b]">ReboSlides</span>
          <span className="ml-2 text-[11px] font-semibold text-[#5f5d58]">{t({ en: 'File ▾', es: 'Archivo ▾' })}</span>
          <span className="mx-auto text-[11px] font-semibold text-[#2f2e2b]">{t(HEADING)}</span>
          <span className="hidden rounded-[7px] border border-[#dddad3] bg-white px-2.5 py-0.5 text-[10px] font-semibold text-[#2f2e2b] sm:inline">{t({ en: 'Download', es: 'Descargar' })}</span>
          <span className="rounded-[7px] bg-brand px-2.5 py-1 text-[10px] font-semibold text-white">▶ {t({ en: 'Present', es: 'Presentar' })}</span>
        </div>
        <div className="flex gap-2 sm:gap-2.5">
          {/* The tools. */}
          <div className={`${island} hidden flex-col items-center gap-2.5 px-2 py-3 sm:flex`}>
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className={`size-6 rounded-lg ${i === 1 ? 'bg-brand-light' : 'bg-[#f3f1ec]'}`} />
            ))}
          </div>
          {/* The slide, on the canvas. */}
          <div className="relative flex flex-1 items-center justify-center p-[clamp(10px,2.4vw,28px)]">
            <div className="relative aspect-[16/9] w-full max-w-[560px] overflow-hidden rounded-[3px] bg-[linear-gradient(35deg,#7c3aed,#ec4899)] shadow-[0_1px_3px_rgba(47,46,43,0.12),0_8px_24px_-12px_rgba(47,46,43,0.18)] @container">
              <span className="absolute -right-[12%] -top-[30%] aspect-square w-[46%] rounded-full bg-[#a855f7]" />
              <span className="absolute left-[8%] top-[30%] h-[2%] w-[7%] rounded-sm bg-[#fde047]" />
              <p className="absolute left-[8%] top-[35%] m-0 font-display text-[clamp(18px,5.2cqw,40px)] font-extrabold leading-[1.05] text-white">{t(HEADING)}</p>
              <p className="absolute left-[8%] top-[58%] m-0 text-[clamp(9px,2.2cqw,16px)] text-[#f5f3ff]">{t(SUB)}</p>
              {/* The guide it snaps to, and the star being dragged to it. */}
              <span className="absolute left-[72%] top-0 h-full w-px animate-[guide_5s_ease-in-out_infinite] bg-[#e2185b]" />
              <span className="absolute left-[63%] top-[52%] aspect-square w-[18%] animate-[slide_5s_ease-in-out_infinite]">
                <svg viewBox="0 0 100 100" className="size-full" aria-hidden="true">
                  <path d="M50 4l13 30 33 3-25 22 8 33-29-17-29 17 8-33L4 37l33-3z" fill="#fde047" />
                </svg>
                <span className="absolute inset-0 outline-[1.5px] outline-brand">
                  {['left-0 top-0', 'right-0 top-0', 'left-0 bottom-0', 'right-0 bottom-0'].map((at) => (
                    <span key={at} className={`absolute ${at} m-[-4px] size-[8px] rounded-[2px] border-[1.5px] border-brand bg-white`} />
                  ))}
                </span>
              </span>
            </div>
          </div>
          {/* The properties. */}
          <div className={`${island} hidden w-[190px] flex-none flex-col gap-2.5 p-3 md:flex`}>
            <p className="m-0 text-[11px] font-bold text-[#2f2e2b]">{t({ en: 'Properties', es: 'Propiedades' })}</p>
            <p className="m-0 text-[9px] font-bold text-[#5f5d58]">{t({ en: 'Transform', es: 'Transformar' })}</p>
            <div className="grid grid-cols-2 gap-1.5">
              <Field label="X" value="604 pt" />
              <Field label="Y" value="282 pt" />
              <Field label={t({ en: 'Width', es: 'Ancho' })} value="173 pt" />
              <Field label={t({ en: 'Height', es: 'Alto' })} value="173 pt" />
            </div>
            <p className="m-0 mt-1 text-[9px] font-bold text-[#5f5d58]">{t({ en: 'Shape', es: 'Forma' })}</p>
            <div className="flex items-center gap-1.5">
              <span className="size-5 rounded-[5px] bg-[#fde047] shadow-[inset_0_0_0_1px_rgba(0,0,0,.15)]" />
              <span className="flex-1 rounded-[6px] border border-[#e6e3dc] bg-white px-1.5 py-[3px] font-code text-[10px] text-[#2f2e2b]">FDE047</span>
            </div>
            <p className="m-0 mt-1 text-[9px] font-bold text-[#5f5d58]">{t({ en: 'Opacity', es: 'Opacidad' })}</p>
            <span className="relative h-1 rounded bg-[#dddad3]">
              <span className="absolute inset-y-0 left-0 w-[80%] rounded bg-brand" />
              <span className="absolute left-[80%] top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-brand bg-white" />
            </span>
          </div>
        </div>
        {/* The pages. */}
        <div className={`${island} flex gap-2 px-3 py-2`}>
          {['bg-[linear-gradient(35deg,#7c3aed,#ec4899)]', 'bg-[#0f172a]', 'bg-[#f5f0e8]', 'bg-[#ecfdf5]', 'bg-[#fde047]'].map((bg, i) => (
            <span key={bg} className={`aspect-[16/9] w-[clamp(42px,9vw,72px)] rounded-[3px] ${bg} ${i === 0 ? 'outline-2 outline-offset-1 outline-brand' : 'shadow-[0_0_0_1px_#e6e3dc]'}`} />
          ))}
        </div>
      </div>
      <p className="absolute -bottom-9 right-2 m-0 hidden rotate-[-3deg] font-hand text-2xl text-pastel-pink-fg sm:block">{t({ en: 'it snaps to the guides ↑', es: 'se ajusta a las guías ↑' })}</p>
    </div>
  );
}
