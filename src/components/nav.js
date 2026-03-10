import { isAdmin } from '../lib/supabase.js';

/**
 * Shared bottom navigation bar for the application.
 * Provides consistent navigation across Practice, Profile, and Admin.
 *
 * @param {string} activeTab - The currently active tab: 'practice' | 'profile' | 'admin'
 * @returns {string} HTML string for the nav bar
 */
export async function createNavBar(activeTab) {
  const isUserAdmin = await isAdmin();

  const tabs = [
    { id: 'practice', icon: 'edit', label: 'Practice', href: '#practice', filled: true },
    { id: 'profile', icon: 'person', label: 'Profile', href: '#profile', filled: true },
  ];

  if (isUserAdmin) {
    tabs.push({ id: 'admin', icon: 'manage_accounts', label: 'Admin', href: '#admin', filled: true });
  }

  const tabsHtml = tabs.map(tab => {
    const isActive = tab.id === activeTab;
    const colorClass = isActive ? 'text-primary' : 'text-ink-light hover:text-ink';
    const fontWeight = isActive ? 'font-bold' : 'font-medium';
    const fillStyle = isActive && tab.filled
      ? `style="font-variation-settings: 'FILL' 1"`
      : '';

    return `
      <a class="flex flex-1 flex-col items-center justify-center gap-1.5 ${colorClass} transition-colors relative group" href="${tab.href}" aria-label="${tab.label}">
        ${isActive ? '<div class="absolute -top-[1.125rem] w-12 h-[3px] bg-primary rounded-b-full"></div>' : ''}
        <div class="flex h-8 w-12 items-center justify-center rounded-full group-hover:bg-primary/5 transition-colors ${isActive ? 'bg-primary/10' : ''}">
          <span class="material-symbols-outlined text-[20px]" ${fillStyle}>${tab.icon}</span>
        </div>
        <p class="text-[10px] uppercase tracking-widest ${fontWeight}">${tab.label}</p>
      </a>
    `;
  }).join('');

  return `
    <nav class="flex gap-2 border-t border-paper-border/60 bg-surface/90 backdrop-blur-md px-4 pb-6 pt-4" role="navigation" aria-label="Main navigation">
      ${tabsHtml}
    </nav>
  `;
}
