import { defineConfig } from 'vitepress'

export default defineConfig({
  title: '学习文档',
  description: '个人学习笔记与技术文档',
  base: '/',
  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '学习指南', link: '/guide/intro' }
    ],
    sidebar: [
      {
        text: '学习指南',
        items: [
          { text: '入门', link: '/guide/intro' }
        ]
      }
    ],
    socialLinks: []
  }
})
