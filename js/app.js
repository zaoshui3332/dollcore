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
  const canvas = document.getElementById('particles');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const particles = [];
  const count = 45;
  let anim;

  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize);

  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.8 + 0.5, alpha: Math.random() * 0.25 + 0.05,
      pulse: Math.random() * Math.PI * 2
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const isDark = getTheme() === 'dark';
    const c = isDark ? '192,132,252' : '100,116,139';
    particles.forEach((p, i) => {
      p.x += p.vx; p.y += p.vy; p.pulse += 0.015;
      const alpha = p.alpha + Math.sin(p.pulse) * 0.1;
      if (p.x < -10) p.x = canvas.width + 10;
      if (p.x > canvas.width + 10) p.x = -10;
      if (p.y < -10) p.y = canvas.height + 10;
      if (p.y > canvas.height + 10) p.y = -10;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${c},${Math.max(0.04, alpha)})`;
      ctx.fill();
      particles.forEach((p2, j) => {
        if (j <= i) return;
        const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
        if (dist < 100) {
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(${c},${0.04 * (1 - dist / 100)})`;
          ctx.lineWidth = 0.5; ctx.stroke();
        }
      });
    });
    anim = requestAnimationFrame(draw);
  }
  draw();
  window._redrawParticles = function () { }; // particles re-read theme each frame
  window.addEventListener('unload', () => cancelAnimationFrame(anim));
})();

// ===== Data Store =====
const STORE_KEY = 'dollcore-software';
function loadData() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; }
  catch { return []; }
}
function saveData(data) { localStorage.setItem(STORE_KEY, JSON.stringify(data)); }

function nextId() {
  const data = loadData();
  return data.length ? Math.max(...data.map(d => d.id)) + 1 : 1;
}

// ===== Navigation =====
let currentPage = 'home';
let currentDetailId = null;
let editingId = null;

function navigate(page, id) {
  currentPage = page;
  currentDetailId = id || null;
  document.querySelectorAll('.navbar .links a').forEach(a => a.classList.remove('active'));
  document.querySelectorAll('.page').forEach(p => p.style.display = 'none');

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

document.querySelectorAll('[data-nav]').forEach(el => {
  el.addEventListener('click', function (e) {
    e.preventDefault();
    navigate(this.dataset.nav);
  });
});

// ===== Gate =====
(function () {
  const ANSWER = 'ppnn13%dkst-Feb.1st';
  if (sessionStorage.getItem('dollcore-auth') === '1') {
    document.getElementById('page-gate').style.display = 'none';
    document.getElementById('app').style.display = '';
    navigate('home');
    return;
  }

  const card = document.getElementById('gate-card');
  const input = document.getElementById('gate-input');
  const errorEl = document.getElementById('gate-error');
  const form = document.getElementById('gate-form');

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (input.value.trim() === ANSWER) {
      card.classList.add('fade-out');
      setTimeout(() => {
        sessionStorage.setItem('dollcore-auth', '1');
        document.getElementById('page-gate').style.display = 'none';
        document.getElementById('app').style.display = '';
        navigate('home');
      }, 600);
    } else {
      errorEl.style.display = '';
      card.classList.add('shake');
      input.value = '';
      setTimeout(() => {
        card.classList.remove('shake');
        errorEl.style.display = 'none';
      }, 600);
    }
  });
})();

// ===== Home =====
function renderHome() {
  const search = document.getElementById('search-input').value.toLowerCase();
  const cat = document.getElementById('category-filter').value;
  let data = loadData();
  if (search) data = data.filter(d => d.name.toLowerCase().includes(search) || d.description.toLowerCase().includes(search));
  if (cat) data = data.filter(d => d.category === cat);

  const grid = document.getElementById('software-grid');
  const empty = document.getElementById('home-empty');
  const loading = document.getElementById('home-loading');
  loading.style.display = 'none';

  if (data.length === 0) {
    grid.innerHTML = '';
    empty.style.display = '';
  } else {
    empty.style.display = 'none';
    grid.innerHTML = data.map(d => `
      <a href="#" class="card" data-detail="${d.id}">
        <h3>${esc(d.name)}</h3>
        <div class="ver">v${esc(d.version || '1.0.0')}</div>
        <div class="desc">${esc(d.description || '暂无描述')}</div>
        <div class="meta">
          <span class="cat">${esc(d.category || '其他')}</span>
          <span>${d.download_count || 0} 次下载</span>
        </div>
      </a>
    `).join('');
    grid.querySelectorAll('.card').forEach(card => {
      card.addEventListener('click', function (e) {
        e.preventDefault();
        navigate('detail', parseInt(this.dataset.detail));
      });
    });
  }

  // Update category filter
  const allData = loadData();
  const cats = [...new Set(allData.map(d => d.category).filter(Boolean))];
  const sel = document.getElementById('category-filter');
  sel.innerHTML = '<option value="">全部分类</option>' + cats.map(c => `<option value="${esc(c)}" ${c === cat ? 'selected' : ''}>${esc(c)}</option>`).join('');
}

