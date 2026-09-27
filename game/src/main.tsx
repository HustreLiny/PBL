import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import 'lxgw-wenkai-screen-webfont/lxgwwenkaigbscreen.css';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
