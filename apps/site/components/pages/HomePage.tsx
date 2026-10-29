import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { CodeTabs } from '@/components/CodeTabs';
import { LiveStudio } from '@/components/LiveStudio';
import { FeatureGrid } from '@/components/home/FeatureGrid';
import { HeroStudio } from '@/components/home/HeroStudio';
import { Metrics, TESTS } from '@/components/home/Metrics';
import { StartCommand } from '@/components/home/StartCommand';
import { primary } from '@/components/home/buttons';
import { SiteFooter, SiteHeader } from '@/components/home/SiteChrome';
import { LocalLink as Link } from '@/components/i18n';
import { LIGHT_THEME, highlight } from '@/lib/docs';
import { PACKAGES, PASTEL_CLASS, type Pastel, TAGS, VERSION, pastelAt } from '@/lib/home';
import { type L, LANGUAGES, type Locale, formatNumber, localize, translator } from '@/lib/i18n';
import { setPageLocale } from '@/lib/locale';
import { pageMetadata } from '@/lib/seo';
import { REBODOCS, REPO, SITE } from '@/lib/site';

/** The examples beside "For developers": a name for the tab, the language of the code, and the code, its comments in the language of the page. */
const SAMPLES: [L, string, L][] = [
  [
    { en: 'In a page', es: 'En una página' },
    'ts',
    {
      en: `import { Studio, googleFontsUrl } from '@reboslides/editor';

// The fonts the themes are set in.
const fonts = document.createElement('link');
fonts.rel = 'stylesheet';
fonts.href = googleFontsUrl();
document.head.append(fonts);

// The studio fills the box it is given.
const studio = new Studio(document.getElementById('studio')!, {
  embedded: true,
  storageKey: null,
});`,
      es: `import { Studio, googleFontsUrl } from '@reboslides/editor';

// Las fuentes en que están los temas.
const fonts = document.createElement('link');
fonts.rel = 'stylesheet';
fonts.href = googleFontsUrl();
document.head.append(fonts);

// El estudio llena la caja que le das.
const studio = new Studio(document.getElementById('studio')!, {
  embedded: true,
  storageKey: null,
});`,
    },
  ],
  [
    { en: 'React', es: 'React' },
    'tsx',
    {
      en: `'use client';
import { useEffect, useRef } from 'react';
import type { Deck } from '@reboslides/core';
import { Studio } from '@reboslides/editor';

export function SlideStudio({ deck }: { deck?: Deck }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const studio = new Studio(box.current!, { deck, embedded: true, storageKey: null });
    return () => studio.destroy();
  }, [deck]);
  return <div ref={box} style={{ position: 'relative', height: 640 }} />;
}`,
      es: `'use client';
import { useEffect, useRef } from 'react';
import type { Deck } from '@reboslides/core';
import { Studio } from '@reboslides/editor';

export function EstudioDeDiapositivas({ deck }: { deck?: Deck }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const studio = new Studio(box.current!, { deck, embedded: true, storageKey: null });
    return () => studio.destroy();
  }, [deck]);
  return <div ref={box} style={{ position: 'relative', height: 640 }} />;
}`,
    },
  ],
  [
    { en: 'The engine', es: 'El motor' },
    'ts',
    {
      en: `import { addElements, alignElements, createShape, themedDeck, THEMES, DEFAULT_SIZE } from '@reboslides/core';

let deck = themedDeck(THEMES[3], DEFAULT_SIZE, 'Q3 review');
const slide = deck.slides[0];

const star = createShape('star', { x: 0, y: 40, width: 96, height: 96 });
deck = addElements(deck, slide.id, [star]);
deck = alignElements(deck, slide.id, [star.id], 'center');

// Every change is a new deck: the old one is still there to undo to.`,
      es: `import { addElements, alignElements, createShape, themedDeck, THEMES, DEFAULT_SIZE } from '@reboslides/core';

let deck = themedDeck(THEMES[3], DEFAULT_SIZE, 'Revisión del trimestre');
const slide = deck.slides[0];

const star = createShape('star', { x: 0, y: 40, width: 96, height: 96 });
deck = addElements(deck, slide.id, [star]);
deck = alignElements(deck, slide.id, [star.id], 'center');

// Cada cambio es una presentación nueva: la anterior sigue ahí para deshacer.`,
    },
  ],
  [
    { en: 'PDF in Node', es: 'PDF en Node' },
    'ts',
    {
      en: `import { readFile, writeFile } from 'node:fs/promises';
import { FontMeasurer, readFont } from '@rebodocs/core';
import { exportDeckPdf, themedDeck, THEMES, DEFAULT_SIZE } from '@reboslides/core';

const inter = readFont(await readFile('Inter-Regular.ttf'))!;
const measurer = new FontMeasurer([inter]);

const deck = themedDeck(THEMES[0], DEFAULT_SIZE, 'Q3 review');
const pdf = exportDeckPdf(deck, {
  measurer,
  font: (face) => (face.family === 'Inter' ? inter.bytes : undefined),
});
await writeFile('q3.pdf', pdf);`,
      es: `import { readFile, writeFile } from 'node:fs/promises';
import { FontMeasurer, readFont } from '@rebodocs/core';
import { exportDeckPdf, themedDeck, THEMES, DEFAULT_SIZE } from '@reboslides/core';

const inter = readFont(await readFile('Inter-Regular.ttf'))!;
const measurer = new FontMeasurer([inter]);

const deck = themedDeck(THEMES[0], DEFAULT_SIZE, 'Revisión del trimestre');
const pdf = exportDeckPdf(deck, {
  measurer,
  font: (face) => (face.family === 'Inter' ? inter.bytes : undefined),
});
await writeFile('trimestre.pdf', pdf);`,
    },
  ],
];

