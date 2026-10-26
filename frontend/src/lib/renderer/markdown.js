// Markdown 渲染器 - 基于 marked
import { marked } from 'marked';
import DOMPurify from 'dompurify';

// 配置 marked
marked.setOptions({
  gfm: true,
  breaks: true,
  headerIds: true,
  mangle: false,
});

export function renderMarkdown(text, options = {}) {
  if (!text) return '';

  // 预处理内部链接
  let processed = preprocessInternalLinks(text);

  // 渲染 Markdown
  let html = marked.parse(processed);

  // 处理内部链接
  html = postprocessInternalLinks(html);

  // 净化 HTML，允许一些常用的标签和样式
  const clean = DOMPurify.sanitize(html, {
    ADD_TAGS: ['style', 'iframe', 'details', 'summary', 'ruby', 'rt', 'rp'],
    ADD_ATTR: ['target', 'style', 'class', 'id', 'colspan', 'rowspan', 'data-*'],
  });

  return clean;
}

// 预处理内部链接
function preprocessInternalLinks(text) {
  // [[页面名]] -> [页面名](/wiki/页面名)
  text = text.replace(/\[\[([^\]|]+)\]\]/g, (match, title) => {
    const slug = title.trim();
    return `[${title.trim()}](/wiki/${encodeURIComponent(slug)})`;
  });

  // [[页面名|显示文本]]
  text = text.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, (match, title, label) => {
    const slug = title.trim();
    return `[${label.trim()}](/wiki/${encodeURIComponent(slug)})`;
  });

  return text;
}

// 后处理内部链接
function postprocessInternalLinks(html) {
  // 给内部链接添加类名
  html = html.replace(
    /href="\/wiki\/([^"]+)"/g,
    'href="/wiki/$1" class="internal-link"'
  );
  return html;
}
