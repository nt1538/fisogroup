import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import path from 'path'

import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

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
  base: '/',
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
        rewrite: (path) => path,
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
    })
  ]
})