const TITLE: L = {
  en: 'ReboSlides: the slide studio you build into your app',
  es: 'ReboSlides: el estudio de diapositivas que integras en tu aplicación',
};
const DESCRIPTION: L = {
  en: 'A design studio for presentations, in the browser: place text, shapes and pictures freely, start from themes, present full screen and export a vector PDF — its text set by the rebodocs engine.',
  es: 'Un estudio de diseño de presentaciones, en el navegador: coloca texto, formas e imágenes libremente, empieza con temas, presenta a pantalla completa y exporta un PDF vectorial, con el texto maquetado por el motor de rebodocs.',
};

export function homeMetadata(locale: Locale): Metadata {
  const t = translator(locale);
  return pageMetadata({ locale, path: '/', title: t(TITLE), description: t(DESCRIPTION), absoluteTitle: true });
}

/** What the page is, for search engines: the project as a piece of software, free, in the language of the page. */
function StructuredData({ locale }: { locale: Locale }) {
  const t = translator(locale);
  const data = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'ReboSlides',
    applicationCategory: 'DesignApplication',
    operatingSystem: 'Web',
    description: t(DESCRIPTION),
    url: `${SITE}${localize('/', locale)}`,
    inLanguage: LANGUAGES[locale].tag,
    softwareVersion: VERSION,
    license: 'https://opensource.org/licenses/MIT',
    codeRepository: REPO,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  };
  // JSON written here, with no "<" in it to close the script.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />;
}

const secondary = 'rounded-xl border border-border-strong bg-white font-semibold text-ink transition-colors hover:bg-hover';

const Pill = ({ color, children }: { color: Pastel; children: ReactNode }) => <span className={`rounded-full px-3 py-[5px] text-[13px] font-semibold ${PASTEL_CLASS[color]}`}>{children}</span>;
const Title = ({ children, small }: { children: ReactNode; small?: boolean }) => (
  <h2 className={`mt-4.5 font-display font-extrabold leading-[1.08] tracking-[-0.03em] ${small ? 'text-[clamp(34px,4.2vw,52px)]' : 'text-[clamp(36px,4.6vw,56px)]'}`}>{children}</h2>
);

const doodle = 'absolute hidden md:block';
/** A stroke drawn by hand, that draws itself in after `delay`. */
const drawn = (delay: string) => ({ className: 'draw animate-draw', style: { animationDelay: delay } });

/** The words the hand-drawn stroke underlines, and what comes before and after them. */
const HEADLINE: L<[string, string, string]> = {
  en: ['The slide studio you ', 'build into', ' your app.'],
  es: ['El estudio de diapositivas que ', 'integras', ' en tu aplicación.'],
};

