// ===== Theme =====
function getTheme() { return localStorage.getItem('dollcore-theme') || 'dark'; }
function setTheme(t) {
  localStorage.setItem('dollcore-theme', t);
  document.documentElement.setAttribute('data-theme', t);
  document.querySelectorAll('.dark-opt').forEach(el => el.classList.toggle('active', t === 'dark'));
  document.querySelectorAll('.light-opt').forEach(el => el.classList.toggle('active', t === 'light'));
}
setTheme(getTheme());
document.querySelectorAll('.theme-toggle').forEach(btn => {
  btn.addEventListener('click', () => setTheme(getTheme() === 'dark' ? 'light' : 'dark'));
});

// ===== Particles =====
(function () {
  var canvas = document.getElementById('particles');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var particles = [];
  var count = 45;
  var anim;
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
    particles.forEach(function(p, i) {
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
      particles.forEach(function(p2, j) {
        if (j <= i) return;
        var dist = Math.hypot(p.x - p2.x, p.y - p2.y);
        if (dist < 100) {
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = 'rgba(' + c + ',' + (0.04 * (1 - dist / 100)) + ')';
          ctx.lineWidth = 0.5; ctx.stroke();
        }
      });
    });
    anim = requestAnimationFrame(draw);
  }
  draw();
})();

// ===== Data Store =====
// Base data: loaded from software.json at startup
// User modifications: stored in localStorage under 'dollcore-mods'
//  - mods = { "1": null (deleted), "5": { id:5, name:"...", ... } (added/updated) }
var baseData = [];
var initialized = false;

function loadMods() {
  try { return JSON.parse(localStorage.getItem('dollcore-mods')) || {}; }
  catch(e) { return {}; }
}
function saveMods(mods) { localStorage.setItem('dollcore-mods', JSON.stringify(mods)); }

function getMergedData() {
  var mods = loadMods();
  var merged = [];
  var seen = {};
  // Start with base data, apply mods
  baseData.forEach(function(d) {
    if (mods[d.id] === null) return; // deleted
    if (mods[d.id]) {
      merged.push(mods[d.id]);
      seen[d.id] = true;
    } else {
      merged.push(d);
      seen[d.id] = true;
    }
  });
  // Add new items from mods (not in base)
  Object.keys(mods).forEach(function(k) {
    if (mods[k] !== null && !seen[parseInt(k)]) {
      merged.push(mods[k]);
    }
  });
  // Sort by id
  merged.sort(function(a, b) { return a.id - b.id; });
  return merged;
}

function nextId() {
  var data = getMergedData();
  return data.length ? Math.max.apply(null, data.map(function(d) { return d.id; })) + 1 : 1;
}

function addOrUpdate(item) {
  var mods = loadMods();
  mods[item.id] = item;
  saveMods(mods);
}

function removeItem(id) {
  var mods = loadMods();
  var inBase = baseData.some(function(d) { return d.id === id; });
  if (inBase) {
    mods[id] = null; // mark as deleted
  } else {
    delete mods[id]; // remove completely if not in base
  }
  saveMods(mods);
}

function exportData() {
  var data = getMergedData();
  // Clean download_count to 0 for export (keep names/descriptions/categories)
  var json = JSON.stringify(data, null, 2);
  var blob = new Blob([json], { type: 'application/json' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'software.json';
  a.click();
  alert('software.json 已下载。\n\n更新步骤：\n1. 将下载的文件替换项目中的 software.json\n2. 提交到 GitHub 仓库\n3. 重新部署即可生效');
}

// ===== Navigation =====
var currentPage = 'home';
var currentDetailId = null;
var editingId = null;

function navigate(page, id) {
  currentPage = page;
  currentDetailId = id || null;
  document.querySelectorAll('.navbar .links a').forEach(function(a) { a.classList.remove('active'); });
  document.querySelectorAll('.page').forEach(function(p) { p.style.display = 'none'; });

  if (page === 'home') {
    document.getElementById('page-home').style.display = '';
    document.querySelector('[data-nav="home"]').classList.add('active');
    renderHome();
  } else if (page === 'detail') {
    document.getElementById('page-detail').style.display = '';
    renderDetail(id);
  } else if (page === 'admin') {
    document.getElementById('page-admin').style.display = '';
    document.querySelector('[data-nav="admin"]').classList.add('active');
    renderAdmin();
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
  // Fetch base data from software.json, then start
  fetch('software.json')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      baseData = data;
      initialized = true;
      navigate('home');
    })
    .catch(function() {
      // Fallback: use localStorage data or empty
      baseData = [];
      initialized = true;
      navigate('home');
    });
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
  var form = document.getElementById('gate-form');

  form.addEventListener('submit', function(e) {
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
      setTimeout(function() {
        card.classList.remove('shake');
        errorEl.style.display = 'none';
      }, 600);
    }
  });
})();

