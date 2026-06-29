import { defineConfig } from 'vitepress'

export default defineConfig({
  title: '文档',
  description: '个人笔记与技术文档',
  base: '/',
  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '指南', link: '/guide/intro' },
      { text: 'LLM', link: '/llm/' }
    ],
    sidebar: [
      {
        text: '指南',
        items: [
          { text: '入门', link: '/guide/intro' }
        ]
      },
      {
        text: 'LLM',
        items: [
          { text: '概览', link: '/llm/' },
          { text: 'nanoGPT学习笔记', link: '/llm/nanogpt' }
        ]
      }
    ],
    socialLinks: []
  }
})
