import DefaultTheme from 'vitepress/theme'
import CodeRunner from './components/CodeRunner.vue'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('CodeRunner', CodeRunner)
  }
}
