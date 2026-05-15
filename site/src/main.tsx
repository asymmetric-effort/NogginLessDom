import { createElement } from '@asymmetric-effort/specifyjs';
import { render } from '@asymmetric-effort/specifyjs/dom';
import { App } from './App.js';

render(createElement(App, null), document.getElementById('root')!);

// Re-render on hash change for SPA routing
window.addEventListener('hashchange', () => {
  render(createElement(App, null), document.getElementById('root')!);
});
