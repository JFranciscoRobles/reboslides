'use client';

import { useEffect, useState } from 'react';
import { useT } from '@/components/i18n';
import { REPO } from '@/lib/site';

/** The command that gets the studio running, a button that copies it, and what it does. */
export function StartCommand() {
  const [copied, setCopied] = useState(false);
  const t = useT();
  const command = `git clone ${REPO} && cd reboslides && npm install && npm run dev`;
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = () => {
    navigator.clipboard?.writeText(command).then(
      () => setCopied(true),
      () => {},
    );
  };

  return (
    <div className="mx-auto mt-7 max-w-[620px] rounded-2xl border border-border bg-surface p-2 text-left">
      <button
        type="button"
        onClick={copy}
        className="flex w-full cursor-pointer items-center gap-3 rounded-[10px] border border-border bg-white py-3 pl-4 pr-3 text-left font-code text-sm text-ink transition duration-250 hover:-translate-y-1 hover:shadow-lift"
      >
        <span className="text-faint" aria-hidden="true">
          $
        </span>
        <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{command}</span>
        <span
          aria-live="polite"
          className={`flex-none rounded-md border border-border px-[9px] py-[3px] font-text text-xs font-semibold ${copied ? 'bg-pastel-green text-pastel-green-fg' : 'bg-white text-ink'}`}
        >
          {copied ? t({ en: 'Copied', es: 'Copiado' }) : t({ en: 'Copy', es: 'Copiar' })}
        </span>
      </button>
      <p className="m-0 px-2 pb-1 pt-2.5 text-sm leading-normal text-muted">
        {t({
          en: 'The studio on localhost:5173, from the repository: the packages are not on npm yet.',
          es: 'El estudio en localhost:5173, desde el repositorio: los paquetes aún no están en npm.',
        })}
      </p>
    </div>
  );
}
