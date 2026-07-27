/** Inline script to apply saved theme before paint (default: light). */
export function ThemeScript() {
  const code = `
(function(){
  try {
    var t = localStorage.getItem('kf-theme');
    if (t !== 'dark' && t !== 'light') t = 'light';
    document.documentElement.classList.add(t);
    document.documentElement.style.colorScheme = t;
  } catch (e) {
    document.documentElement.classList.add('light');
    document.documentElement.style.colorScheme = 'light';
  }
})();`

  return <script dangerouslySetInnerHTML={{ __html: code }} />
}
