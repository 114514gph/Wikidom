// MediaWiki / Wikitext 渲染器
// 支持大部分常用语法：标题、文本格式、链接、图片、表格、模板、HTML、魔术字
import DOMPurify from 'dompurify';

// 主渲染函数
export function renderMediaWiki(text, options = {}) {
  if (!text) return '';

  const context = {
    templates: options.templates || {},
    pageTitle: options.pageTitle || '',
    namespace: options.namespace || 'main',
  };

  let html = text;

  // 1. 去除注释
  html = html.replace(/<!--[\s\S]*?-->/g, '');

  // 2. 处理 __魔术字__
  html = html.replace(/__NOEDITSECTION__/g, '');
  html = html.replace(/__TOC__/g, '<div class="toc-placeholder"></div>');
  html = html.replace(/__NOTOC__/g, '');
  html = html.replace(/__FORCETOC__/g, '<div class="toc-placeholder"></div>');

  // 3. 处理 {{DISPLAYTITLE:xxx}}
  let displayTitle = '';
  html = html.replace(/\{\{DISPLAYTITLE:\s*([^}]+)\s*\}\}/gi, (m, title) => {
    displayTitle = title.trim();
    return '';
  });

  // 4. 处理模板（递归展开，最多 20 层防止无限递归）
  html = expandTemplates(html, context, 20);

  // 5. 处理 <nowiki> 占位（暂时保护起来）
  const nowikiBlocks = [];
  html = html.replace(/<nowiki>([\s\S]*?)<\/nowiki>/gi, (m, content) => {
    const index = nowikiBlocks.length;
    nowikiBlocks.push(escapeHtml(content));
    return `\x00NOWIKI${index}\x00`;
  });

  const preBlocks = [];
  html = html.replace(/<pre>([\s\S]*?)<\/pre>/gi, (m, content) => {
    const index = preBlocks.length;
    preBlocks.push(escapeHtml(content));
    return `\x00PRE${index}\x00`;
  });

  const codeBlocks = [];
  html = html.replace(/<code>([\s\S]*?)<\/code>/gi, (m, content) => {
    const index = codeBlocks.length;
    codeBlocks.push(escapeHtml(content));
    return `\x00CODE${index}\x00`;
  });

  // 6. 处理 HTML 标签（style、div、span、center 等）- 保留，不转义
  // （DOMPurify 最后会过滤危险标签）

  // 7. 处理表格
  html = renderTables(html);

  // 8. 处理标题
  html = renderHeadings(html);

  // 9. 处理水平线
  html = html.replace(/^----+$/gm, '<hr>');

  // 10. 处理列表
  html = renderLists(html);

  // 11. 处理文本格式
  html = renderTextFormatting(html);

  // 12. 处理链接
  html = renderLinks(html);

  // 13. 处理图片
  html = renderImages(html);

  // 14. 处理段落和换行
  html = renderParagraphs(html);

  // 15. 还原 nowiki/pre/code
  nowikiBlocks.forEach((content, i) => {
    html = html.replace(`\x00NOWIKI${i}\x00`, `<span class="nowiki">${content}</span>`);
  });
  preBlocks.forEach((content, i) => {
    html = html.replace(`\x00PRE${i}\x00`, `<pre>${content}</pre>`);
  });
  codeBlocks.forEach((content, i) => {
    html = html.replace(`\x00CODE${i}\x00`, `<code>${content}</code>`);
  });

  // 16. 净化 HTML
  const clean = DOMPurify.sanitize(html, {
    ADD_TAGS: ['style', 'details', 'summary', 'ruby', 'rt', 'rp', 'marquee', 'blink', 'font', 'center', 'big', 'small', 'strike', 'tt'],
    ADD_ATTR: ['target', 'style', 'class', 'id', 'colspan', 'rowspan', 'align', 'valign', 'width', 'height', 'bgcolor', 'color', 'face', 'size', 'data-*', 'aria-*'],
  });

  return { html: clean, displayTitle };
}

