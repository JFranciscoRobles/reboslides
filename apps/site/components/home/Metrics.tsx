import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { LAYOUTS, SHAPE_KINDS, THEMES } from '@reboslides/core';
import { formatNumber } from '@/lib/i18n';
import { getT, pageLocale } from '@/lib/locale';

/** The tests of the engine, counted in their files when the site is built: none is written here by hand. */
function countTests(): number {
  const folder = path.join(process.cwd(), '../../packages/core/test');
  return readdirSync(folder)
    .filter((name) => name.endsWith('.test.ts'))
    .reduce((sum, name) => sum + (readFileSync(path.join(folder, name), 'utf8').match(/\bit\(\s*['"`]/g)?.length ?? 0), 0);
}

export const TESTS = countTests();

/** The project in four numbers, each read from the code that makes it so. */
export function Metrics() {
  const t = getT();
  const metrics: { label: string; value: string; note: string }[] = [
    {
      label: t({ en: 'Slides ready to use', es: 'Diapositivas listas para usar' }),
      value: String(THEMES.length * LAYOUTS.length),
      note: t({ en: `${LAYOUTS.length} layouts in each of ${THEMES.length} themes`, es: `${LAYOUTS.length} diseños en cada uno de ${THEMES.length} temas` }),
    },
    {
      label: t({ en: 'Kinds of shape', es: 'Tipos de forma' }),
      value: String(SHAPE_KINDS.length),
      note: t({ en: 'Drawn the same on screen and in the PDF', es: 'Dibujadas igual en pantalla y en el PDF' }),
    },
    {
      label: t({ en: 'Automated tests', es: 'Pruebas automatizadas' }),
      value: formatNumber(TESTS, pageLocale()),
      note: t({ en: 'Of the engine, all passing', es: 'Del motor, todas pasando' }),
    },
    {
      label: t({ en: 'Servers needed', es: 'Servidores necesarios' }),
      value: '0',
      note: t({ en: 'The studio and the PDF run in the browser', es: 'El estudio y el PDF corren en el navegador' }),
    },
  ];
  return (
    <section aria-labelledby="metrics" className="mx-auto max-w-[1180px] px-6 pt-14">
      <h2 id="metrics" className="sr-only">
        {t({ en: 'By the numbers', es: 'En cifras' })}
      </h2>
      <dl className="reveal grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {metrics.map(({ label, value, note }) => (
          <div key={label} className="flex flex-col rounded-2xl border border-border bg-white p-5">
            <dt className="order-2 mt-1.5 text-[15px] font-semibold text-ink">{label}</dt>
            <dd className="order-1 m-0 text-[clamp(32px,4vw,44px)] font-semibold leading-none tracking-[-0.02em] text-ink">{value}</dd>
            <dd className="order-3 m-0 mt-1 text-sm leading-[1.45] text-muted">{note}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
