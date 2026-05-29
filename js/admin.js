// ===== Theme (mirrors app.js) =====
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

// ===== State =====
var softwareData = [];
var editingId = null;

// ===== Elements =====
var tableBody = document.getElementById('table-body');
var emptyEl = document.getElementById('admin-empty');
var tableWrap = document.getElementById('table-wrap');
var searchInput = document.getElementById('admin-search');
var modal = document.getElementById('modal');
var modalTitle = document.getElementById('modal-title');
var modalForm = document.getElementById('modal-form');
var modalSave = document.getElementById('modal-save');

// ===== Load =====
function loadData() {
  fetch('software.json')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      softwareData = data;
      renderTable();
    })
    .catch(function() {
      softwareData = [];
      renderTable();
    });
}

// ===== Render =====
function renderTable() {
  var search = (searchInput.value || '').toLowerCase();
  var filtered = softwareData;
  if (search) {
    filtered = softwareData.filter(function(d) {
      return d.name.toLowerCase().includes(search) ||
        (d.description || '').toLowerCase().includes(search) ||
        (d.category || '').toLowerCase().includes(search);
    });
  }

  if (filtered.length === 0) {
    tableBody.innerHTML = '';
    tableWrap.style.display = 'none';
    emptyEl.style.display = '';
    return;
  }

  tableWrap.style.display = '';
  emptyEl.style.display = 'none';

  tableBody.innerHTML = filtered.map(function(d) {
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
  if (id !== null) {
    var item = softwareData.find(function(d) { return d.id === id; });
    if (!item) return;
    modalTitle.textContent = '编辑软件';
    modalSave.textContent = '保存';
    modalForm.name.value = item.name || '';
    modalForm.version.value = item.version || '';
    modalForm.category.value = item.category || '其他';
    modalForm.description.value = item.description || '';
    modalForm.file_path.value = item.file_path || '';
    modalForm.icon_url.value = item.icon_url || '';
  } else {
    modalTitle.textContent = '添加软件';
    modalSave.textContent = '创建';
    modalForm.reset();
    modalForm.category.value = '其他';
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
  var entry = {
    id: editingId !== null ? editingId : nextId(),
    name: fd.get('name').trim(),
    version: fd.get('version').trim() || '1.0.0',
    category: fd.get('category') || '其他',
    description: fd.get('description').trim(),
    file_path: fd.get('file_path').trim(),
    icon_url: fd.get('icon_url').trim()
  };

  if (!entry.name) return;

  if (editingId !== null) {
    var idx = softwareData.findIndex(function(d) { return d.id === editingId; });
    if (idx !== -1) softwareData[idx] = entry;
  } else {
    softwareData.push(entry);
  }

  modal.style.display = 'none';
  editingId = null;
  renderTable();
});

// ===== Delete =====
function deleteItem(id) {
  if (!confirm('确定删除此软件条目吗？此操作不可撤销。')) return;
  softwareData = softwareData.filter(function(d) { return d.id !== id; });
  renderTable();
}

// ===== Export =====
document.getElementById('admin-export').addEventListener('click', function() {
  var json = JSON.stringify(softwareData, null, 2);
  var blob = new Blob([json], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'software.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

// ===== Utility =====
function nextId() {
  var max = 0;
  softwareData.forEach(function(d) { if (d.id > max) max = d.id; });
  return max + 1;
}

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ===== Init =====
loadData();