// 递归展开模板
function expandTemplates(text, context, depth) {
  if (depth <= 0) return text;

  // 匹配 {{模板名|参数1=值1|参数2=值2|...}}
  const templateRegex = /\{\{([^{}]+)\}\}/g;

  let result = text;
  let changed = true;
  let iterations = 0;

  while (changed && iterations < 30) {
    changed = false;
    iterations++;
    result = result.replace(templateRegex, (match, inner) => {
      // 解析模板名和参数
      const parts = splitTemplateParams(inner);
      const templateName = parts[0].trim();
      const params = {};
      const positionalParams = [];

      for (let i = 1; i < parts.length; i++) {
        const part = parts[i];
        const eqIndex = part.indexOf('=');
        if (eqIndex !== -1) {
          const key = part.substring(0, eqIndex).trim();
          const value = part.substring(eqIndex + 1).trim();
          params[key] = value;
        } else {
          positionalParams.push(part.trim());
        }
      }

      // 内置变量/魔术字
      const lowerName = templateName.toLowerCase();
      if (lowerName === 'pagename') return context.pageTitle;
      if (lowerName === 'namespace') return context.namespace;
      if (lowerName === '!') return '|';
      if (lowerName === 'curlybraceopen' || lowerName === '{{') return '{{';
      if (lowerName === 'curlybraceclose' || lowerName === '}}') return '}}';

      // 查找模板
      const templateContent = findTemplate(templateName, context.templates);
      if (templateContent !== null) {
        changed = true;
        // 替换模板参数
        let expanded = templateContent;
        expanded = expanded.replace(/\{\{\{\s*(\d+)\s*\}\}\}/g, (m, num) => {
          return positionalParams[parseInt(num) - 1] || '';
        });
        expanded = expanded.replace(/\{\{\{\s*(\w+)\s*\}\}\}/g, (m, key) => {
          return params[key] || '';
        });
        // {{{参数名|默认值}}
        expanded = expanded.replace(/\{\{\{\s*(\w+)\s*\|([^}]*)\}\}\}/g, (m, key, defaultVal) => {
          return params[key] !== undefined ? params[key] : defaultVal;
        });
        return expanded;
      }

      // 找不到模板，显示模板占位框
      return `<span class="template-missing" data-template="${escapeHtml(templateName)}">模板: ${escapeHtml(templateName)}</span>`;
    });
  }

  return result;
}

// 拆分模板参数（考虑嵌套链接和模板中的 |）
function splitTemplateParams(str) {
  const parts = [];
  let current = '';
  let depth = 0;
  let inLink = false;

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === '[' && str[i + 1] === '[') { inLink = true; current += '['; i++; continue; }
    if (ch === ']' && str[i + 1] === ']') { inLink = false; current += ']'; i++; continue; }
    if (ch === '{') { depth++; current += ch; continue; }
    if (ch === '}') { depth--; current += ch; continue; }
    if (ch === '|' && depth === 0 && !inLink) {
      parts.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  parts.push(current);
  return parts;
}

// 查找模板（支持多种命名方式）
function findTemplate(name, templates) {
  if (!templates) return null;

  // 尝试多种形式
  const variants = [
    name,
    `Template:${name}`,
    `模板:${name}`,
    name.replace(/^Template:/i, ''),
    name.replace(/^模板:/, ''),
  ];

  for (const variant of variants) {
    if (templates[variant] !== undefined) return templates[variant];
    // 大小写不敏感
    for (const key of Object.keys(templates)) {
      if (key.toLowerCase() === variant.toLowerCase()) return templates[key];
    }
  }

  return null;
}

// 渲染表格
function renderTables(text) {
  const lines = text.split('\n');
  const result = [];
  let inTable = false;
  let inRow = false;
  let isHeader = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('{|')) {
      // 表格开始
      const attrs = parseTableAttributes(trimmed.substring(2));
      result.push(`<table${attrs}>`);
      inTable = true;
      continue;
    }

    if (inTable && trimmed === '|}') {
      if (inRow) result.push(isHeader ? '</tr>' : '</tr>');
      result.push('</table>');
      inTable = false;
      inRow = false;
      continue;
    }

    if (inTable && (trimmed.startsWith('|-') || trimmed === '|-')) {
      if (inRow) result.push('</tr>');
      result.push('<tr>');
      inRow = true;
      isHeader = false;
      continue;
    }

    if (inTable && trimmed.startsWith('|+')) {
      result.push(`<caption>${trimmed.substring(2).trim()}</caption>`);
      continue;
    }

    if (inTable && trimmed.startsWith('!')) {
      // 表头单元格
      if (!inRow) { result.push('<tr>'); inRow = true; }
      const cells = splitTableRow(trimmed.replace(/^!+/, ''), '!');
      cells.forEach(cell => {
        const { attrs, content } = parseCellAttributes(cell);
        result.push(`<th${attrs}>${content}</th>`);
      });
      isHeader = true;
      continue;
    }

    if (inTable && trimmed.startsWith('|')) {
      if (!inRow) { result.push('<tr>'); inRow = true; }
      const cells = splitTableRow(trimmed.substring(1), '|');
      cells.forEach(cell => {
        const { attrs, content } = parseCellAttributes(cell);
        result.push(`<td${attrs}>${content}</td>`);
      });
      continue;
    }

    result.push(line);
  }

  return result.join('\n');
}

