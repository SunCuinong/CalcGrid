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

  // 单列：按空行分段，每段渲染一页，支持多页
  if (freeCols === 1) {
    const segs = parseWordQuestions(content);
    const totalPages = Math.max(1, segs.length);
    $freeCountTip.textContent = segs.length ? `共 ${totalPages} 页` : '空内容';
    for (let p = 0; p < totalPages; p++) {
      const page = document.createElement('div');
      page.className = 'page page-free cols-1';
      page.innerHTML = headerHtml('<div class="witem"><div class="wbody"></div></div>');
      fillWbody(page.querySelector('.wbody'), segs[p] || '');
      $pages.appendChild(page);
    }
    return;
  }

  // 双列：按空行分段，每 2 段为一页——第 1 段填左栏、第 2 段填右栏，满 2 段换下一页
  const segs = parseWordQuestions(content);
  const totalPages = Math.max(1, Math.ceil(segs.length / 2));
  $freeCountTip.textContent = segs.length ? `共 ${totalPages} 页` : '空内容';

  for (let p = 0; p < totalPages; p++) {
    const left = segs[p * 2] || '';
    const right = segs[p * 2 + 1] || '';
    const page = document.createElement('div');
    page.className = 'page page-free cols-2';
    const cells = `
      <div class="witem left-col"><div class="wbody"></div></div>
      <div class="witem right-col"><div class="wbody"></div></div>`;
    page.innerHTML = headerHtml(cells);
    const bodies = page.querySelectorAll('.wbody');
    fillWbody(bodies[0], left);
    fillWbody(bodies[1], right);
    $pages.appendChild(page);
  }
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// 处理 **bold** / *italic*，同时 HTML 转义其余字符（不破坏 LaTeX 命令的 \ 等）
function applyMarkdown(s) {
  // 行内代码 `code`：先抽出占位，避免其中的 * _ 被粗斜体规则破坏
  const codes = [];
  // 用户显式写 <br> / <br/> 作为换行标识：先占位，转义后再还原（避免被当成 HTML 标签整体过滤）
  const brs = [];
  let out = s.replace(/<br\s*\/?>/gi, () => {
    const idx = brs.length;
    brs.push(true);
    return `\u0002BR${idx}\u0002`;
  }).replace(/`([^`]+)`/g, (_, c) => {
    const idx = codes.length;
    codes.push(c);
    return `\u0001CODE${idx}\u0001`;
  });
  out = escapeHtml(out);
  out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\*(.+?)\*/g, '<em>$1</em>');
  out = out.replace(/\u0001CODE(\d+)\u0001/g, (_, i) =>
    `<code class="md-code">${escapeHtml(codes[Number(i)])}</code>`);
  out = out.replace(/\u0002BR(\d+)\u0002/g, '<br>');
  return out;
}

// 将文本渲染为富文本 HTML：
// 块级：表格、标题、分割线、引用、有序/无序列表、普通段落
// 行内：公式 $...$、行内代码 `code`、**粗体** *斜体*
function formatRichText(text) {
  // 先提取表格块并占位，避免被公式/Markdown 处理干扰
  const tables = [];
  // 匹配连续的以 | 开头行；用 [^\n] 防止 . 跨行/贪婪误吃；末尾换行可选（最后一行可能无 \n）
  const TABLE_RE = /(?:^[ \t]*\|[^\n]*\|[ \t]*(?:\n|$))+/gm;
  const blocks = [];
  let tmp = text.replace(TABLE_RE, (m) => {
    const lines = m.split('\n').filter(l => l.trim().length > 0);
    // 必须至少 2 行，且第二行是分隔行 | --- | --- |
    if (lines.length < 2 || !/^\|?\s*:?-{2,}/.test(lines[1].trim())) return m;
    const idx = blocks.length;
    blocks.push(buildTableHtml(lines));
    return `\u0000BLK${idx}\u0000`;
  });

  let out = renderBlocks(tmp, blocks);
  return out;
}

// 块级解析：按行处理，识别标题/分割线/引用/列表，其余按段落
function renderBlocks(text, blocks) {
  const lines = text.split('\n');
  const html = [];
  let i = 0;
  let listOpen = null; // null | 'ul' | 'ol'
  const closeList = () => { if (listOpen) { html.push(`</${listOpen}>`); listOpen = null; } };

  while (i < lines.length) {
    let line = lines[i];

    // 已占位的表格/块
    const blk = line.match(/^\u0000BLK(\d+)\u0000$/);
    if (blk) { closeList(); html.push(blocks[Number(blk[1])] || ''); i++; continue; }

    const trimmed = line.trim();

    // 空行
    if (trimmed === '') { closeList(); i++; continue; }

    // 分割线 --- / *** / ___
    if (/^(\-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      closeList();
      html.push('<hr class="md-hr" />');
      i++;
      continue;
    }

    // 标题 # ~ ######
    const hm = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (hm) {
      closeList();
      const level = hm[1].length;
      html.push(`<h${level} class="md-h md-h${level}">${formatInline(hm[2])}</h${level}>`);
      i++;
      continue;
    }

    // 引用 > （支持多行连续）
    if (/^>\s?/.test(trimmed)) {
      closeList();
      const quote = [];
      while (i < lines.length && /^>\s?/.test(lines[i].trim())) {
        quote.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      html.push(`<blockquote class="md-quote">${formatInline(quote.join('<br>'))}</blockquote>`);
      continue;
    }

    // 无序列表 - / * / +
    const um = trimmed.match(/^[-*+]\s+(.*)$/);
    if (um) {
      if (listOpen !== 'ul') { closeList(); html.push('<ul class="md-ul">'); listOpen = 'ul'; }
      html.push(`<li>${formatInline(um[1])}</li>`);
      i++;
      continue;
    }

    // 有序列表 1. 2) 等
    const om = trimmed.match(/^\d+[.)]\s+(.*)$/);
    if (om) {
      if (listOpen !== 'ol') { closeList(); html.push('<ol class="md-ol">'); listOpen = 'ol'; }
      html.push(`<li>${formatInline(om[1])}</li>`);
      i++;
      continue;
    }

    // 普通段落（连续非空、非特殊行合并，内部换行用 <br>）
    closeList();
    const para = [trimmed];
    i++;
    while (i < lines.length && lines[i].trim() !== '' &&
           !/^(\-{3,}|\*{3,}|_{3,})$/.test(lines[i].trim()) &&
           !/^#{1,6}\s+/.test(lines[i].trim()) &&
           !/^>\s?/.test(lines[i].trim()) &&
           !/^[-*+]\s+/.test(lines[i].trim()) &&
           !/^\d+[.)]\s+/.test(lines[i].trim()) &&
           !/^\u0000BLK\d+\u0000$/.test(lines[i].trim())) {
      para.push(lines[i].trim());
      i++;
    }
    html.push(`<p class="md-p">${formatInline(para.join('<br>'))}</p>`);
  }
  closeList();
  return html.join('');
}

// 行内格式：$...$ 公式 + `code` 行内代码 + **粗体** + *斜体*
function formatInline(text) {
  // 先按公式分段，公式段保持原样
  const parts = text.split(/(\$[^$]+\$)/g);
  return parts.map(p => {
    if (/^\$[^$]+\$$/.test(p)) {
      return escapeHtml(p);
    }
    return applyMarkdown(p);
  }).join('');
}

// 把 Markdown 表格行数组转为 HTML <table>，单元格内支持公式/粗体/斜体
function buildTableHtml(lines) {
  // 解析每行的单元格
  const parseRow = (line) => {
    let s = line.trim();
    if (s.startsWith('|')) s = s.slice(1);
    if (s.endsWith('|')) s = s.slice(0, -1);
    return s.split('|').map(c => c.trim());
  };
  const header = parseRow(lines[0]);
  const body = lines.slice(2).map(parseRow);
  let html = '<table class="md-table"><thead><tr>';
  header.forEach(h => { html += `<th>${formatInline(h)}</th>`; });
  html += '</tr></thead><tbody>';
  body.forEach(row => {
    html += '<tr>';
    // 列数对齐
    for (let i = 0; i < header.length; i++) {
      html += `<td>${formatInline(row[i] || '')}</td>`;
    }
    html += '</tr>';
  });
  html += '</tbody></table>';
  return html;
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

    // 文件名：计算题="计算题_日期"；应用题/自由模式="标题_副标题"
    let filename;
    if (currentMode === 'calc') {
      const datePart = $date.value || new Date().toISOString().slice(0, 10);
      filename = '计算题_' + datePart + '.pdf';
    } else if (currentMode === 'word') {
      const title = ($wordTitle.value || '应用题').trim();
      const sub = ($wordDate.value || '').trim();
      filename = (sub ? (title + '_' + sub) : title) + '.pdf';
    } else {
      const title = ($freeTitle.value || '自由模式').trim();
      const sub = ($freeDate.value || '').trim();
      filename = (sub ? (title + '_' + sub) : title) + '.pdf';
    }

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
