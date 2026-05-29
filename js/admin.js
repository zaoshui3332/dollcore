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

// ===== Gate =====
(function () {
  var ANSWER = 'ppnn13%dkst-Feb.1st';
  if (sessionStorage.getItem('dollcore-admin-auth') === '1') {
    document.getElementById('admin-gate').style.display = 'none';
    document.getElementById('admin-app').style.display = '';
    initAdmin();
    return;
  }

  document.getElementById('admin-gate').style.display = '';
  var card = document.getElementById('admin-gate-card');
  var input = document.getElementById('admin-gate-input');
  var errorEl = document.getElementById('admin-gate-error');
  document.getElementById('admin-gate-form').addEventListener('submit', function(e) {
    e.preventDefault();
    var val = input.value.trim();
    if (val === 'root') {
      card.classList.add('fade-out');
      setTimeout(function() {
        sessionStorage.setItem('dollcore-admin-auth', '1');
        document.getElementById('admin-gate').style.display = 'none';
        document.getElementById('admin-app').style.display = '';
        initAdmin();
      }, 600);
    } else if (val === ANSWER) {
      card.classList.add('fade-out');
      setTimeout(function() {
        sessionStorage.setItem('dollcore-auth', '1');
        window.location.href = 'index.html';
      }, 600);
    } else {
      errorEl.style.display = '';
      card.classList.add('shake');
      input.value = '';
      setTimeout(function() { card.classList.remove('shake'); errorEl.style.display = 'none'; }, 600);
    }
  });
})();

// ===== State =====
var softwareData = [];
var websitesData = [];
var currentType = 'software';
var editingId = null;

// ===== Elements =====
var tableHead = document.getElementById('table-head');
var tableBody = document.getElementById('table-body');
var emptyEl = document.getElementById('admin-empty');
var tableWrap = document.getElementById('table-wrap');
var searchInput = document.getElementById('admin-search');
var modal = document.getElementById('modal');
var modalTitle = document.getElementById('modal-title');
var modalForm = document.getElementById('modal-form');
var modalSave = document.getElementById('modal-save');
var fieldsSoftware = document.getElementById('modal-fields-software');
var fieldsWebsite = document.getElementById('modal-fields-website');

// ===== Tabs =====
document.querySelectorAll('.admin-tab').forEach(function(tab) {
  tab.addEventListener('click', function() {
    currentType = this.dataset.type;
    document.querySelectorAll('.admin-tab').forEach(function(t) { t.classList.remove('active'); });
    this.classList.add('active');
    renderTable();
  });
});

// ===== Data =====
function getCurrentData() {
  return currentType === 'software' ? softwareData : websitesData;
}

function currentFile() {
  return currentType === 'software' ? 'software.json' : 'websites.json';
}

function loadData() {
  Promise.all([
    fetch('software.json').then(function(r) { return r.json(); }).catch(function() { return []; }),
    fetch('websites.json').then(function(r) { return r.json(); }).catch(function() { return []; })
  ]).then(function(results) {
    softwareData = results[0];
    websitesData = results[1];
    renderTable();
  });
}

// ===== Render =====
function renderTable() {
  var search = (searchInput.value || '').toLowerCase();
  var data = getCurrentData();
  if (search) {
    data = data.filter(function(d) {
      return d.name.toLowerCase().includes(search) ||
        (d.description || '').toLowerCase().includes(search) ||
        (d.category || '').toLowerCase().includes(search);
    });
  }

  if (currentType === 'software') {
    tableHead.innerHTML = '<tr><th>ID</th><th>名称</th><th>版本</th><th>分类</th><th>路径</th><th>操作</th></tr>';
  } else {
    tableHead.innerHTML = '<tr><th>ID</th><th>名称</th><th>网址</th><th>分类</th><th>操作</th></tr>';
  }

  if (data.length === 0) {
    tableBody.innerHTML = '';
    tableWrap.style.display = 'none';
    emptyEl.style.display = '';
    return;
  }

  tableWrap.style.display = '';
  emptyEl.style.display = 'none';

  if (currentType === 'software') {
    tableBody.innerHTML = data.map(function(d) {
      return '<tr>' +
        '<td>' + esc(d.id) + '</td>' +
        '<td>' + esc(d.name) + '</td>' +
        '<td>' + esc(d.version || '1.0.0') + '</td>' +
        '<td>' + esc(d.category || '其他') + '</td>' +
        '<td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + esc(d.file_path || '') + '">' + esc(d.file_path || '-') + '</td>' +
        '<td>' +
          '<button class="btn btn-outline" data-edit="' + d.id + '" style="padding:4px 12px;font-size:0.8rem;margin-right:6px">编辑</button>' +
          '<button class="btn btn-danger" data-delete="' + d.id + '" style="padding:4px 12px;font-size:0.8rem">删除</button>' +
        '</td>' +
      '</tr>';
    }).join('');
  } else {
    tableBody.innerHTML = data.map(function(d) {
      return '<tr>' +
        '<td>' + esc(d.id) + '</td>' +
        '<td>' + esc(d.name) + '</td>' +
        '<td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + esc(d.url || '') + '">' + esc(d.url || '-') + '</td>' +
        '<td>' + esc(d.category || '其他') + '</td>' +
        '<td>' +
          '<button class="btn btn-outline" data-edit="' + d.id + '" style="padding:4px 12px;font-size:0.8rem;margin-right:6px">编辑</button>' +
          '<button class="btn btn-danger" data-delete="' + d.id + '" style="padding:4px 12px;font-size:0.8rem">删除</button>' +
        '</td>' +
      '</tr>';
    }).join('');
  }

  tableBody.querySelectorAll('[data-edit]').forEach(function(btn) {
    btn.addEventListener('click', function() { openModal(parseInt(this.dataset.edit)); });
  });
  tableBody.querySelectorAll('[data-delete]').forEach(function(btn) {
    btn.addEventListener('click', function() { deleteItem(parseInt(this.dataset.delete)); });
  });
}