document.getElementById('search-form').addEventListener('submit', function (e) {
  e.preventDefault();
  renderHome();
});

document.getElementById('category-filter').addEventListener('change', function () {
  renderHome();
});

// ===== Detail =====
function renderDetail(id) {
  const data = loadData();
  const item = data.find(d => d.id === id);
  if (!item) return navigate('home');

  document.getElementById('detail-name').textContent = item.name;
  document.getElementById('detail-info').innerHTML = `
    <span>版本 ${esc(item.version || '1.0.0')}</span>
    <span>${esc(item.category || '其他')}</span>
    <span>${item.download_count || 0} 次下载</span>
  `;
  document.getElementById('detail-desc').textContent = item.description || '暂无描述';

  document.getElementById('detail-download').onclick = function () {
    if (!item.file_path) return alert('未配置下载路径。');
    item.download_count = (item.download_count || 0) + 1;
    const allData = loadData();
    const idx = allData.findIndex(d => d.id === id);
    if (idx !== -1) { allData[idx] = item; saveData(allData); }
    renderDetail(id);
    if (item.file_path.startsWith('http')) {
      window.open(item.file_path, '_blank');
    }
  };
}

// ===== Admin =====
function renderAdmin() {
  const search = document.getElementById('admin-search').value.toLowerCase();
  let data = loadData();
  if (search) data = data.filter(d => d.name.toLowerCase().includes(search) || d.description.toLowerCase().includes(search));

  const tbody = document.getElementById('admin-table-body');
  const empty = document.getElementById('admin-empty');
  const tableWrap = document.getElementById('admin-table-wrap');

  if (data.length === 0) {
    tableWrap.style.display = 'none';
    empty.style.display = '';
  } else {
    tableWrap.style.display = '';
    empty.style.display = 'none';
    tbody.innerHTML = data.map(d => `
      <tr>
        <td>${d.id}</td>
        <td><strong>${esc(d.name)}</strong></td>
        <td>${esc(d.version || '1.0.0')}</td>
        <td>${esc(d.category || '其他')}</td>
        <td>${d.download_count || 0}</td>
        <td style="display:flex;gap:8px">
          <button class="btn btn-outline btn-sm" data-edit="${d.id}">编辑</button>
          <button class="btn btn-danger btn-sm" data-delete="${d.id}">删除</button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => openModal(parseInt(btn.dataset.edit)));
    });
    tbody.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.delete);
        const item = loadData().find(d => d.id === id);
        if (item && confirm(`确定要删除"${item.name}"？此操作不可撤销。`)) {
          const allData = loadData().filter(d => d.id !== id);
          saveData(allData);
          renderAdmin();
        }
      });
    });
  }
}

document.getElementById('admin-search').addEventListener('input', function () {
  renderAdmin();
});

document.getElementById('admin-refresh').addEventListener('click', function () {
  document.getElementById('admin-search').value = '';
  renderAdmin();
});

// ===== Modal =====
const modal = document.getElementById('modal');
const modalForm = document.getElementById('modal-form');
const modalTitle = document.getElementById('modal-title');
const modalSave = document.getElementById('modal-save');

document.getElementById('admin-add').addEventListener('click', function () {
  openModal(null);
});

document.getElementById('modal-cancel').addEventListener('click', function () {
  closeModal();
});

modal.addEventListener('click', function (e) {
  if (e.target === modal) closeModal();
});

function openModal(id) {
  editingId = id;
  modal.style.display = 'flex';
  modalForm.reset();
  if (id) {
    modalTitle.textContent = '编辑软件';
    modalSave.textContent = '保存';
    const item = loadData().find(d => d.id === id);
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

function closeModal() {
  modal.style.display = 'none';
  editingId = null;
}

modalForm.addEventListener('submit', function (e) {
  e.preventDefault();
  const formData = {
    name: modalForm.name.value.trim(),
    version: modalForm.version.value.trim() || '1.0.0',
    category: modalForm.category.value || '其他',
    description: modalForm.description.value.trim(),
    file_path: modalForm.file_path.value.trim(),
    icon_url: modalForm.icon_url.value.trim(),
    download_count: 0
  };
  if (!formData.name) return alert('名称不能为空');

  const allData = loadData();
  if (editingId) {
    const idx = allData.findIndex(d => d.id === editingId);
    if (idx !== -1) {
      allData[idx] = { ...allData[idx], ...formData };
    }
  } else {
    formData.id = nextId();
    formData.download_count = 0;
    allData.push(formData);
  }
  saveData(allData);
  closeModal();
  renderAdmin();
});

// ===== Utility =====
function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ===== CSS for small buttons =====
(function () {
  const style = document.createElement('style');
  style.textContent = `.btn-sm { padding: 6px 14px !important; font-size: 0.8rem !important; }`;
  document.head.appendChild(style);
})();