function Hero({ locale }: { locale: Locale }) {
  const t = translator(locale);
  const [before, underlined, after] = t(HEADLINE);
  return (
    <section id="top" className="relative mx-auto max-w-[1180px] px-6 pb-14 pt-18 text-center">
      <svg width="70" height="70" viewBox="0 0 70 70" aria-hidden="true" className={`${doodle} left-[6%] top-[90px] animate-float`}>
        <path {...drawn('1.2s')} d="M35 8l6 18 18 6-18 6-6 18-6-18-18-6 18-6z" fill="none" stroke="#E0A526" strokeWidth="2.5" strokeLinejoin="round" />
      </svg>
      <svg width="90" height="70" viewBox="0 0 90 70" aria-hidden="true" className={`${doodle} right-[7%] top-[110px] animate-float-slow`}>
        <rect {...drawn('1.8s')} x="8" y="10" width="70" height="46" rx="6" fill="none" stroke="#E86A8C" strokeWidth="2.5" transform="rotate(-6 43 33)" />
      </svg>
      <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true" className={`${doodle} right-[13%] top-[330px] animate-float`}>
        <circle className="animate-pop-in opacity-0" style={{ animationDelay: '0.6s' }} cx="28" cy="28" r="20" fill="none" stroke="#6BAF7B" strokeWidth="2.5" strokeDasharray="4 7" />
      </svg>

      <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface py-1.5 pl-2 pr-3.5 text-sm text-muted">
        <span className="rounded-full border border-border bg-white px-2 py-0.5 text-xs font-semibold text-ink">{t({ en: 'New', es: 'Nuevo' })}</span>
        {t({ en: 'Scale a group from its corners · vector PDF', es: 'Escala un grupo desde sus esquinas · PDF vectorial' })}
      </p>
      <h1 className="mx-auto mt-7 max-w-[920px] text-balance font-display text-[clamp(44px,6.6vw,84px)] font-extrabold leading-[1.04] tracking-[-0.03em]">
        {before}
        <span className="relative whitespace-nowrap text-brand">
          {underlined}
          <svg viewBox="0 0 300 20" preserveAspectRatio="none" aria-hidden="true" className="absolute -bottom-2.5 left-0 h-[18px] w-full">
            <path {...drawn('0s')} d="M4 14C70 4 160 4 296 10" fill="none" stroke="#F5C443" strokeWidth="7" strokeLinecap="round" />
          </svg>
        </span>
        {after}
      </h1>
      <p className="mx-auto mt-7 max-w-[660px] text-[19px] leading-[1.6] text-muted">{t(DESCRIPTION)}</p>
      <p className="mt-8 flex flex-wrap justify-center gap-2.5 text-base">
        <Link href="/docs/getting-started/" className={`rounded-xl px-5.5 py-3.5 ${primary}`}>
          {t({ en: 'Get started', es: 'Empezar' })}
        </Link>
        <a href="#demo" className={`px-5.5 py-3.5 ${secondary}`}>
          {t({ en: 'Try it below', es: 'Pruébalo abajo' })}
        </a>
      </p>
      <StartCommand />
      <HeroStudio />
    </section>
  );
}

