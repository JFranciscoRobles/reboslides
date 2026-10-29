import type { Metadata } from 'next';
import { DemoApp } from '@/components/DemoApp';
import { type Locale, translator } from '@/lib/i18n';
import { setPageLocale } from '@/lib/locale';
import { pageMetadata } from '@/lib/seo';

export function demoMetadata(locale: Locale): Metadata {
  const t = translator(locale);
  return pageMetadata({
    locale,
    path: '/demo/',
    title: t({ en: 'The studio', es: 'El estudio' }),
    description: t({
      en: 'ReboSlides on the whole window: make a deck, present it and download its PDF. It is kept in your browser for your next visit.',
      es: 'ReboSlides en toda la ventana: haz una presentación, preséntala y descarga su PDF. Se guarda en tu navegador para tu próxima visita.',
    }),
  });
}

/** The studio on the whole window, under the bar of the demo: no header, no footer. */
export function DemoPage({ locale }: { locale: Locale }) {
  setPageLocale(locale);
  return (
    <main>
      <DemoApp />
    </main>
  );
}
