import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import path from 'path'
import styleImport from 'vite-plugin-style-import'

import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
const viewPort = require('postcss-px-to-viewport')
export default defineConfig({
  esbuild: {
    jsxFactory: 'h',
    jsxFragment: 'Fragment'
  },
  build: {
    minify: 'terser',
    sourcemap: false,
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  },
  base: process.env.NODE_ENV === 'production' ? '/fsgroup/' : process.env.NODE_ENV === 'progit' ? '/' : '/',
  resolve: {
    alias: {
      '~': path.resolve(__dirname, './'),
      '@': path.resolve(__dirname, 'src'),
      $m: path.resolve(__dirname, 'src/styles/mixin.scss'),
      $fetch: path.resolve(__dirname, 'src/config/http.base'),
      $style: path.resolve(__dirname, 'src/styles'),
      $types: path.resolve(__dirname, 'src/types'),
      $utils: path.resolve(__dirname, 'src/utils/utils.ts')
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        charset: false,
        additionalData: `@use "scss/mixin.scss" as *;`
      }
    }
  },
  optimizeDeps: {
    include: ['axios']
  },
  server: {
    cors: true,
    port: 8090,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8080/',
        changeOrigin: true,
        rewrite: (path) => {
          return path
        },
        secure: false,
        ws: false
      }
    }
  },
  plugins: [
    vue(),
    vueJsx(),
    Components({
      resolvers: [ElementPlusResolver()]
    }),
    styleImport({
      libs: [
        {
          libraryName: 'element-plus',
          esModule: true,
          ensureStyleFile: true,
          resolveStyle: (name) => {
            name = name.slice(3)
            return `element-plus/packages/theme-chalk/src/${name}.scss`
          },
          resolveComponent: (name) => {
            return `element-plus/lib/${name}`
          }
        }
      ]
    })
  ]
})