export async function HomePage({ locale }: { locale: Locale }) {
  setPageLocale(locale);
  const t = translator(locale);
  const samples = await Promise.all(SAMPLES.map(async ([name, lang, code]) => ({ name: t(name), html: await highlight(t(code), lang, LIGHT_THEME) })));
  return (
    <div className="home overflow-x-clip text-ink">
      <StructuredData locale={locale} />
      <SiteHeader />
      <main>
        <Hero locale={locale} />

        <ul className="reveal mx-auto flex max-w-[1180px] flex-wrap justify-center gap-2.5 px-6 pb-6 pt-14" aria-label={t({ en: 'What it does', es: 'Qué hace' })}>
          {TAGS.map((tag, i) => (
            <li key={tag.en} className={`rounded-full px-3.5 py-[7px] text-sm font-medium transition duration-250 hover:-translate-y-1 hover:shadow-lift ${PASTEL_CLASS[pastelAt(i)]}`}>
              {t(tag)}
            </li>
          ))}
        </ul>

        <Metrics />

        <section id="demo" className="mx-auto max-w-[1180px] px-6 pb-15 pt-25">
          <div className="reveal mx-auto max-w-[740px] text-center">
            <Pill color="purple">{t({ en: 'Live studio', es: 'Estudio en vivo' })}</Pill>
            <Title>{t({ en: 'This is the studio. Make a slide.', es: 'Este es el estudio. Haz una diapositiva.' })}</Title>
            <p className="mt-4.5 text-lg leading-[1.6] text-muted">
              {t({
                en: 'Drag the shapes, double-click a text to type in it, pick several and scale them from a corner, add a slide from Design, then present it or download the PDF. Nothing leaves the browser.',
                es: 'Arrastra las formas, haz doble clic en un texto para escribir, elige varios y escálalos desde una esquina, añade una diapositiva desde Diseño, luego preséntala o descarga el PDF. Nada sale del navegador.',
              })}
            </p>
          </div>
          <div className="reveal mt-11 rounded-3xl border border-border bg-surface p-3.5">
            <LiveStudio className="h-[clamp(560px,78vh,760px)] overflow-hidden rounded-2xl border border-border bg-white" />
          </div>
          <p className="mt-4.5 text-center text-[15px] text-muted">
            {t({ en: 'More room to work →', es: 'Más espacio para trabajar →' })}{' '}
            <Link href="/demo/" className="font-medium text-brand hover:text-brand-hover">
              {t({ en: 'open the studio on the whole window', es: 'abre el estudio en toda la ventana' })}
            </Link>
          </p>
        </section>

        <section className="mx-auto max-w-[1180px] px-6 py-20">
          <div className="reveal mx-auto mb-12 max-w-[720px] text-center">
            <Pill color="green">{t({ en: 'Features', es: 'Funciones' })}</Pill>
            <Title>{t({ en: 'Everything a slide needs, and nothing in the way.', es: 'Todo lo que una diapositiva necesita, y nada que estorbe.' })}</Title>
          </div>
          <FeatureGrid />
        </section>

        <section id="docs" className="mx-auto max-w-[1180px] px-6 py-20">
          <div className="flex flex-wrap items-center gap-12 rounded-[28px] bg-surface p-[clamp(28px,5vw,64px)]">
            <div className="reveal min-w-0 flex-[1_1_360px]">
              <Pill color="yellow">{t({ en: 'For developers', es: 'Para desarrolladores' })}</Pill>
              <Title small>{t({ en: 'One class in your page. An engine in your server.', es: 'Una clase en tu página. Un motor en tu servidor.' })}</Title>
              <p className="mt-4.5 text-[17px] leading-[1.65] text-muted">
                {t({
                  en: 'The studio mounts in any element, with no framework. The engine has no DOM: build decks, change them and make their PDF in Node, with the same code the studio runs.',
                  es: 'El estudio se monta en cualquier elemento, sin framework. El motor no usa el DOM: crea presentaciones, cámbialas y haz su PDF en Node, con el mismo código que corre el estudio.',
                })}
              </p>
              <Link href="/docs/studio/" className="mt-5 inline-flex items-center gap-1.5 font-semibold text-brand hover:text-brand-hover">
                {t({ en: 'Read the guide', es: 'Lee la guía' })} <span aria-hidden="true">→</span>
              </Link>
            </div>
            <div className="reveal min-w-0 flex-[1.2_1_480px]">
              <CodeTabs samples={samples} />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1180px] px-6 py-20">
          <div className="reveal mb-7 flex flex-wrap items-end justify-between gap-4">
            <div>
              <Pill color="orange">{t({ en: 'Packages', es: 'Paquetes' })}</Pill>
              <Title small>{t({ en: 'Take what you need.', es: 'Toma lo que necesites.' })}</Title>
            </div>
            <p className="max-w-[400px] text-base leading-[1.6] text-muted">
              {t({
                en: 'Six packages, each on its own. The text of every box is laid out by the engine of',
                es: 'Seis paquetes, cada uno por su cuenta. El texto de cada caja lo maqueta el motor de',
              })}{' '}
              <a href={REBODOCS} className="font-medium text-brand hover:text-brand-hover">
                Rebodocs
              </a>
              .
            </p>
          </div>
          <div className="reveal overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[680px] border-collapse text-left text-[15px]">
              <colgroup>
                <col className="w-[27%]" />
                <col className="w-[53%]" />
                <col />
              </colgroup>
              <thead className="bg-surface text-[13px] font-medium text-muted">
                <tr>
                  <th className="px-4.5 py-[11px] font-medium">{t({ en: 'Package', es: 'Paquete' })}</th>
                  <th className="border-l border-border px-4.5 py-[11px] font-medium">{t({ en: 'What it does', es: 'Qué hace' })}</th>
                  <th className="border-l border-border px-4.5 py-[11px] font-medium">{t({ en: 'Runs in', es: 'Corre en' })}</th>
                </tr>
              </thead>
              <tbody>
                {PACKAGES.map((pkg) => (
                  <tr key={pkg.name} className="border-t border-border align-top transition-colors hover:bg-surface">
                    <td className="px-4.5 py-3.5">
                      <Link href="/docs/packages/" className="font-code text-sm font-medium text-ink underline decoration-border-strong underline-offset-4 hover:decoration-current">
                        {pkg.name}
                      </Link>
                      <div className="mt-1 text-xs text-muted">v{VERSION}</div>
                    </td>
                    <td className="border-l border-border px-4.5 py-3.5 text-ink-soft">{t(pkg.what)}</td>
                    <td className="border-l border-border px-4.5 py-3">
                      <span className={`rounded-md px-[9px] py-[3px] text-[13px] font-medium ${PASTEL_CLASS[pkg.color]}`}>{t(pkg.tag)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="status" className="mx-auto max-w-[1180px] px-6 pb-25 pt-15">
          <div className="reveal flex flex-wrap items-center gap-10 rounded-[28px] bg-pastel-yellow p-[clamp(28px,5vw,64px)]">
            <div className="min-w-0 flex-[1_1_340px]">
              <span className="rounded-full bg-white px-3 py-[5px] text-[13px] font-semibold text-pastel-yellow-fg">{t({ en: 'Where it stands', es: 'Dónde está' })}</span>
              <p className="mt-4.5 font-display text-[clamp(80px,11vw,140px)] font-extrabold leading-[0.9] tracking-[-0.03em]">v{VERSION}</p>
              <p className="mt-2 text-lg text-[#5c4a1e]">
                {formatNumber(TESTS, locale)} {t({ en: 'tests of the engine passing', es: 'pruebas del motor pasando' })}
              </p>
              <div className="mt-5 h-3 overflow-hidden rounded-full bg-white" aria-hidden="true">
                <div className="h-full w-0 animate-grow rounded-full bg-brand" />
              </div>
              <p className="mt-2.5 font-hand text-2xl font-semibold text-pastel-yellow-fg">{t({ en: 'young, and growing fast', es: 'joven, y creciendo rápido' })}</p>
            </div>
            <div className="min-w-0 flex-[1_1_380px]">
              <p className="font-display text-[clamp(24px,2.6vw,32px)] font-bold leading-[1.3] tracking-[-0.03em]">
                {t({ en: 'Early, honest about it, and open.', es: 'Temprano, honesto sobre ello, y abierto.' })}
              </p>
              <p className="mt-4 text-[17px] leading-[1.6] text-[#5c4a1e]">
                {t({
                  en: 'The studio, the engine and the vector PDF work today and are tested. So do the React component, the headless hooks, collaboration and the MCP server. Not yet: an interface in English, npm. The status page says what is checked and what is missing. Open source under MIT.',
                  es: 'El estudio, el motor y el PDF vectorial funcionan hoy y tienen pruebas. También el componente de React, los hooks headless, la colaboración y el servidor MCP. Todavía no: una interfaz en inglés, npm. La página de estado dice qué está comprobado y qué falta. Código abierto con licencia MIT.',
                })}
              </p>
              <p className="mt-6.5 flex flex-wrap gap-2.5">
                <Link href="/docs/getting-started/" className={`rounded-xl px-5 py-[13px] ${primary}`}>
                  {t({ en: 'Get started', es: 'Empezar' })}
                </Link>
                <Link href="/docs/status/" className="rounded-xl bg-white px-5 py-[13px] font-semibold text-ink transition-colors hover:bg-hover">
                  {t({ en: 'What’s checked, what’s missing →', es: 'Qué está comprobado y qué falta →' })}
                </Link>
              </p>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