// ===== Search =====
searchInput.addEventListener('input', renderTable);

// ===== Refresh =====
document.getElementById('admin-refresh').addEventListener('click', loadData);

// ===== Add =====
document.getElementById('admin-add').addEventListener('click', function() { openModal(null); });

// ===== Modal =====
function openModal(id) {
  editingId = id;
  var isSoftware = currentType === 'software';
  fieldsSoftware.style.display = isSoftware ? '' : 'none';
  fieldsWebsite.style.display = isSoftware ? 'none' : '';

  if (id !== null) {
    var item = getCurrentData().find(function(d) { return d.id === id; });
    if (!item) return;
    modalTitle.textContent = '编辑';
    modalSave.textContent = '保存';
    modalForm.name.value = item.name || '';
    modalForm.description.value = item.description || '';
    modalForm.icon_url.value = item.icon_url || '';
    if (isSoftware) {
      modalForm.version.value = item.version || '';
      modalForm.category.value = item.category || '其他';
      modalForm.file_path.value = item.file_path || '';
    } else {
      modalForm.url.value = item.url || '';
      modalForm.category_web.value = item.category || '其他';
    }
  } else {
    modalTitle.textContent = '添加';
    modalSave.textContent = '创建';
    modalForm.reset();
    modalForm.category.value = '其他';
    modalForm.category_web.value = '其他';
  }
  modal.style.display = '';
}

document.getElementById('modal-cancel').addEventListener('click', function() {
  modal.style.display = 'none';
  editingId = null;
});

modal.addEventListener('click', function(e) {
  if (e.target === modal) { modal.style.display = 'none'; editingId = null; }
});

modalForm.addEventListener('submit', function(e) {
  e.preventDefault();
  var fd = new FormData(modalForm);
  var isSoftware = currentType === 'software';
  var entry = {
    id: editingId !== null ? editingId : nextId(),
    name: fd.get('name').trim(),
    category: isSoftware ? (fd.get('category') || '其他') : (fd.get('category_web') || '其他'),
    description: fd.get('description').trim(),
    icon_url: fd.get('icon_url').trim()
  };

  if (!entry.name) return;

  if (isSoftware) {
    entry.version = fd.get('version').trim() || '1.0.0';
    entry.file_path = fd.get('file_path').trim();
  } else {
    entry.url = fd.get('url').trim();
  }

  var arr = getCurrentData();
  if (editingId !== null) {
    var idx = arr.findIndex(function(d) { return d.id === editingId; });
    if (idx !== -1) arr[idx] = entry;
  } else {
    arr.push(entry);
  }

  modal.style.display = 'none';
  editingId = null;
  renderTable();
});

// ===== Delete =====
function deleteItem(id) {
  if (!confirm('确定删除此条目吗？此操作不可撤销。')) return;
  if (currentType === 'software') {
    softwareData = softwareData.filter(function(d) { return d.id !== id; });
  } else {
    websitesData = websitesData.filter(function(d) { return d.id !== id; });
  }
  renderTable();
}

// ===== Export =====
document.getElementById('admin-export').addEventListener('click', function() {
  var data = getCurrentData();
  var filename = currentFile();
  var json = JSON.stringify(data, null, 2);
  var blob = new Blob([json], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

// ===== Utility =====
function nextId() {
  var max = 0;
  var data = getCurrentData();
  data.forEach(function(d) { if (d.id > max) max = d.id; });
  return max + 1;
}

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ===== Init =====
function initAdmin() { loadData(); }
