import { createElement } from '@asymmetric-effort/specifyjs';
import { Header } from './components/Header.js';
import { Footer } from './components/Footer.js';
import { Router } from './components/Router.js';

export function App(): ReturnType<typeof createElement> {
  return createElement(
    'div',
    { className: 'app' },
    createElement(Header, null),
    createElement(Router, null),
    createElement(Footer, null),
  );
}
