// ===== 数学题排版工具 =====
const STORAGE_KEY = 'yoyo_math_bulk_v2';
const PER_PAGE = 6;
const PER_PAGE_WORD = 3;

const $input = document.getElementById('bulkInput');
const $count = document.getElementById('countTip');
const $pages = document.getElementById('pageContainer');
const $date = document.getElementById('datePicker');
const $tabBtns = document.querySelectorAll('.tab-btn');
const $modePanels = document.querySelectorAll('.mode-panel');
const $previewTitle = document.getElementById('previewTitle');
const $wordTitle = document.getElementById('wordTitle');
const $wordDate = document.getElementById('wordDate');
const $wordCountTip = document.getElementById('wordCountTip');
const $wordInput = document.getElementById('wordInput');
const $freeTitle = document.getElementById('freeTitle');
const $freeDate = document.getElementById('freeDate');
const $freeInput = document.getElementById('freeInput');
const $freeCountTip = document.getElementById('freeCountTip');

const DEFAULT_TEXT =
`计算 $\\dfrac{3}{4} + \\dfrac{2}{3}$ 的结果。

化简：$(x^2 - 4) \\div (x - 2)$。

求方程 $x^2 - 5x + 6 = 0$ 的解。

计算 $\\sqrt{144} + \\sqrt{81}$。

已知 $a=2, b=3$，求 $a^2 + 2ab + b^2$ 的值。

解不等式组 $\\begin{cases} 2x - 5 < 7 \\\\ x + 1 \\geq 0 \\end{cases}$。

比较 $\\dfrac{5}{8}$ 与 $\\dfrac{2}{3}$ 的大小。

求 $\\sqrt[3]{27}$ 的值。`;

function loadText() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== null) return raw;
  } catch (e) {}
  return DEFAULT_TEXT;
}
function saveText() { localStorage.setItem(STORAGE_KEY, $input.value); }

function parseQuestions(text) {
  return text.split('\n')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !/^-{3,}$/.test(s));
}

let previewTimer = null;
function schedulePreview() {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(renderPreview, 150);
}

// ---- 模式切换 ----
let currentMode = 'calc';
function setMode(mode) {
  currentMode = mode;
  $tabBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  $modePanels.forEach(p => p.hidden = (p.dataset.panel !== mode));
  $previewTitle.textContent = (mode === 'calc')
    ? '预览（每页 6 题 · 两列）'
    : (mode === 'word')
      ? '预览（每页 3 题 · 应用题）'
      : '预览（自由模式 · 单页）';
  renderPreview();
}

$tabBtns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));

// ---- 渲染 ----
function renderPreview() {
  $pages.innerHTML = '';
  if (currentMode === 'calc') renderCalcPage();
  else if (currentMode === 'word') renderWordPage();
  else renderFreePage();
  typesetMath();
}

