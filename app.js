// ===== 数学题排版工具 =====
// 单个大输入框，题目之间用空行或 --- 分隔
const STORAGE_KEY = 'yoyo_math_bulk_v2';
const PER_PAGE = 6;

// ---- DOM 引用 ----
const $input = document.getElementById('bulkInput');
const $count = document.getElementById('countTip');
const $pages = document.getElementById('pageContainer');

// ---- 默认示例 ----
const DEFAULT_TEXT =
`计算 $\\dfrac{3}{4} + \\dfrac{2}{3}$ 的结果。

化简：$(x^2 - 4) \\div (x - 2)$。

求方程 $x^2 - 5x + 6 = 0$ 的解。

计算 $\\sqrt{144} + \\sqrt{81}$。

已知 $a=2, b=3$，求 $a^2 + 2ab + b^2$ 的值。

解不等式组 $\\begin{cases} 2x - 5 < 7 \\\\ x + 1 \\geq 0 \\end{cases}$。

比较 $\\dfrac{5}{8}$ 与 $\\dfrac{2}{3}$ 的大小。

求 $\\sqrt[3]{27}$ 的值。`;

// ---- 加载 ----
function loadText() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== null) return raw;
  } catch (e) {}
  return DEFAULT_TEXT;
}
function saveText() {
  localStorage.setItem(STORAGE_KEY, $input.value);
}

// ---- 解析题目：按换行分隔，每行一道题 ----
function parseQuestions(text) {
  // 先按 --- 分隔（兼容旧格式）
  let parts = text.split(/\n\s*-{3,}\s*\n/);
  // 再按每一行拆分，过滤空行
  let questions = [];
  parts.forEach(p => {
    p.split('\n').forEach(s => {
      s = s.trim();
      if (s) questions.push(s);
    });
  });
  return questions;
}

// ---- 预览渲染（防抖）----
let previewTimer = null;
function schedulePreview() {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(renderPreview, 150);
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderPreview() {
  const questions = parseQuestions($input.value);
  $count.textContent = `共 ${questions.length} 题`;
  $pages.innerHTML = '';

  if (questions.length === 0) {
    $pages.innerHTML = '<div style="color:#8a9099;padding:40px;text-align:center;">左侧输入题目后在此预览</div>';
    return;
  }

  const totalPages = Math.ceil(questions.length / PER_PAGE);
  for (let p = 0; p < totalPages; p++) {
    const page = document.createElement('div');
    page.className = 'page';
    const start = p * PER_PAGE;
    const slice = questions.slice(start, start + PER_PAGE);
    slice.forEach(q => {
      const item = document.createElement('div');
      item.className = 'qitem';
      item.innerHTML = `<span class="qbody">${escapeHtml(q)}</span>`;
      page.appendChild(item);
    });
    // 不足 6 题用空白占位，保持网格高度一致
    for (let k = slice.length; k < PER_PAGE; k++) {
      const ph = document.createElement('div');
      ph.className = 'qitem empty';
      ph.innerHTML = '&nbsp;';
      page.appendChild(ph);
    }
    $pages.appendChild(page);
  }

  // 重新渲染 MathJax
  if (window.MathJax && window.MathJax.typesetPromise) {
    window.MathJax.typesetPromise($pages).catch(err => console.warn('MathJax:', err));
  }
  // 同时渲染帮助区公式
  const help = document.querySelector('.syntax-help');
  if (help && window.MathJax && window.MathJax.typesetPromise) {
    window.MathJax.typesetPromise(help).catch(() => {});
  }
}

// ---- 导出 PDF（MathJax CHTML → html2canvas 直接截取）----
async function exportPDF() {
  const $btn = document.getElementById('exportBtn');
  const questions = parseQuestions($input.value);
  if (questions.length === 0) { alert('请先输入题目'); return; }

  if (typeof html2canvas === 'undefined') { alert('截图库未加载，请检查网络'); return; }
  if (!window.jspdf || !window.jspdf.jsPDF) { alert('PDF 库未加载，请检查网络'); return; }

  // 等待 MathJax CHTML 渲染完成
  $btn.disabled = true;
  $btn.textContent = '渲染公式中...';
  try {
    if (window.MathJax && window.MathJax.typesetPromise) {
      await window.MathJax.typesetPromise($pages);
    }
    // CHTML 字体需要额外加载时间
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
        allowTaint: true,    // 允许跨域字体
        backgroundColor: '#ffffff',
        logging: false,
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, 0, A4_W, A4_H, undefined, 'FAST');
    }

    const filename = '数学题_' + new Date().toISOString().slice(0, 10) + '.pdf';
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

// ---- 事件绑定 ----
$input.addEventListener('input', () => { saveText(); schedulePreview(); });
document.getElementById('clearBtn').addEventListener('click', () => {
  if (confirm('确定清空所有题目吗？')) {
    $input.value = '';
    saveText(); schedulePreview();
    $input.focus();
  }
});
document.getElementById('exportBtn').addEventListener('click', exportPDF);

// 支持 Tab 缩进
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
renderPreview();
