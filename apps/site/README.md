# Site

reboslides.com: the landing page, with the studio itself on it, the studio on a page of its own, and the developer documentation. Made as rebodocs.com is.

```bash
npm run site          # http://localhost:5198, from the root of the repository
npm run build:site    # static files in apps/site/out
```

It is a Next.js application exported as plain files (`output: 'export'`), so it can be put on any static host.

## Where things are

| Path | What it is |
| --- | --- |
| `app/(en)/`, `app/[lang]/` | The pages in English, at the root, and in Spanish, under `/es/`. |
| `components/pages/HomePage.tsx` | The landing page. Its pieces are in `components/home/`. |
| `components/LiveStudio.tsx` | The studio, on the landing page and on `/demo/`: the real one, not a picture. |
| `lib/home.ts` | What the landing page says: the version, the packages and the features. |
| `content/docs/*.md` | The documentation, one Markdown file per page; in Spanish in `content/docs/es/`. |
| `lib/site.ts` | The order of the pages in the menu, the address of the repository and of the site. |
| `lib/docs.ts` | Turns the Markdown into HTML, with its code coloured, when the site is built. |

## Adding a page

Write `content/docs/my-page.md` and `content/docs/es/my-page.md`, each starting with `# Its title`, and add it to `NAV` in `lib/site.ts`. A heading of the Spanish page written `## Título {#title}` keeps the id it has in English.
