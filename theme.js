// FlowArrow theme switcher: applies saved (or OS-preferred) theme before first
// paint, and injects a light/dark toggle button into the header nav.
(function(){
  var t = null;
  try { t = localStorage.getItem('fa-theme'); } catch(e) {}
  if (t !== 'light' && t !== 'dark') {
    t = (window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark';
  }
  document.documentElement.dataset.theme = t;

  function update(){
    var b = document.getElementById('themeToggle');
    if (!b) return;
    var light = document.documentElement.dataset.theme === 'light';
    b.textContent = light ? '🌙' : '☀️';
    b.title = light ? 'ダークモードに切り替え' : 'ライトモードに切り替え';
    b.setAttribute('aria-label', b.title);
  }
  document.addEventListener('DOMContentLoaded', function(){
    var b = document.createElement('button');
    b.id = 'themeToggle'; b.type = 'button'; b.className = 'theme-toggle';
    b.onclick = function(){
      var next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem('fa-theme', next); } catch(e) {}
      update();
    };
    var nav = document.querySelector('.gnav') || document.querySelector('header nav');
    if (nav) { nav.appendChild(b); }
    else { b.classList.add('theme-toggle-fixed'); document.body.appendChild(b); }
    update();
  });
})();