// ===== Home =====
function renderHome() {
  var search = document.getElementById('search-input').value.toLowerCase();
  var cat = document.getElementById('category-filter').value;
  var data = getMergedData();
  if (search) data = data.filter(function(d) { return d.name.toLowerCase().includes(search) || (d.description||'').toLowerCase().includes(search); });
  if (cat) data = data.filter(function(d) { return d.category === cat; });

  var grid = document.getElementById('software-grid');
  var empty = document.getElementById('home-empty');

  if (data.length === 0) {
    grid.innerHTML = '';
    empty.style.display = '';
  } else {
    empty.style.display = 'none';
    grid.innerHTML = data.map(function(d) {
      return '<a href="#" class="card" data-detail="' + d.id + '">' +
        '<h3>' + esc(d.name) + '</h3>' +
        '<div class="ver">v' + esc(d.version || '1.0.0') + '</div>' +
        '<div class="desc">' + esc(d.description || '暂无描述') + '</div>' +
        '<div class="meta"><span class="cat">' + esc(d.category || '其他') + '</span><span>' + (d.download_count || 0) + ' 次下载</span></div>' +
      '</a>';
    }).join('');
    grid.querySelectorAll('.card').forEach(function(card) {
      card.addEventListener('click', function(e) {
        e.preventDefault();
        navigate('detail', parseInt(this.dataset.detail));
      });
    });
  }

  var allData = getMergedData();
  var cats = [];
  allData.forEach(function(d) { if (d.category && cats.indexOf(d.category) === -1) cats.push(d.category); });
  var sel = document.getElementById('category-filter');
  sel.innerHTML = '<option value="">全部分类</option>' + cats.map(function(c) { return '<option value="' + esc(c) + '"' + (c === cat ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('');
}

document.getElementById('search-form').addEventListener('submit', function(e) {
  e.preventDefault();
  renderHome();
});
document.getElementById('category-filter').addEventListener('change', function() {
  renderHome();
});

// ===== Detail =====
function renderDetail(id) {
  var data = getMergedData();
  var item = data.find(function(d) { return d.id === id; });
  if (!item) return navigate('home');

  document.getElementById('detail-name').textContent = item.name;
  document.getElementById('detail-info').innerHTML =
    '<span>版本 ' + esc(item.version || '1.0.0') + '</span>' +
    '<span>' + esc(item.category || '其他') + '</span>' +
    '<span>' + (item.download_count || 0) + ' 次下载</span>';
  document.getElementById('detail-desc').textContent = item.description || '暂无描述';

  document.getElementById('detail-download').onclick = function() {
    item.download_count = (item.download_count || 0) + 1;
    addOrUpdate(item);
    renderDetail(id);
    if (item.file_path) {
      if (item.file_path.startsWith('http')) {
        window.open(item.file_path, '_blank');
      }
    } else {
      alert('未配置下载路径。');
    }
  };
}

// ===== Admin =====
function renderAdmin() {
  var search = document.getElementById('admin-search').value.toLowerCase();
  var data = getMergedData();
  if (search) data = data.filter(function(d) { return d.name.toLowerCase().includes(search) || (d.description||'').toLowerCase().includes(search); });

  var tbody = document.getElementById('admin-table-body');
  var empty = document.getElementById('admin-empty');
  var tableWrap = document.getElementById('admin-table-wrap');

  if (data.length === 0) {
    tableWrap.style.display = 'none';
    empty.style.display = '';
  } else {
    tableWrap.style.display = '';
    empty.style.display = 'none';
    tbody.innerHTML = data.map(function(d) {
      return '<tr>' +
        '<td>' + d.id + '</td>' +
        '<td><strong>' + esc(d.name) + '</strong></td>' +
        '<td>' + esc(d.version || '1.0.0') + '</td>' +
        '<td>' + esc(d.category || '其他') + '</td>' +
        '<td>' + (d.download_count || 0) + '</td>' +
        '<td style="display:flex;gap:8px">' +
          '<button class="btn btn-outline btn-sm" data-edit="' + d.id + '">编辑</button>' +
          '<button class="btn btn-danger btn-sm" data-delete="' + d.id + '">删除</button>' +
        '</td>' +
      '</tr>';
    }).join('');

    tbody.querySelectorAll('[data-edit]').forEach(function(btn) {
      btn.addEventListener('click', function() { openModal(parseInt(btn.dataset.edit)); });
    });
    tbody.querySelectorAll('[data-delete]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var id = parseInt(btn.dataset.delete);
        var item = getMergedData().find(function(d) { return d.id === id; });
        if (item && confirm('确定要删除"' + item.name + '"？此操作不可撤销。')) {
          removeItem(id);
          renderAdmin();
        }
      });
    });
  }
}

