import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Skill Forge',
  description: 'The missing GUI for Claude Code configuration',
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Reference', link: '/reference/keyboard-shortcuts' },
      { text: 'GitHub', link: 'https://github.com/HayriCan/skill-forge' }
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/guide/getting-started' },
          { text: 'Profiles', link: '/guide/profiles' },
          { text: 'MCP Servers', link: '/guide/mcp-servers' },
          { text: 'Backup & Restore', link: '/guide/backup' },
        ]
      },
      {
        text: 'Reference',
        items: [
          { text: 'Keyboard Shortcuts', link: '/reference/keyboard-shortcuts' },
          { text: 'Views', link: '/reference/views' },
        ]
      }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/HayriCan/skill-forge' }
    ]
  }
})
