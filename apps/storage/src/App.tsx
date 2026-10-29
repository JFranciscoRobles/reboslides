// Decks kept in a bucket. The list asks the backend; each file is read from,
// and written to, the bucket itself, through an address the backend signs.
// Saving keeps a version beside the file, to restore from the side.

import { type Deck, SlideStudio, type Studio, parseDeck, serializeDeck } from '@reboslides/react';
import { slidePicture } from '@reboslides/viewer';
import { useCallback, useEffect, useRef, useState } from 'react';
import { LocalePicker, say, useLocale } from '../../demo/src/locale';

interface FileRow {
  key: string;
  size: number;
  modified: string;
}
interface Version {
  key: string;
  when: string;
  label: string;
}

const ask = async <T,>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(path, init);
  const answer = await response.json();
  if (!response.ok) throw new Error(answer.error ?? response.statusText);
  return answer as T;
};
async function readDeck(key: string): Promise<Deck> {
  const { url } = await ask<{ url: string }>(`/api/url?key=${encodeURIComponent(key)}`);
  return parseDeck(await (await fetch(url)).text());
}
async function writeTo(target: { url: string; type: string }, deck: Deck): Promise<void> {
  const response = await fetch(target.url, { method: 'PUT', headers: { 'content-type': target.type }, body: serializeDeck(deck) });
  if (!response.ok) throw new Error(`Bucket: ${response.status}`);
}

function Thumb({ fileKey, stamp }: { fileKey: string; stamp: string }) {
  const [picture, setPicture] = useState<string>();
  useEffect(() => {
    let gone = false;
    readDeck(fileKey)
      .then((deck) => slidePicture(deck, 0, 280))
      .then(
        (url) => !gone && setPicture(url),
        () => {},
      );
    return () => {
      gone = true;
    };
  }, [fileKey, stamp]);
  return <span className="thumb">{picture && <img src={picture} alt="" />}</span>;
}

export function App() {
  const [files, setFiles] = useState<FileRow[]>([]);
  const [open, setOpen] = useState<{ key: string; deck: Deck; stamp: number }>();
  const [versions, setVersions] = useState<Version[]>([]);
  const [note, setNote] = useState('');
  const studio = useRef<Studio | undefined>(undefined);
  const [locale, setLocale] = useLocale();
  const t = (es: string, en: string) => say(locale, es, en);
  const when = (iso: string) => new Date(iso).toLocaleString(locale);

  const refresh = useCallback(() => void ask<FileRow[]>('/api/files').then(setFiles, (e: Error) => setNote(e.message)), []);
  useEffect(refresh, [refresh]);
  const loadVersions = (key: string) => void ask<Version[]>(`/api/versions?key=${encodeURIComponent(key)}`).then(setVersions, () => setVersions([]));

  const openFile = async (key: string) => {
    setNote('');
    setOpen({ key, deck: await readDeck(key), stamp: Date.now() });
    loadVersions(key);
  };
  const create = async () => {
    const name = prompt(t('Nombre de la presentación nueva', 'Name of the new presentation'), t('Presentación nueva', 'New presentation'));
    if (!name) return;
    const { key } = await ask<{ key: string }>('/api/files', { method: 'POST', body: JSON.stringify({ name }) });
    refresh();
    await openFile(key);
  };
  const save = async () => {
    if (!open || !studio.current) return;
    const deck = studio.current.deck;
    try {
      await writeTo(await ask(`/api/url?key=${encodeURIComponent(open.key)}`, { method: 'POST' }), deck);
      // And a version of it, beside it, to come back to.
      await writeTo(
        await ask(`/api/versions?key=${encodeURIComponent(open.key)}&label=${encodeURIComponent(prompt(t('Nombre de esta versión (opcional)', 'Name of this version (optional)')) ?? '')}`, {
          method: 'POST',
        }),
        deck,
      );
      setNote(`${t('Guardado', 'Saved')} ${new Date().toLocaleTimeString(locale)}`);
      refresh();
      loadVersions(open.key);
    } catch (error) {
      setNote((error as Error).message);
    }
  };
  const restore = async (version: Version) => {
    if (!open) return;
    setOpen({ key: open.key, deck: await readDeck(version.key), stamp: Date.now() });
    setNote(t(`Versión del ${when(version.when)} abierta: guarda para quedártela.`, `Version of ${when(version.when)} opened: save to keep it.`));
  };

  if (open)
    return (
      <div className="app">
        <header className="bar">
          <button type="button" className="back" onClick={() => (setOpen(undefined), refresh())}>
            {t('← Archivos', '← Files')}
          </button>
          <b>{open.key}</b>
          <span className="note">{note}</span>
          <LocalePicker locale={locale} onChange={setLocale} />
          <button type="button" className="primary" onClick={() => void save()}>
            {t('Guardar', 'Save')}
          </button>
        </header>
        <div className="work">
          <main className="stage">
            <SlideStudio key={`${open.key}:${open.stamp}`} ref={studio} deck={open.deck} theme="light" locale={locale} onLocale={setLocale} />
          </main>
          <aside className="versions">
            <h2>{t('Versiones', 'Versions')}</h2>
            {!versions.length && <p>{t('Cada vez que guardas, se guarda una versión aquí.', 'Each time you save, a version is kept here.')}</p>}
            {versions.map((version) => (
              <button key={version.key} type="button" onClick={() => void restore(version)}>
                <b>{version.label || t('Sin nombre', 'Unnamed')}</b>
                <small>{when(version.when)}</small>
              </button>
            ))}
          </aside>
        </div>
      </div>
    );

  return (
    <div className="app">
      <header className="bar">
        <img src="/logo.svg" alt="" width={24} height={24} />
        <b>ReboSlides</b>
        <span className="badge">{t('Archivos', 'Files')}</span>
        <span className="note">{note}</span>
        <LocalePicker locale={locale} onChange={setLocale} />
        <button type="button" className="primary" onClick={() => void create()}>
          {t('+ Nueva', '+ New')}
        </button>
      </header>
      <main className="shelf">
        {files.map((file) => (
          <button key={file.key} type="button" className="card" onClick={() => void openFile(file.key)}>
            <Thumb fileKey={file.key} stamp={file.modified} />
            <b>{file.key.replace(/\.reboslides$/, '')}</b>
            <small>
              {when(file.modified)} · {Math.round(file.size / 1024)} KB
            </small>
          </button>
        ))}
      </main>
    </div>
  );
}
