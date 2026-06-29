import { defineConfig } from 'vitepress'

export default defineConfig({
  title: '文档',
  description: '个人笔记与技术文档',
  base: '/',
  markdown: {
    config(md) {
      const defaultFence = md.renderer.rules.fence

      md.renderer.rules.fence = (tokens, idx, options, env, self) => {
        const token = tokens[idx]
        const language = token.info.trim().split(/\s+/)[0]

        if (language === 'mermaid') {
          return `<ClientOnly><MermaidDiagram code="${encodeURIComponent(token.content)}" /></ClientOnly>`
        }

        return defaultFence(tokens, idx, options, env, self)
      }
    }
  },
  vite: {
    server: {
      allowedHosts: ['study.roywang.xyz', 'doc.roywang.xyz']
    },
    preview: {
      allowedHosts: ['study.roywang.xyz', 'doc.roywang.xyz']
    }
  },
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
