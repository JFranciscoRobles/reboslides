import { googleFontsUrl } from '@reboslides/react';
import { createRoot } from 'react-dom/client';
import { App } from '../../realtime/src/App';
import '../../realtime/src/App.css';
import { Chat } from './Chat';
import './Chat.css';

const fonts = document.createElement('link');
fonts.rel = 'stylesheet';
fonts.href = googleFontsUrl();
document.head.append(fonts);

// The realtime demo, with the chat beside the deck that is open.
createRoot(document.getElementById('root')!).render(<App aside={(room, _name, locale) => <Chat key={room} room={room} locale={locale} />} />);
