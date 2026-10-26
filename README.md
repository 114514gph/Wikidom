# Wikidom

规则，是用来打破的。在这里，你就是规则。

你是否有在Wikidot上等级太低无法创建帖子的困难？又是否有过在Fandom上无法完全管控自己帖子的尴尬？又是否因为那些条条框框无法激发自己的创意？那么Wikidom就是你最好的选择。

## 特性

- **三语法统一支持**：Markdown / MediaWiki / WikiDot / HTML
- **Fandom 级视觉体验**：完整保留 Fandom 风格 UI
- **WikiDot 级深度功能**：模板、折叠块、自定义 CSS
- **Cloudflare 全栈无服务器**：Pages + D1 + KV，全球加速
- **版本控制与回滚**：完整的页面历史
- **评论与讨论**：每个页面都有讨论区
- **回收站机制**：30 天保留期，误删可恢复
- **自定义命名空间**：第一个冒号前自动识别，无需预定义

## 技术栈

- 前端：Vue 3 + Vite
- 后端：Cloudflare Pages Functions
- 数据库：Cloudflare D1 (SQLite)
- 缓存：Cloudflare KV
- 渲染：自制三语法解析引擎（Markdown + MediaWiki + WikiDot）

## 部署

```bash
npm install
npm run build
npx wrangler pages deploy dist --project-name=wikidom
```

## 开源协议

本项目仅允许个人非商业使用，禁止商业倒卖与二次售卖。

© MengYou® Studio™
