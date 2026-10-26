// 统一渲染入口
import { renderMarkdown } from './markdown.js';
import { renderMediaWiki } from './mediawiki.js';
import { renderWikidot } from './wikidot.js';
import { renderHtml } from './html.js';

/**
 * 渲染页面内容
 * @param {string} text - 原始文本
 * @param {string} syntax - 语法: markdown | mediawiki | wikidot | html
 * @param {object} options - 选项（templates、pageTitle、namespace 等）
 * @returns {{ html: string, displayTitle?: string }}
 */
export function render(text, syntax = 'markdown', options = {}) {
  switch (syntax) {
    case 'markdown':
      return { html: renderMarkdown(text, options) };
    case 'mediawiki':
    case 'wikitext':
      return renderMediaWiki(text, options);
    case 'wikidot':
      return { html: renderWikidot(text, options) };
    case 'html':
      return { html: renderHtml(text) };
    default:
      return { html: renderMarkdown(text, options) };
  }
}

export { renderMarkdown, renderMediaWiki, renderWikidot, renderHtml };