document.getElementById('admin-search').addEventListener('input', function() { renderAdmin(); });
document.getElementById('admin-refresh').addEventListener('click', function() {
  document.getElementById('admin-search').value = '';
  renderAdmin();
});

// Export button
document.addEventListener('DOMContentLoaded', function() {
  var exportBtn = document.createElement('button');
  exportBtn.className = 'btn btn-outline btn-sm';
  exportBtn.textContent = '导出 JSON';
  exportBtn.style.marginLeft = '8px';
  exportBtn.title = '下载 software.json 用于部署更新';
  exportBtn.addEventListener('click', exportData);
  document.getElementById('admin-add').parentNode.appendChild(exportBtn);
});

// ===== Modal =====
var modal = document.getElementById('modal');
var modalForm = document.getElementById('modal-form');
var modalTitle = document.getElementById('modal-title');
var modalSave = document.getElementById('modal-save');

document.getElementById('admin-add').addEventListener('click', function() { openModal(null); });
document.getElementById('modal-cancel').addEventListener('click', function() { closeModal(); });
modal.addEventListener('click', function(e) { if (e.target === modal) closeModal(); });

function openModal(id) {
  editingId = id;
  modal.style.display = 'flex';
  modalForm.reset();
  if (id) {
    modalTitle.textContent = '编辑软件';
    modalSave.textContent = '保存';
    var item = getMergedData().find(function(d) { return d.id === id; });
    if (item) {
      modalForm.name.value = item.name || '';
      modalForm.version.value = item.version || '1.0.0';
      modalForm.category.value = item.category || '其他';
      modalForm.description.value = item.description || '';
      modalForm.file_path.value = item.file_path || '';
      modalForm.icon_url.value = item.icon_url || '';
    }
  } else {
    modalTitle.textContent = '添加软件';
    modalSave.textContent = '创建';
  }
}

function closeModal() { modal.style.display = 'none'; editingId = null; }

modalForm.addEventListener('submit', function(e) {
  e.preventDefault();
  var item = {
    name: modalForm.name.value.trim(),
    version: modalForm.version.value.trim() || '1.0.0',
    category: modalForm.category.value || '其他',
    description: modalForm.description.value.trim(),
    file_path: modalForm.file_path.value.trim(),
    icon_url: modalForm.icon_url.value.trim(),
    download_count: 0
  };
  if (!item.name) return alert('名称不能为空');

  if (editingId) {
    var existing = getMergedData().find(function(d) { return d.id === editingId; });
    item.id = editingId;
    item.download_count = existing ? existing.download_count || 0 : 0;
    addOrUpdate(item);
  } else {
    item.id = nextId();
    addOrUpdate(item);
  }
  closeModal();
  renderAdmin();
});

// ===== Utility =====
function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Small button style
(function() {
  var style = document.createElement('style');
  style.textContent = '.btn-sm { padding: 6px 14px !important; font-size: 0.8rem !important; }';
  document.head.appendChild(style);
})();
