// ===== Theme =====
function getTheme() { return localStorage.getItem('zhenghezhan-theme') || 'light'; }
function setTheme(t) {
  localStorage.setItem('zhenghezhan-theme', t);
  document.documentElement.setAttribute('data-theme', t);
  document.querySelectorAll('.dark-opt').forEach(function(el) { el.classList.toggle('active', t === 'dark'); });
  document.querySelectorAll('.light-opt').forEach(function(el) { el.classList.toggle('active', t === 'light'); });
}
setTheme(getTheme());
document.querySelectorAll('.theme-toggle').forEach(function(btn) {
  btn.addEventListener('click', function() { setTheme(getTheme() === 'dark' ? 'light' : 'dark'); });
});

// ===== Data =====
var softwareData = [];
var websitesData = [];
var visitCounts = {};
var currentSection = 'software';

function loadCounts() {
  try { visitCounts = JSON.parse(localStorage.getItem('zhenghezhan-counts')) || {}; }
  catch(e) { visitCounts = {}; }
}
function saveCount(id) {
  visitCounts[id] = (visitCounts[id] || 0) + 1;
  localStorage.setItem('zhenghezhan-counts', JSON.stringify(visitCounts));
}
loadCounts();

// ===== Sidebar =====
document.querySelectorAll('.sidebar-item').forEach(function(item) {
  item.addEventListener('click', function(e) {
    e.preventDefault();
    currentSection = this.dataset.section;
    document.querySelectorAll('.sidebar-item').forEach(function(s) { s.classList.remove('active'); });
    this.classList.add('active');
    var heroTitle = document.getElementById('hero-title');
    var heroDesc = document.getElementById('hero-desc');
    if (currentSection === 'software') {
      heroTitle.textContent = '软件中心';
      heroDesc.textContent = '发现和下载软件。';
    } else {
      heroTitle.textContent = '网站导航';
      heroDesc.textContent = '收录实用和正版网站。';
    }
    renderHome();
  });
});

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
  var p1 = fetch('software.json').then(function(r) { return r.json(); }).catch(function() { return []; });
  var p2 = fetch('websites.json').then(function(r) { return r.json(); }).catch(function() { return []; });
  Promise.all([p1, p2]).then(function(results) {
    softwareData = results[0];
    websitesData = results[1];
    navigate('home');
  });
}

initApp();

// ===== Home =====
document.getElementById('search-form').addEventListener('submit', function(e) { e.preventDefault(); renderHome(); });
document.getElementById('category-filter').addEventListener('change', function() { renderHome(); });

function getCurrentData() {
  return currentSection === 'software' ? softwareData : websitesData;
}

function renderHome() {
  var search = (document.getElementById('search-input').value || '').toLowerCase();
  var cat = document.getElementById('category-filter').value;
  var data = getCurrentData();
  if (search) data = data.filter(function(d) {
    return d.name.toLowerCase().includes(search) || (d.description || '').toLowerCase().includes(search);
  });
  if (cat) data = data.filter(function(d) { return d.category === cat; });

  var grid = document.getElementById('card-grid');
  var empty = document.getElementById('home-empty');
  if (data.length === 0) {
    grid.innerHTML = '';
    empty.style.display = '';
  } else {
    empty.style.display = 'none';
    if (currentSection === 'software') {
      grid.innerHTML = data.map(function(d) {
        var count = visitCounts[d.id] || 0;
        return '<a href="#" class="card" data-detail="' + d.id + '">' +
          '<h3>' + esc(d.name) + '</h3>' +
          '<div class="ver">v' + esc(d.version || '1.0.0') + '</div>' +
          '<div class="desc">' + esc(d.description || '暂无描述') + '</div>' +
          '<div class="meta"><span class="cat">' + esc(d.category || '其他') + '</span><span>' + count + ' 次下载</span></div>' +
        '</a>';
      }).join('');
    } else {
      grid.innerHTML = data.map(function(d) {
        return '<a href="#" class="card" data-detail="' + d.id + '">' +
          '<h3>' + esc(d.name) + '</h3>' +
          '<div class="ver site-url">' + esc(d.url || '') + '</div>' +
          '<div class="desc">' + esc(d.description || '暂无描述') + '</div>' +
          '<div class="meta"><span class="cat">' + esc(d.category || '其他') + '</span></div>' +
        '</a>';
      }).join('');
    }
    grid.querySelectorAll('.card').forEach(function(card) {
      card.addEventListener('click', function(e) {
        e.preventDefault();
        navigate('detail', parseInt(this.dataset.detail));
      });
    });
  }

  var cats = [];
  data = getCurrentData();
  data.forEach(function(d) { if (d.category && cats.indexOf(d.category) === -1) cats.push(d.category); });
  var sel = document.getElementById('category-filter');
  sel.innerHTML = '<option value="">全部分类</option>' + cats.map(function(c) {
    return '<option value="' + esc(c) + '"' + (c === cat ? ' selected' : '') + '>' + esc(c) + '</option>';
  }).join('');
}

// ===== Detail =====
function renderDetail(id) {
  var item;
  if (currentSection === 'software') {
    item = softwareData.find(function(d) { return d.id === id; });
  } else {
    item = websitesData.find(function(d) { return d.id === id; });
  }
  if (!item) return navigate('home');

  document.getElementById('detail-name').textContent = item.name;
  var actionBtn = document.getElementById('detail-action');

  if (currentSection === 'software') {
    document.getElementById('detail-info').innerHTML =
      '<span>版本 ' + esc(item.version || '1.0.0') + '</span>' +
      '<span>' + esc(item.category || '其他') + '</span>' +
      '<span>' + (visitCounts[item.id] || 0) + ' 次下载</span>';
    document.getElementById('detail-desc').textContent = item.description || '暂无描述';
    actionBtn.textContent = '下载';
    actionBtn.onclick = function() {
      saveCount(item.id);
      renderDetail(id);
      if (item.file_path) {
        if (item.file_path.startsWith('http')) window.open(item.file_path, '_blank');
      } else {
        alert('未配置下载路径。');
      }
    };
  } else {
    document.getElementById('detail-info').innerHTML =
      '<span>' + esc(item.category || '其他') + '</span>' +
      '<span style="word-break:break-all">' + esc(item.url || '') + '</span>';
    document.getElementById('detail-desc').textContent = item.description || '暂无描述';
    actionBtn.textContent = '访问网站';
    actionBtn.onclick = function() {
      if (item.url) {
        window.open(item.url, '_blank');
      } else {
        alert('未配置网址。');
      }
    };
  }
}

// ===== Utility =====
function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
