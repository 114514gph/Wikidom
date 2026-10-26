// WikiDot 语法渲染器
// 支持 WikiDot (Wikidot) 常用语法
import DOMPurify from 'dompurify';

export function renderWikidot(text, options = {}) {
  if (!text) return '';

  let html = text;

  // 1. 注释
  html = html.replace(/^\[\[!--[\s\S]*?--\]\]$/gm, '');

  // 2. 保护代码块
  const codeBlocks = [];
  html = html.replace(/^\[\[code(?:\s+type="([^"]*)")?\]\]\n?([\s\S]*?)\n?\[\[\/code\]\]$/gm, (m, type, content) => {
    const i = codeBlocks.length;
    codeBlocks.push(escapeHtml(content));
    return `\x00CODE${i}\x00`;
  });

  // 3. 处理 WikiDot 模块（简单处理，不解析模块内容）
  html = html.replace(/^\[\[module\s+[^\]]*\]\][\s\S]*?\[\[\/module\]\]$/gm, '');

  // 4. 处理 div/span/collapsible 等块
  html = html.replace(/^\[\[div\s+([^\]]*)\]\]$/gm, (m, attrs) => `<div ${convertWikidotAttrs(attrs)}>`);
  html = html.replace(/^\[\[\/div\]\]$/gm, '</div>');
  html = html.replace(/\[\[span\s+([^\]]*)\]\]([\s\S]*?)\[\[\/span\]\]/g, (m, attrs, content) =>
    `<span ${convertWikidotAttrs(attrs)}>${content}</span>`);

  // 折叠块
  html = html.replace(/^\[\[collapsible\s+([^\]]*)\]\]$/gm, (m, attrs) => {
    const showMatch = attrs.match(/show="([^"]*)"/);
    const hideMatch = attrs.match(/hide="([^"]*)"/);
    const showText = showMatch ? showMatch[1] : '显示更多';
    const hideText = hideMatch ? hideMatch[1] : '收起';
    return `<details class="collapsible"><summary>${showText}</summary>`;
  });
  html = html.replace(/^\[\[\/collapsible\]\]$/gm, '</details>');

  // 5. 标题（WikiDot 用 + 号）
  html = html
    .replace(/^\+\+\+\+\+\+\s*(.+)$/gm, '<h6>$1</h6>')
    .replace(/^\+\+\+\+\+\s*(.+)$/gm, '<h5>$1</h5>')
    .replace(/^\+\+\+\+\s*(.+)$/gm, '<h4>$1</h4>')
    .replace(/^\+\+\+\s*(.+)$/gm, '<h3>$1</h3>')
    .replace(/^\+\+\s*(.+)$/gm, '<h2>$1</h2>')
    .replace(/^\+\s*(.+)$/gm, '<h1>$1</h1>');

  // 6. 水平线
  html = html.replace(/^----+$/gm, '<hr>');

  // 7. 列表
  html = renderWikidotLists(html);

  // 8. 文本格式
  html = html
    .replace(/\/\/([^\/\n]+)\/\//g, '<em>$1</em>')      // 斜体
    .replace(/\*\*([^\*\n]+)\*\*/g, '<strong>$1</strong>') // 粗体
    .replace(/__([^_\n]+)__/g, '<u>$1</u>')               // 下划线
    .replace(/--([^-\n]+)--/g, '<s>$1</s>')               // 删除线
    .replace(/\{\{\.\.\.(.+?)\.\.\.\}\}/g, '<tt>$1</tt>') // 等宽
    .replace(/\^\{?([^\^\n]+)\}?\^/g, '<sup>$1</sup>')    // 上标
    .replace(/,\{?([^,\n]+)\}?,/g, '<sub>$1</sub>');      // 下标

  // 9. 颜色和字体
  html = html.replace(/##([0-9a-fA-F]{3,6})\|([^#]+)##/g, '<span style="color:#$1">$2</span>');
  html = html.replace(/%%([^%]+)\|([^%]+)%%/g, '<span style="$1">$2</span>');

  // 10. 链接
  // [[[页面名|显示文本]]]
  html = html.replace(/\[\[\[([^\]|#]+)(#[^\]|]*)?(\|([^\]]+))?\]\]\]/g, (m, title, anchor, pipe, label) => {
    title = title.trim();
    const display = label ? label.trim() : title.trim();
    const anchorStr = anchor ? anchor.trim() : '';
    return `<a href="/wiki/${encodeURIComponent(title)}${anchorStr}" class="internal-link">${display}</a>`;
  });

  // [*http://url 显示文本] 带星号的链接
  html = html.replace(/\[\*?(https?:\/\/[^\s\]]+)\s+([^\]]+)\]/g,
    '<a href="$1" target="_blank" rel="noopener" class="external-link">$2</a>');
  html = html.replace(/\[\*?(https?:\/\/[^\s\]]+)\]/g,
    '<a href="$1" target="_blank" rel="noopener" class="external-link">$1</a>');

  // 11. 图片
  html = html.replace(/\[\[image\s+([^\s\]]+)([^\]]*)?\]\]/gi, (m, src, paramStr) => {
    const params = (paramStr || '').split(/\s+/).filter(Boolean);
    let align = '';
    let width = '';
    let link = '';
    let alt = '';
    for (const p of params) {
      if (p.startsWith('width=')) width = p.substring(6);
      else if (p.startsWith('link=')) link = p.substring(5);
      else if (p.startsWith('alt=')) alt = p.substring(4);
      else if (['left', 'right', 'center'].includes(p)) align = p;
    }
    const widthAttr = width ? ` width="${width}"` : '';
    const alignClass = align ? ` float-${align}` : '';
    // 外部图片走代理
    let imgSrc = src;
    if (src.includes('wikia.nocookie.net')) {
      imgSrc = `/api/proxy/image?url=${encodeURIComponent(src)}`;
    }
    const img = `<img src="${imgSrc}" alt="${escapeHtml(alt)}" loading="lazy"${widthAttr} class="${alignClass}">`;
    return link ? `<a href="${link}">${img}</a>` : img;
  });

  // 12. 表格（WikiDot 用 || 分隔）
  html = renderWikidotTables(html);

  // 13. 引用块
  html = html.replace(/^>\s?(.*)$/gm, '<blockquote>$1</blockquote>');
  // 合并连续的 blockquote
  html = html.replace(/(<\/blockquote>\n<blockquote>)/g, '<br>');

  // 14. 段落和换行
  html = renderWikidotParagraphs(html);

  // 15. 还原代码块
  codeBlocks.forEach((content, i) => {
    html = html.replace(`\x00CODE${i}\x00`, `<pre><code>${content}</code></pre>`);
  });

  // 16. 净化
  const clean = DOMPurify.sanitize(html, {
    ADD_TAGS: ['style', 'details', 'summary', 'ruby', 'rt', 'rp', 'marquee', 'font', 'center', 'big', 'small', 'strike', 'tt', 'sup', 'sub'],
    ADD_ATTR: ['target', 'style', 'class', 'id', 'colspan', 'rowspan', 'align', 'valign', 'width', 'height', 'bgcolor', 'color', 'face', 'size', 'data-*'],
  });

  return clean;
}

