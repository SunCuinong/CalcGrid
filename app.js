// ===== 数学题排版工具 =====
const STORAGE_KEY = 'yoyo_math_bulk_v2';
const PER_PAGE = 6;

const $input = document.getElementById('bulkInput');
const $count = document.getElementById('countTip');
const $pages = document.getElementById('pageContainer');
const $date = document.getElementById('datePicker');

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

// 按换行分隔，每行一道题，空行 / --- 自动跳过
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

function renderPreview() {
  const questions = parseQuestions($input.value);
  $count.textContent = `共 ${questions.length} 题`;
  $pages.innerHTML = '';

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

    const header = document.createElement('div');
    header.className = 'page-header';
    header.innerHTML = `<div class="page-title">Calculation Worksheet <span class="dot">·</span><span class="date">${dateStr}</span></div><hr class="page-line" />`;
    page.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'page-grid';
    const start = p * PER_PAGE;
    const slice = questions.slice(start, start + PER_PAGE);

    slice.forEach((q, i) => {
      const item = document.createElement('div');
      item.className = 'qitem' + (i < 3 ? ' left-col' : ' right-col');
      const span = document.createElement('span');
      span.className = 'qbody';
      span.textContent = q;     // 不转义，原样交给 MathJax
      item.appendChild(span);
      grid.appendChild(item);
    });
    for (let k = slice.length; k < PER_PAGE; k++) {
      const ph = document.createElement('div');
      ph.className = 'qitem empty' + (k < 3 ? ' left-col' : ' right-col');
      ph.innerHTML = '&nbsp;';
      grid.appendChild(ph);
    }
    page.appendChild(grid);
    $pages.appendChild(page);
  }

  // 调用 MathJax 渲染
  typesetMath();
}

function typesetMath() {
  if (window.MathJax && window.MathJax.typesetPromise) {
    return window.MathJax.typesetPromise([$pages]).catch(err => console.warn('MathJax typeset:', err));
  }
  return Promise.resolve();
}

// MathJax 就绪回调（由 index.html 中 startup.ready 同步触发）
window._onMathJaxReady = () => {
  console.log('[MathJax] ready');
  typesetMath();
};

// 兜底：脚本可能不在 head 里，轮询检测
(function waitMJ() {
  if (window.MathJax && window.MathJax.typesetPromise) {
    typesetMath();
    return;
  }
  setTimeout(waitMJ, 200);
})();

// ---- 事件绑定 ----
$input.addEventListener('input', () => { saveText(); schedulePreview(); });
$date.addEventListener('change', () => { renderPreview(); });
document.getElementById('clearBtn').addEventListener('click', () => {
  if (confirm('确定清空所有题目吗？')) {
    $input.value = '';
    saveText(); schedulePreview();
    $input.focus();
  }
});
document.getElementById('refreshBtn').addEventListener('click', () => {
  renderPreview();
});
document.getElementById('exportBtn').addEventListener('click', exportPDF);

// Tab 缩进
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
  const questions = parseQuestions($input.value);
  if (questions.length === 0) { alert('请先输入题目'); return; }

  if (typeof html2canvas === 'undefined') { alert('截图库未加载，请检查网络'); return; }
  if (!window.jspdf || !window.jspdf.jsPDF) { alert('PDF 库未加载，请检查网络'); return; }

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
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const pageEls = $pages.querySelectorAll('.page');
    const A4_W = 210, A4_H = 297;

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

    const filename = '数学题_' + ($date.value || new Date().toISOString().slice(0, 10)) + '.pdf';
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