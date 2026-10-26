<script setup lang="ts">
</script>

<template>
  <footer class="wiki-footer">
    <div class="wiki-footer__inner">
      <div>
        <div class="wiki-footer__brand">
          <div class="wiki-footer__brand-logo">W</div>
          <span class="wiki-footer__brand-name">Wikidom</span>
        </div>
        <p class="wiki-footer__desc">
          你是否有在 Wikidot 上等级太低无法创建帖子的困难？又是否有过在 Fandom 上无法完全管控自己帖子的尴尬？又是否因为那些条条框框无法激发自己的创意？那么 Wikidom 就是你最好的选择。
        </p>
      </div>

      <div class="wiki-footer__col">
        <h4>社区</h4>
        <RouterLink to="/about">关于</RouterLink>
        <RouterLink to="/community">社区中心</RouterLink>
        <RouterLink to="/help">帮助中心</RouterLink>
        <RouterLink to="/contact">联系我们</RouterLink>
      </div>

      <div class="wiki-footer__col">
        <h4>法律</h4>
        <RouterLink to="/terms">使用条款</RouterLink>
        <RouterLink to="/privacy">隐私政策</RouterLink>
        <RouterLink to="/content-policy">内容政策</RouterLink>
        <RouterLink to="/dmca">DMCA</RouterLink>
      </div>

      <div class="wiki-footer__col">
        <h4>开发者</h4>
        <RouterLink to="/api-docs">API 文档</RouterLink>
        <RouterLink to="/developers">开发者中心</RouterLink>
        <RouterLink to="/status">运行状态</RouterLink>
        <a href="https://github.com/114514gph" target="_blank" rel="noopener">GitHub</a>
      </div>
    </div>

    <div class="wiki-footer__bottom">
      <span>&copy; 2026 MengYou&reg; Studio&trade;</span>
      <div class="wiki-footer__social">
        <a href="https://github.com/114514gph" target="_blank" rel="noopener" title="GitHub">&lt;/&gt;</a>
        <RouterLink to="/community" title="社区">#</RouterLink>
      </div>
    </div>
  </footer>
</template>