function splitTableRow(str, delimiter) {
  const parts = [];
  let current = '';
  let depth = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === '[' || ch === '{') depth++;
    if (ch === ']' || ch === '}') depth--;
    if (ch === delimiter && depth === 0 && str[i - 1] === delimiter) {
      parts.push(current);
      current = '';
      i++;
      continue;
    }
    current += ch;
  }
  if (current.trim()) parts.push(current);
  return parts.length ? parts : [str];
}

function parseTableAttributes(str) {
  return parseWikiAttrs(str);
}

function parseCellAttributes(str) {
  const match = str.match(/^([^|]*?)\|(.*)$/s);
  if (match) {
    return { attrs: parseWikiAttrs(match[1]), content: match[2] };
  }
  return { attrs: '', content: str };
}

function parseWikiAttrs(str) {
  if (!str || !str.trim()) return '';
  let attrs = ' ' + str.trim();
  // 转换常见属性
  attrs = attrs.replace(/\bclass="([^"]*)"/g, 'class="$1"');
  attrs = attrs.replace(/\bstyle="([^"]*)"/g, 'style="$1"');
  attrs = attrs.replace(/\bwidth=(\S+)/g, 'width="$1"');
  attrs = attrs.replace(/\bcolspan=(\d+)/gi, 'colspan="$1"');
  attrs = attrs.replace(/\browspan=(\d+)/gi, 'rowspan="$1"');
  attrs = attrs.replace(/\balign=(\S+)/gi, 'align="$1"');
  attrs = attrs.replace(/\bvalign=(\S+)/gi, 'valign="$1"');
  attrs = attrs.replace(/\bbgcolor=(\S+)/gi, 'bgcolor="$1"');
  return attrs;
}

// 渲染标题
function renderHeadings(text) {
  return text
    .replace(/^======\s*(.+?)\s*======\s*$/gm, '<h6>$1</h6>')
    .replace(/^=====\s*(.+?)\s*=====\s*$/gm, '<h5>$1</h5>')
    .replace(/^====\s*(.+?)\s*====\s*$/gm, '<h4>$1</h4>')
    .replace(/^===\s*(.+?)\s*===\s*$/gm, '<h3>$1</h3>')
    .replace(/^==\s*(.+?)\s*==\s*$/gm, '<h2>$1</h2>')
    .replace(/^=\s*(.+?)\s*=\s*$/gm, '<h1>$1</h1>');
}