function convertWikidotAttrs(str) {
  let s = str.trim();
  s = s.replace(/class="([^"]*)"/, 'class="$1"');
  s = s.replace(/style="([^"]*)"/, 'style="$1"');
  s = s.replace(/\bid="([^"]*)"/, 'id="$1"');
  return s;
}

function renderWikidotLists(text) {
  const lines = text.split('\n');
  const result = [];
  const stack = [];

  for (const line of lines) {
    const m = line.match(/^(\*+)\s*(.*)$/);
    const om = line.match(/^(#+)\s*(.*)$/);
    const match = m || om;
    if (match) {
      const level = match[1].length;
      const content = match[2];
      const type = m ? 'ul' : 'ol';
      while (stack.length < level) { result.push(`<${type}>`); stack.push(type); }
      while (stack.length > level) { result.push(`</${stack.pop()}>`); }
      result.push(`<li>${content}</li>`);
    } else {
      while (stack.length) result.push(`</${stack.pop()}>`);
      result.push(line);
    }
  }
  while (stack.length) result.push(`</${stack.pop()}>`);
  return result.join('\n');
}

function renderWikidotTables(text) {
  // WikiDot 简单表格：[[table]] ... [[/table]] 或 || 单元格
  text = text.replace(/^\[\[table([^\]]*)\]\]$/gm, (m, attrs) => `<table${convertWikidotAttrs(attrs)}>`);
  text = text.replace(/^\[\[\/table\]\]$/gm, '</table>');
  text = text.replace(/^\[\[row([^\]]*)\]\]$/gm, '<tr>');
  text = text.replace(/^\[\[\/row\]\]$/gm, '</tr>');
  text = text.replace(/^\[\[cell([^\]]*)\]\]/gm, (m, attrs) => `<td${convertWikidotAttrs(attrs)}>`);
  text = text.replace(/^\[\[\/cell\]\]$/gm, '</td>');
  text = text.replace(/^\[\[hcell([^\]]*)\]\]/gm, (m, attrs) => `<th${convertWikidotAttrs(attrs)}>`);
  text = text.replace(/^\[\[\/hcell\]\]$/gm, '</th>');

  // || 分隔的简单表格行
  const lines = text.split('\n');
  const out = [];
  let inSimpleTable = false;
  for (const line of lines) {
    if (line.trim().startsWith('||~') || line.trim().startsWith('||')) {
      if (!inSimpleTable) { out.push('<table class="wikidot-table">'); inSimpleTable = true; }
      const cells = line.split('||').slice(1, -1);
      out.push('<tr>');
      for (const cell of cells) {
        const isHeader = cell.startsWith('~');
        const content = isHeader ? cell.substring(1) : cell;
        out.push(isHeader ? `<th>${content}</th>` : `<td>${content}</td>`);
      }
      out.push('</tr>');
    } else {
      if (inSimpleTable) { out.push('</table>'); inSimpleTable = false; }
      out.push(line);
    }
  }
  if (inSimpleTable) out.push('</table>');
  return out.join('\n');
}

function renderWikidotParagraphs(text) {
  const blocks = text.split(/\n{2,}/);
  return blocks.map(block => {
    const trimmed = block.trim();
    if (!trimmed) return '';
    if (/^<(h[1-6]|ul|ol|table|pre|div|details|figure|blockquote|hr|style|tr|th|td)/i.test(trimmed)) {
      return block;
    }
    return `<p>${trimmed.replace(/\n/g, ' ')}</p>`;
  }).join('\n');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
