/** Inline script to apply saved theme before paint (default: dark). */
export function ThemeScript() {
  const code = `
(function(){
  try {
    var t = localStorage.getItem('kf-theme');
    if (t !== 'dark' && t !== 'light') t = 'dark';
    document.documentElement.classList.add(t);
    document.documentElement.style.colorScheme = t;
  } catch (e) {
    document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = 'dark';
  }
})();`

  return <script dangerouslySetInnerHTML={{ __html: code }} />
}
