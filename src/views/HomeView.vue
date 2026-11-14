<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="home">
    <header class="home-hero">
      <p class="home-eyebrow">OhMyIDC Document Framework</p>
      <h1>把 Markdown 变成<br />可以嵌入任意 Vue 应用的文档站</h1>
      <p class="home-lead">
        构建期编译 Markdown，运行时只依赖 Vue 和
        vue-router。独立部署和嵌进现有产品，共用同一套代码。
      </p>
      <div class="home-actions">
        <RouterLink class="home-button home-button-primary" to="/docs/guide/start">
          快速开始
        </RouterLink>
        <RouterLink class="home-button" to="/docs/guide/embed">嵌入到宿主</RouterLink>
      </div>
    </header>

    <section class="home-points">
      <article>
        <h2>内容归内容</h2>
        <p>Markdown 在构建期编译成 Vue 渲染函数，运行时不需要 Markdown 解析器。</p>
      </article>
      <article>
        <h2>路由归宿主</h2>
        <p>只返回路由片段，由宿主决定挂在哪个父路径下，不创建第二个 router。</p>
      </article>
      <article>
        <h2>样式不越界</h2>
        <p>所有样式都收在 .odocs 命名空间里，不注入全局 reset，和宿主主题共存。</p>
      </article>
    </section>

    <footer class="home-footer">
      <RouterLink to="/docs">阅读文档</RouterLink>
    </footer>
  </div>
</template>

<style scoped>
.home {
  max-width: 960px;
  margin: 0 auto;
  padding: 96px 24px 64px;
}

.home-eyebrow {
  margin: 0 0 12px;
  color: #16a34a;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.home h1 {
  margin: 0;
  font-size: clamp(32px, 5vw, 52px);
  line-height: 1.15;
  letter-spacing: -0.02em;
}

.home-lead {
  max-width: 620px;
  margin: 20px 0 0;
  color: #5b6472;
  font-size: 17px;
  line-height: 1.7;
}

.home-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 28px;
}

.home-button {
  display: inline-flex;
  align-items: center;
  min-height: 42px;
  padding: 0 18px;
  border: 1px solid #d7dce3;
  border-radius: 999px;
  color: #1f2329;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  transition:
    border-color 0.2s ease,
    transform 0.2s ease;
}

.home-button:hover {
  border-color: #9aa4b2;
  transform: translateY(-1px);
}

.home-button-primary {
  border-color: #16a34a;
  background: #16a34a;
  color: #fff;
}

.home-button-primary:hover {
  border-color: #15803d;
  background: #15803d;
}

.home-points {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin-top: 64px;
}

.home-points article {
  padding: 20px;
  border: 1px solid #e6e9ef;
  border-radius: 14px;
  background: #fbfcfd;
}

.home-points h2 {
  margin: 0 0 8px;
  font-size: 16px;
}

.home-points p {
  margin: 0;
  color: #5b6472;
  font-size: 14px;
  line-height: 1.65;
}

.home-footer {
  margin-top: 48px;
  font-size: 14px;
}

.home-footer a {
  color: #16a34a;
}
</style>
