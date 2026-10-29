import type { Metadata, Viewport } from 'next';
import { Caveat, Inter, JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import type { ReactNode } from 'react';
import { LocaleProvider } from '@/components/i18n';
import { LANGUAGES, type Locale, translator } from '@/lib/i18n';
import { SITE } from '@/lib/site';
import '../../app/globals.css';

// The fonts of the landing page, as CSS variables: `globals.css` turns them into
// `font-display`, `font-text`, `font-code` and `font-hand`.
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['700', '800'], variable: '--font-jakarta' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-jetbrains' });
const caveat = Caveat({ subsets: ['latin'], weight: '600', variable: '--font-caveat' });

/** What every page of a language has: its title template, its description, and where the site is. */
export function rootMetadata(locale: Locale): Metadata {
  const t = translator(locale);
  return {
    metadataBase: new URL(SITE),
    title: {
      default: t({ en: 'ReboSlides: the slide studio you build into your app', es: 'ReboSlides: el estudio de diapositivas que integras en tu aplicación' }),
      template: '%s · ReboSlides',
    },
    description: t({
      en: 'A design studio for presentations in the browser: slides of text, shapes and pictures placed freely, themes, presenting and vector PDF. Its text is set by the rebodocs engine. Open source.',
      es: 'Un estudio de diseño de presentaciones en el navegador: diapositivas con texto, formas e imágenes colocadas libremente, temas, presentación y PDF vectorial. Su texto lo maqueta el motor de rebodocs. De código abierto.',
    }),
    applicationName: 'ReboSlides',
    keywords: t({
      en: ['presentation editor', 'slides', 'slide editor', 'design studio', 'canvas editor', 'pdf export', 'open source'],
      es: ['editor de presentaciones', 'diapositivas', 'editor de diapositivas', 'estudio de diseño', 'editor canvas', 'exportar pdf', 'código abierto'],
    }),
    icons: { icon: '/logo.svg' },
    openGraph: { type: 'website', siteName: 'ReboSlides', url: SITE, locale: LANGUAGES[locale].og },
    formatDetection: { telephone: false },
  };
}
export const viewport: Viewport = { themeColor: '#6741d9' };

/**
 * What every page has: the document in its language. The header and the
 * footer of the site are in the frame of the documentation and in the landing
 * page itself: a demo takes the whole window, and has neither.
 */
export function RootDocument({ locale, children }: { locale: Locale; children: ReactNode }) {
  return (
    <html lang={LANGUAGES[locale].tag} className={`${jakarta.variable} ${inter.variable} ${jetbrains.variable} ${caveat.variable}`}>
      <body className="font-sans antialiased">
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
