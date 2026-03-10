import './styles/main.css';
import { renderLearningView } from './pages/learning.js';
import { renderProfile } from './pages/profile.js';
import { renderAdmin } from './pages/admin.js';

/**
 * Hash-based router for the Application.
 */
const routes = {
  '': renderLearningView,
  '#practice': renderLearningView,
  '#profile': renderProfile,
  '#admin': renderAdmin,
};

async function navigate() {
  const app = document.getElementById('app');
  const hash = (window.location.hash || '').split('?')[0];
  const renderer = routes[hash] || renderLearningView;

  app.innerHTML = '';
  app.classList.add('page-enter');
  
  const params = new URLSearchParams(window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '');
  
  await renderer(app, params);

  setTimeout(() => app.classList.remove('page-enter'), 600);
}

// Listen for hash changes
window.addEventListener('hashchange', navigate);

// Initial render
document.addEventListener('DOMContentLoaded', navigate);