// 渲染列表
function renderLists(text) {
  const lines = text.split('\n');
  const result = [];
  const listStack = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const unorderedMatch = line.match(/^(\*+)\s*(.*)$/);
    const orderedMatch = line.match(/^(#+)\s*(.*)$/);
    const match = unorderedMatch || orderedMatch;

    if (match) {
      const level = match[1].length;
      const content = match[2];
      const type = unorderedMatch ? 'ul' : 'ol';

      while (listStack.length < level) {
        const t = listStack.length === 0 ? type : type;
        result.push(`<${t}>`);
        listStack.push(t);
      }
      while (listStack.length > level) {
        const t = listStack.pop();
        result.push(`</${t}>`);
      }
      if (listStack[listStack.length - 1] !== type) {
        const oldT = listStack.pop();
        result.push(`</${oldT}>`);
        result.push(`<${type}>`);
        listStack.push(type);
      }
      result.push(`<li>${content}</li>`);
    } else {
      while (listStack.length > 0) {
        const t = listStack.pop();
        result.push(`</${t}>`);
      }
      result.push(line);
    }
  }
  while (listStack.length > 0) {
    result.push(`</${listStack.pop()}>`);
  }
  return result.join('\n');
}

// 渲染文本格式
function renderTextFormatting(text) {
  // 粗斜体先
  text = text.replace(/'''''(.+?)'''''/g, '<strong><em>$1</em></strong>');
  text = text.replace(/'''(.+?)'''/g, '<strong>$1</strong>');
  text = text.replace(/''(.+?)''/g, '<em>$1</em>');
  // 删除线
  text = text.replace(/<s>(.+?)<\/s>/gi, '<s>$1</s>');
  text = text.replace(/<strike>(.+?)<\/strike>/gi, '<s>$1</s>');
  // 下划线
  text = text.replace(/<u>(.+?)<\/u>/gi, '<u>$1</u>');
  // 等宽
  text = text.replace(/<tt>(.+?)<\/tt>/gi, '<tt>$1</tt>');
  // <br>
  text = text.replace(/<br\s*\/?>/gi, '<br>');
  return text;
}

// 渲染链接
function renderLinks(text) {
  // 外部链接 [http://xxx 显示文本]
  text = text.replace(/\[((?:https?|ftp):\/\/[^\s\]]+)\s+([^\]]+)\]/g,
    '<a href="$1" target="_blank" rel="noopener" class="external-link">$2</a>');
  text = text.replace(/\[((?:https?|ftp):\/\/[^\s\]]+)\]/g,
    '<a href="$1" target="_blank" rel="noopener" class="external-link autonumber">$1</a>');

  // 内部链接 [[页面名]]
  text = text.replace(/\[\[([^\]|#]+)(#[^\]|]*)?(\|([^\]]+))?\]\]/g, (m, title, anchor, pipe, label) => {
    title = title.trim();
    const display = label ? label.trim() : title.trim();
    const anchorStr = anchor ? anchor.trim() : '';
    return `<a href="/wiki/${encodeURIComponent(title)}${anchorStr}" class="internal-link">${display}</a>`;
  });

  return text;
}

// 渲染图片
function renderImages(text) {
  // [[File:xxx.png|参数|...]] / [[文件:xxx.png|...]] / [[Image:xxx.png|...]]
  text = text.replace(/\[\[(?:File|文件|Image|图片):([^\]|]+)(\|[^\]]*)?\]\]/gi, (m, filename, paramStr) => {
    const params = (paramStr || '').split('|').map(s => s.trim()).filter(Boolean);
    let caption = '';
    let size = '';
    let align = '';
    let isThumb = false;

    for (const p of params) {
      if (/^\d+px$/i.test(p)) size = p;
      else if (/^thumb(nail)?$/i.test(p)) isThumb = true;
      else if (/^(left|right|center|none)$/i.test(p)) align = p.toLowerCase();
      else if (/^(frame|framed)$/i.test(p)) isThumb = true;
      else if (!/^link=/.test(p) && !/^alt=/.test(p) && !/^class=/.test(p)) caption = p;
    }

    // 构建图片 URL - 通过代理访问 Fandom
    const encodedFile = encodeURIComponent(filename.replace(/ /g, '_'));
    const imgSrc = `/api/proxy/image?url=${encodeURIComponent(`https://static.wikia.nocookie.net/backrooms/images/${getImageHashPath(filename)}/${encodedFile}/revision/latest`)}`;

    const sizeAttr = size ? ` width="${size.replace('px', '')}"` : '';
    const alignClass = align ? ` float-${align}` : '';

    if (isThumb || caption) {
      return `<figure class="thumb ${alignClass}"><img src="${imgSrc}" alt="${escapeHtml(caption || filename)}" loading="lazy"${sizeAttr}><figcaption>${caption}</figcaption></figure>`;
    }
    return `<img src="${imgSrc}" alt="${escapeHtml(filename)}" loading="lazy" class="wiki-image${alignClass}"${sizeAttr}>`;
  });

  return text;
}

// 模拟 Fandom 图片哈希路径（无法计算 MD5 路径时用首字母兜底，实际会通过代理处理）
function getImageHashPath(filename) {
  // MediaWiki 路径是 MD5 哈希首字母/前两位，这里返回占位，由代理或 404 处理
  const first = filename.charAt(0).toLowerCase();
  return `${first}/${first}${first}`;
}

// 渲染段落
function renderParagraphs(text) {
  // 按空行分段
  const blocks = text.split(/\n{2,}/);
  return blocks.map(block => {
    const trimmed = block.trim();
    if (!trimmed) return '';
    // 已经是块级元素的不包 <p>
    if (/^<(h[1-6]|ul|ol|table|pre|div|center|figure|blockquote|hr|style|figure|p)/i.test(trimmed)) {
      return block.replace(/\n/g, '<br>');
    }
    // 内部单行换行变 <br>
    return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
  }).join('\n');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
