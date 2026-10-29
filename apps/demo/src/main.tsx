import { googleFontsUrl } from '@reboslides/react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './App.css';

// The families the themes are set in, once for the page.
const fonts = document.createElement('link');
fonts.rel = 'stylesheet';
fonts.href = googleFontsUrl();
document.head.append(fonts);

createRoot(document.getElementById('root')!).render(<App />);
