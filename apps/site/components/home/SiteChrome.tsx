'use client';

import { LanguageSwitcher, LocalLink as Link, useT } from '@/components/i18n';
import { VERSION } from '@/lib/home';
import { REPO } from '@/lib/site';
import { primary } from './buttons';

const ghost = 'rounded-lg px-3 py-2 text-ink transition-colors hover:bg-hover';

/** Rebodocs' tile with a slide on its stand in place of a page. */
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect x="2" y="2" width="28" height="28" rx="8" fill="#F0EBF8" />
      <rect x="8" y="8.5" width="16" height="11.5" rx="1.5" fill="#FFFFFF" stroke="#6741D9" strokeWidth="1.8" />
      <path d="M11.5 12.8h6M11.5 15.8h3.5M16 20v3.5M12.5 23.5h7" stroke="#6741D9" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/** The header of the landing page. Its links go down to a second line on a narrow screen. */
export function SiteHeader() {
  const t = useT();
  return (
    <header className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-x-6 gap-y-3 px-6 py-4.5">
      <Link href="/" className="flex items-center gap-2.5 text-ink">
        <Logo />
        <span className="font-display text-xl font-extrabold tracking-[-0.03em]">ReboSlides</span>
      </Link>
      <span className="rounded-full bg-pastel-green px-2.5 py-1 text-xs font-medium text-pastel-green-fg">
        {t({ en: 'Open source', es: 'Código abierto' })} · MIT · v{VERSION}
      </span>
      <nav aria-label={t({ en: 'Main', es: 'Principal' })} className="ml-auto flex flex-wrap items-center gap-0.5 text-[15px] font-medium">
        <Link href="/demo/" className={ghost}>
          {t({ en: 'Studio', es: 'Estudio' })}
        </Link>
        <Link href="/docs/" className={ghost}>
          {t({ en: 'Docs', es: 'Documentación' })}
        </Link>
        <Link href="/docs/status/" className={ghost}>
          {t({ en: 'Status', es: 'Estado' })}
        </Link>
        <a href={REPO} className={ghost}>
          GitHub
        </a>
        <LanguageSwitcher />
        <Link href="/docs/getting-started/" className={`ml-2 rounded-[10px] px-4 py-2.5 ${primary}`}>
          {t({ en: 'Get started', es: 'Empezar' })}
        </Link>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  const t = useT();
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-x-6 gap-y-3 px-6 pb-10 pt-8 text-sm text-muted">
        <span className="font-display text-base font-extrabold tracking-[-0.03em] text-ink">ReboSlides</span>
        <Link href="/demo/" className="hover:text-ink">
          {t({ en: 'Studio', es: 'Estudio' })}
        </Link>
        <Link href="/docs/" className="hover:text-ink">
          {t({ en: 'Docs', es: 'Documentación' })}
        </Link>
        <Link href="/docs/status/" className="hover:text-ink">
          {t({ en: 'Status & roadmap', es: 'Estado y hoja de ruta' })}
        </Link>
        <a href={REPO} className="hover:text-ink">
          GitHub
        </a>
        <span className="sm:ml-auto">
          {t({ en: 'A sibling of', es: 'Hermano de' })}{' '}
          <a href="https://rebodocs.com" className="font-medium text-ink underline decoration-border-strong underline-offset-4 hover:decoration-current">
            Rebodocs
          </a>
          . {t({ en: 'Open source under the MIT license.', es: 'Código abierto con licencia MIT.' })}
        </span>
      </div>
    </footer>
  );
}
