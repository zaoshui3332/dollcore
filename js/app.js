// ===== Theme =====
function getTheme() { return localStorage.getItem('dollcore-theme') || 'dark'; }
function setTheme(t) {
  localStorage.setItem('dollcore-theme', t);
  document.documentElement.setAttribute('data-theme', t);
  document.querySelectorAll('.dark-opt').forEach(function(el) { el.classList.toggle('active', t === 'dark'); });
  document.querySelectorAll('.light-opt').forEach(function(el) { el.classList.toggle('active', t === 'light'); });
}
setTheme(getTheme());
document.querySelectorAll('.theme-toggle').forEach(function(btn) {
  btn.addEventListener('click', function() { setTheme(getTheme() === 'dark' ? 'light' : 'dark'); });
});

// ===== Particles =====
(function () {
  var canvas = document.getElementById('particles');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var particles = [];
  var count = 45;
  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize);
  for (var i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.8 + 0.5, alpha: Math.random() * 0.25 + 0.05,
      pulse: Math.random() * Math.PI * 2
    });
  }
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var isDark = getTheme() === 'dark';
    var c = isDark ? '192,132,252' : '100,116,139';
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.x += p.vx; p.y += p.vy; p.pulse += 0.015;
      var alpha = p.alpha + Math.sin(p.pulse) * 0.1;
      if (p.x < -10) p.x = canvas.width + 10;
      if (p.x > canvas.width + 10) p.x = -10;
      if (p.y < -10) p.y = canvas.height + 10;
      if (p.y > canvas.height + 10) p.y = -10;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + c + ',' + Math.max(0.04, alpha) + ')';
      ctx.fill();
      for (var j = i + 1; j < particles.length; j++) {
        var p2 = particles[j];
        var dist = Math.hypot(p.x - p2.x, p.y - p2.y);
        if (dist < 100) {
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = 'rgba(' + c + ',' + (0.04 * (1 - dist / 100)) + ')';
          ctx.lineWidth = 0.5; ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
})();

// ===== Data =====
var softwareData = [];
var downloadCounts = {};

function loadCounts() {
  try { downloadCounts = JSON.parse(localStorage.getItem('dollcore-counts')) || {}; }
  catch(e) { downloadCounts = {}; }
}
function saveCount(id) {
  downloadCounts[id] = (downloadCounts[id] || 0) + 1;
  localStorage.setItem('dollcore-counts', JSON.stringify(downloadCounts));
}
loadCounts();

// ===== Navigation =====
function navigate(page, id) {
  document.querySelectorAll('.page').forEach(function(p) { p.style.display = 'none'; });
  document.querySelectorAll('.navbar .links a').forEach(function(a) { a.classList.remove('active'); });

  if (page === 'home') {
    document.getElementById('page-home').style.display = '';
    document.querySelector('[data-nav="home"]').classList.add('active');
    renderHome();
  } else if (page === 'detail') {
    document.getElementById('page-detail').style.display = '';
    renderDetail(id);
  }
}

document.querySelectorAll('[data-nav]').forEach(function(el) {
  el.addEventListener('click', function(e) {
    e.preventDefault();
    navigate(this.dataset.nav);
  });
});

// ===== Init =====
function initApp() {
  fetch('software.json')
    .then(function(r) { return r.json(); })
    .then(function(data) { softwareData = data; navigate('home'); })
    .catch(function() { softwareData = []; navigate('home'); });
}

// ===== Gate =====
(function () {
  var ANSWER = 'ppnn13%dkst-Feb.1st';
  if (sessionStorage.getItem('dollcore-auth') === '1') {
    document.getElementById('page-gate').style.display = 'none';
    document.getElementById('app').style.display = '';
    initApp();
    return;
  }

  document.getElementById('page-gate').style.display = '';
  var card = document.getElementById('gate-card');
  var input = document.getElementById('gate-input');
  var errorEl = document.getElementById('gate-error');
  document.getElementById('gate-form').addEventListener('submit', function(e) {
    e.preventDefault();
    if (input.value.trim() === ANSWER) {
      card.classList.add('fade-out');
      setTimeout(function() {
        sessionStorage.setItem('dollcore-auth', '1');
        document.getElementById('page-gate').style.display = 'none';
        document.getElementById('app').style.display = '';
        initApp();
      }, 600);
    } else {
      errorEl.style.display = '';
      card.classList.add('shake');
      input.value = '';
      setTimeout(function() { card.classList.remove('shake'); errorEl.style.display = 'none'; }, 600);
    }
  });
})();

// ===== Home =====
document.getElementById('search-form').addEventListener('submit', function(e) { e.preventDefault(); renderHome(); });
document.getElementById('category-filter').addEventListener('change', function() { renderHome(); });

function renderHome() {
  var search = (document.getElementById('search-input').value || '').toLowerCase();
  var cat = document.getElementById('category-filter').value;
  var data = softwareData;
  if (search) data = data.filter(function(d) {
    return d.name.toLowerCase().includes(search) || (d.description || '').toLowerCase().includes(search);
  });
  if (cat) data = data.filter(function(d) { return d.category === cat; });

  var grid = document.getElementById('software-grid');
  var empty = document.getElementById('home-empty');
  if (data.length === 0) {
    grid.innerHTML = '';
    empty.style.display = '';
  } else {
    empty.style.display = 'none';
    grid.innerHTML = data.map(function(d) {
      var count = downloadCounts[d.id] || 0;
      return '<a href="#" class="card" data-detail="' + d.id + '">' +
        '<h3>' + esc(d.name) + '</h3>' +
        '<div class="ver">v' + esc(d.version || '1.0.0') + '</div>' +
        '<div class="desc">' + esc(d.description || '暂无描述') + '</div>' +
        '<div class="meta"><span class="cat">' + esc(d.category || '其他') + '</span><span>' + count + ' 次下载</span></div>' +
      '</a>';
    }).join('');
    grid.querySelectorAll('.card').forEach(function(card) {
      card.addEventListener('click', function(e) {
        e.preventDefault();
        navigate('detail', parseInt(this.dataset.detail));
      });
    });
  }

  var cats = [];
  softwareData.forEach(function(d) { if (d.category && cats.indexOf(d.category) === -1) cats.push(d.category); });
  var sel = document.getElementById('category-filter');
  sel.innerHTML = '<option value="">全部分类</option>' + cats.map(function(c) {
    return '<option value="' + esc(c) + '"' + (c === cat ? ' selected' : '') + '>' + esc(c) + '</option>';
  }).join('');
}

// ===== Detail =====
function renderDetail(id) {
  var item = softwareData.find(function(d) { return d.id === id; });
  if (!item) return navigate('home');

  document.getElementById('detail-name').textContent = item.name;
  document.getElementById('detail-info').innerHTML =
    '<span>版本 ' + esc(item.version || '1.0.0') + '</span>' +
    '<span>' + esc(item.category || '其他') + '</span>' +
    '<span>' + (downloadCounts[item.id] || 0) + ' 次下载</span>';
  document.getElementById('detail-desc').textContent = item.description || '暂无描述';

  document.getElementById('detail-download').onclick = function() {
    saveCount(item.id);
    renderDetail(id);
    if (item.file_path) {
      if (item.file_path.startsWith('http')) window.open(item.file_path, '_blank');
    } else {
      alert('未配置下载路径。');
    }
  };
}

// ===== Utility =====
function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
