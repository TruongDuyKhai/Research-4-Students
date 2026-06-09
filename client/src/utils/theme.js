export function initTheme() {
  const saved = localStorage.getItem('theme');
  document.documentElement.setAttribute('data-theme', saved === 'light' ? 'light' : 'dark');
}
export function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  return next;
}