function renderCalcPage() {
  const questions = parseQuestions($input.value);
  $count.textContent = `共 ${questions.length} 题`;

  if (questions.length === 0) {
    $pages.innerHTML = '<div style="color:#8a9099;padding:40px;text-align:center;">左侧输入题目后在此预览</div>';
    return;
  }

  const today = new Date();
  const pad = n => String(n).padStart(2, '0');
  const dateStr = $date.value || `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  const totalPages = Math.ceil(questions.length / PER_PAGE);

  for (let p = 0; p < totalPages; p++) {
    const page = document.createElement('div');
    page.className = 'page';
    page.innerHTML = `
      <div class="page-header">
        <div class="page-title">Calculation Worksheet <span class="dot">·</span><span class="date">${dateStr}</span></div>
        <hr class="page-line" />
      </div>
      <div class="page-grid"></div>`;
    const grid = page.querySelector('.page-grid');
    const slice = questions.slice(p * PER_PAGE, p * PER_PAGE + PER_PAGE);
    slice.forEach((q, i) => {
      const item = document.createElement('div');
      item.className = 'qitem' + (i < 3 ? ' left-col' : ' right-col');
      const span = document.createElement('span');
      span.className = 'qbody';
      span.innerHTML = formatRichText(q);
      item.appendChild(span);
      grid.appendChild(item);
    });
    for (let k = slice.length; k < PER_PAGE; k++) {
      const ph = document.createElement('div');
      ph.className = 'qitem empty' + (k < 3 ? ' left-col' : ' right-col');
      ph.innerHTML = '&nbsp;';
      grid.appendChild(ph);
    }
    $pages.appendChild(page);
  }
}

// 解析应用题：以一整行空白（连续空行）为分隔，每段内换行原样保留
function parseWordQuestions(text) {
  return text.split(/\n\s*\n/)
    .map(s => s.replace(/^\n+|\n+$/g, '').replace(/\s+$/g, ''))
    .filter(s => s.length > 0);
}

function renderWordPage() {
  const items = parseWordQuestions($wordInput.value);
  $wordCountTip.textContent = `共 ${items.length} 题`;

  const title = $wordTitle.value || '应用题';
  const date = $wordDate.value || '';

  const totalPages = Math.max(1, Math.ceil(items.length / PER_PAGE_WORD));
  for (let p = 0; p < totalPages; p++) {
    const page = document.createElement('div');
    page.className = 'page page-word';
    const headerHtml = `
      <div class="page-header">
        <div class="page-title">${escapeHtml(title)} ${date ? `<span class="dot">·</span><span class="date">${escapeHtml(date)}</span>` : ''}</div>
        <hr class="page-line" />
      </div>`;
    let answerHtml = '<div class="page-grid">';
    const slice = items.slice(p * PER_PAGE_WORD, p * PER_PAGE_WORD + PER_PAGE_WORD);
    for (let i = 0; i < PER_PAGE_WORD; i++) {
      const it = slice[i] || '';
      answerHtml += `<div class="witem"><div class="wbody">${it ? '' : '&nbsp;'}</div></div>`;
    }
    answerHtml += '</div>';
    page.innerHTML = headerHtml + answerHtml;

    const bodies = page.querySelectorAll('.wbody');
    slice.forEach((q, i) => {
      if (i < bodies.length && q) {
        const span = document.createElement('span');
        span.className = 'qbody';
        span.innerHTML = formatRichText(q);
        bodies[i].appendChild(span);
      }
    });

    $pages.appendChild(page);
  }
}

// 自由模式：单列或双列；双列按空行分段，左→右填充满后换页
let freeCols = 2;
function setFreeCols(n) {
  freeCols = n;
  document.querySelectorAll('.seg-btn').forEach(b => {
    b.classList.toggle('active', Number(b.dataset.cols) === n);
  });
  renderPreview();
}
function fillWbody(body, text) {
  if (!text) { body.innerHTML = '&nbsp;'; return; }
  const span = document.createElement('span');
  span.className = 'qbody';
  span.innerHTML = formatRichText(text);
  body.innerHTML = '';
  body.appendChild(span);
}

function renderFreePage() {
  const content = $freeInput.value.replace(/\s+$/g, '');
  const title = $freeTitle.value || '自由模式';
  const date = $freeDate.value || '';
  const headerHtml = (pageClass) => `
    <div class="page-header">
      <div class="page-title">${escapeHtml(title)} ${date ? `<span class="dot">·</span><span class="date">${escapeHtml(date)}</span>` : ''}</div>
      <hr class="page-line" />
    </div>
    <div class="page-grid">${pageClass}</div>`;

  if (freeCols === 1) {
    $freeCountTip.textContent = content ? '共 1 页' : '空内容';
    const page = document.createElement('div');
    page.className = 'page page-free cols-1';
    page.innerHTML = headerHtml('<div class="witem"><div class="wbody"></div></div>');
    fillWbody(page.querySelector('.wbody'), content);
    $pages.appendChild(page);
    return;
  }

  // 双列：用 CSS columns 流式排版，内容先填满左栏再溢出到右栏
  $freeCountTip.textContent = content ? '共 1 页' : '空内容';
  const page = document.createElement('div');
  page.className = 'page page-free cols-2';
  page.innerHTML = headerHtml('<div class="witem"><div class="wbody"></div></div>');
  fillWbody(page.querySelector('.wbody'), content);
  $pages.appendChild(page);
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// 处理 **bold** / *italic*，同时 HTML 转义其余字符（不破坏 LaTeX 命令的 \ 等）
function applyMarkdown(s) {
  let out = escapeHtml(s);
  // 先处理 ** **（避免被 * * 提前吃掉）
  out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\*(.+?)\*/g, '<em>$1</em>');
  return out;
}

// 将文本切分为「公式段」和「普通文本段」，公式段原样保留，
// 文本段应用 **粗体** *斜体* 规则并 HTML 转义
function formatRichText(text) {
  // 按 $...$ 分段（不支持嵌套，单 $ 与 $$ 区分由 MathJax 自行处理；
  // 这里只切出 $...$ 区间，让 MathJax 后续解析）
  const parts = text.split(/(\$[^$]+\$)/g);
  return parts.map(p => {
    if (/^\$[^$]+\$$/.test(p)) {
      // 公式段：保留原样，但 HTML 转义外面的 < > &（MathJax 拿到的是 DOM 文本节点，不会被 HTML 解析干扰）
      return escapeHtml(p);
    }
    return applyMarkdown(p);
  }).join('');
}

function typesetMath() {
  if (window.MathJax && window.MathJax.typesetPromise) {
    return window.MathJax.typesetPromise([$pages]).catch(err => console.warn('MathJax typeset:', err));
  }
  return Promise.resolve();
}

window._onMathJaxReady = () => {
  console.log('[MathJax] ready');
  typesetMath();
};
(function waitMJ() {
  if (window.MathJax && window.MathJax.typesetPromise) { typesetMath(); return; }
  setTimeout(waitMJ, 200);
})();

// ---- 事件 ----
$input.addEventListener('input', () => { saveText(); schedulePreview(); });
$date.addEventListener('change', () => { renderPreview(); });

document.getElementById('clearBtn').addEventListener('click', () => {
  if (currentMode === 'calc') {
    if (confirm('确定清空所有题目吗？')) {
      $input.value = '';
      saveText(); schedulePreview();
      $input.focus();
    }
  } else if (currentMode === 'word') {
    if (confirm('确定清空所有应用题吗？')) {
      $wordInput.value = '';
      renderPreview();
    }
  } else {
    if (confirm('确定清空自由模式内容吗？')) {
      $freeInput.value = '';
      renderPreview();
    }
  }
});

document.getElementById('refreshBtn').addEventListener('click', () => renderPreview());
document.getElementById('exportBtn').addEventListener('click', exportPDF);

// 应用题输入实时刷新
$wordTitle.addEventListener('input', schedulePreview);
$wordDate.addEventListener('input', schedulePreview);
$wordInput.addEventListener('input', schedulePreview);

// 自由模式输入实时刷新
$freeTitle.addEventListener('input', schedulePreview);
$freeDate.addEventListener('input', schedulePreview);
$freeInput.addEventListener('input', schedulePreview);
document.querySelectorAll('.seg-btn').forEach(b => {
  b.addEventListener('click', () => setFreeCols(Number(b.dataset.cols)));
});

$input.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    e.preventDefault();
    const s = $input.selectionStart, en = $input.selectionEnd;
    $input.value = $input.value.slice(0, s) + '  ' + $input.value.slice(en);
    $input.selectionStart = $input.selectionEnd = s + 2;
  }
});

// ---- 初始化 ----
$input.value = loadText();
(function initDate() {
  const today = new Date();
  const pad = n => String(n).padStart(2, '0');
  $date.value = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
})();
renderPreview();

// ---- 导出 PDF ----
async function exportPDF() {
  const $btn = document.getElementById('exportBtn');
  $btn.disabled = true;
  $btn.textContent = '渲染公式中...';
  try {
    await typesetMath();
    await new Promise(r => setTimeout(r, 800));
  } catch (e) { console.warn('MathJax:', e); }

  $btn.textContent = '生成 PDF 中...';
  document.body.classList.add('exporting');

  try {
    const { jsPDF } = window.jspdf;
    if (!window.jspdf || !window.jspdf.jsPDF) { alert('PDF 库未加载，请检查网络'); return; }
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const pageEls = $pages.querySelectorAll('.page');
    if (pageEls.length === 0) { alert('暂无内容'); return; }
    const A4_W = 210, A4_H = 297;

    // 应用题：命名以"应用题_"开头
    const datePart = (currentMode === 'calc')
      ? ($date.value || new Date().toISOString().slice(0, 10))
      : (currentMode === 'word')
        ? ($wordDate.value || new Date().toISOString().slice(0, 10))
        : ($freeDate.value || new Date().toISOString().slice(0, 10));
    const prefix = (currentMode === 'calc') ? '计算题_' : (currentMode === 'word') ? '应用题_' : '自由模式_';

    for (let i = 0; i < pageEls.length; i++) {
      $btn.textContent = `生成中 ${i + 1}/${pageEls.length}...`;
      const canvas = await html2canvas(pageEls[i], {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, 0, A4_W, A4_H, undefined, 'FAST');
    }

    const filename = prefix + datePart + '.pdf';
    pdf.save(filename);
  } catch (e) {
    console.error('导出失败:', e);
    alert('导出失败：' + (e.message || e));
  } finally {
    document.body.classList.remove('exporting');
    $btn.disabled = false;
    $btn.textContent = '导出 PDF';
  }
}
