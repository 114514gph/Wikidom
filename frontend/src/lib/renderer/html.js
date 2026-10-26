// HTML 渲染器（直接渲染，净化）
import DOMPurify from 'dompurify';

export function renderHtml(text) {
  if (!text) return '';
  return DOMPurify.sanitize(text, {
    ADD_TAGS: ['style', 'iframe', 'details', 'summary', 'ruby', 'rt', 'rp', 'marquee', 'font', 'center', 'big', 'small', 'strike', 'tt'],
    ADD_ATTR: ['target', 'style', 'class', 'id', 'colspan', 'rowspan', 'align', 'valign', 'width', 'height', 'bgcolor', 'color', 'face', 'size', 'data-*', 'srcset'],
  });
}
