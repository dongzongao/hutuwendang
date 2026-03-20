<template>
  <div class="cr">
    <!-- 语言 tab -->
    <div class="cr__tabs">
      <button
        v-for="l in langList"
        :key="l.key"
        class="cr__tab"
        :class="{ 'cr__tab--active': activeLang === l.key }"
        @click="switchLang(l.key)"
      >{{ l.label }}</button>
      <div class="cr__tab-spacer"></div>
      <button class="cr__run-btn" :disabled="running" @click="runCode">
        {{ running ? '运行中...' : '▶ 运行' }}
      </button>
      <button v-if="output !== null" class="cr__clear-btn" @click="clearOutput">✕</button>
    </div>

    <!-- 编辑器 -->
    <textarea
      v-model="currentCode"
      class="cr__editor"
      spellcheck="false"
      :rows="editorRows"
    />

    <!-- 输出 -->
    <div v-if="output !== null" class="cr__output">
      <div class="cr__output-hd">
        <span>输出</span>
        <span v-if="execTime !== null" class="cr__time">{{ execTime }}ms</span>
      </div>
      <pre class="cr__output-bd">{{ output }}</pre>
    </div>

    <!-- 执行流程 trace（仅 JS） -->
    <div v-if="trace.length > 0" class="cr__trace">
      <div class="cr__trace-hd">
        <span>执行流程（共 {{ trace.length }} 步）</span>
        <div class="cr__trace-nav">
          <button :disabled="step <= 0" @click="step--">‹</button>
          <span>{{ step + 1 }} / {{ trace.length }}</span>
          <button :disabled="step >= trace.length - 1" @click="step++">›</button>
        </div>
      </div>
      <div class="cr__trace-bd">
        <div class="cr__trace-desc">{{ trace[step].desc }}</div>
        <div v-if="trace[step].state" class="cr__trace-vars">
          <span v-for="(val, key) in trace[step].state" :key="key" class="cr__trace-var">
            <span class="cr__var-key">{{ key }}</span>
            <span class="cr__var-val">{{ fmt(val) }}</span>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  // 主语言（决定默认激活 tab）
  lang: { type: String, default: 'javascript' },
  // 各语言默认代码，格式：{ js: '...', java: '...', python: '...' }
  codes: { type: Object, default: () => ({}) },
  // 兼容旧的单语言用法
  defaultCode: { type: String, default: '' },
})

const LANGS = [
  { key: 'javascript', label: 'JavaScript' },
  { key: 'java',       label: 'Java'       },
  { key: 'python',     label: 'Python'     },
  { key: 'cpp',        label: 'C++'        },
  { key: 'go',         label: 'Go'         },
]

// 只展示有代码的语言 tab（至少展示主语言）
const langList = computed(() => {
  const hasCodes = Object.keys(props.codes)
  return LANGS.filter(l =>
    l.key === props.lang ||
    hasCodes.includes(l.key) ||
    (l.key === 'javascript' && props.defaultCode)
  )
})

const activeLang = ref(props.lang)

// 每种语言独立维护编辑内容
const codeMap = ref({})
function initCode(key) {
  if (codeMap.value[key] !== undefined) return
  const fromCodes = props.codes[key] || ''
  const fallback = key === props.lang ? props.defaultCode : ''
  codeMap.value[key] = (fromCodes || fallback).trim()
}
// 初始化所有有代码的语言
langList.value.forEach(l => initCode(l.key))

const currentCode = computed({
  get: () => { initCode(activeLang.value); return codeMap.value[activeLang.value] },
  set: v => { codeMap.value[activeLang.value] = v },
})

const editorRows = computed(() =>
  Math.min(Math.max(currentCode.value.split('\n').length, 8), 35)
)

function switchLang(key) {
  initCode(key)
  activeLang.value = key
  clearOutput()
}

// 运行状态
const output = ref(null)
const trace = ref([])
const step = ref(0)
const running = ref(false)
const execTime = ref(null)

function clearOutput() {
  output.value = null
  trace.value = []
  step.value = 0
  execTime.value = null
}

function fmt(val) {
  if (val === null || val === undefined) return String(val)
  if (Array.isArray(val)) return '[' + val.join(', ') + ']'
  if (typeof val === 'object') return '{' + Object.entries(val).map(([k,v]) => `${k}:${v}`).join(', ') + '}'
  return String(val)
}

async function runCode() {
  running.value = true
  clearOutput()
  await new Promise(r => setTimeout(r, 10))

  if (activeLang.value === 'javascript') {
    runJS()
  } else {
    await runRemote()
  }
  running.value = false
}

function runJS() {
  const logs = [], steps = []
  const t0 = performance.now()
  try {
    const fn = new Function('console', '__trace__', currentCode.value)
    fn(
      { log: (...a) => logs.push(a.map(x => typeof x === 'object' ? JSON.stringify(x) : String(x)).join(' ')),
        error: (...a) => logs.push('[error] ' + a.join(' ')) },
      (desc, state) => steps.push({ desc, state: state ? { ...state } : null })
    )
    execTime.value = Math.round(performance.now() - t0)
    output.value = logs.length ? logs.join('\n') : '（无输出）'
    trace.value = steps
  } catch (e) {
    output.value = '[运行错误] ' + e.message
  }
}

async function runRemote() {
  // Piston API - 完全免费，无需 key
  const PISTON_LANG = {
    java:   { language: 'java',   version: '15.0.2' },
    python: { language: 'python', version: '3.10.0' },
    cpp:    { language: 'c++',    version: '10.2.0' },
    go:     { language: 'go',     version: '1.16.2' },
  }
  const lang = PISTON_LANG[activeLang.value]
  if (!lang) { output.value = '暂不支持该语言'; return }

  const t0 = performance.now()
  try {
    const res = await fetch('https://emkc.org/api/v2/piston/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: lang.language,
        version: lang.version,
        files: [{ content: currentCode.value }],
      }),
    })
    if (!res.ok) throw new Error('HTTP ' + res.status)
    const result = await res.json()
    execTime.value = Math.round(performance.now() - t0)
    // 编译错误优先展示
    if (result.compile?.stderr) {
      output.value = '[编译错误]\n' + result.compile.stderr
      return
    }
    const stdout = result.run?.stdout || ''
    const stderr = result.run?.stderr || ''
    output.value = (stdout + (stderr ? '\n[stderr]\n' + stderr : '')).trim() || '（无输出）'
  } catch (e) {
    output.value = '[请求失败] ' + e.message + '\n网络不可用时请手动复制代码到本地运行'
  }
}
</script>

<style scoped>
.cr { border: 1px solid var(--vp-c-divider); border-radius: 8px; overflow: hidden; margin: 16px 0; font-size: 13px; }

/* tabs */
.cr__tabs { display: flex; align-items: center; background: var(--vp-c-bg-soft); border-bottom: 1px solid var(--vp-c-divider); padding: 0 8px; gap: 2px; }
.cr__tab { padding: 8px 14px; border: none; background: none; color: var(--vp-c-text-2); font-size: 12px; font-weight: 500; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.15s; }
.cr__tab:hover { color: var(--vp-c-text-1); }
.cr__tab--active { color: var(--vp-c-brand); border-bottom-color: var(--vp-c-brand); }
.cr__tab-spacer { flex: 1; }
.cr__run-btn { padding: 4px 14px; border-radius: 4px; border: none; background: var(--vp-c-brand); color: #fff; font-size: 12px; cursor: pointer; transition: opacity 0.2s; margin: 4px 0; }
.cr__run-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.cr__run-btn:hover:not(:disabled) { opacity: 0.85; }
.cr__clear-btn { padding: 4px 8px; border-radius: 4px; border: 1px solid var(--vp-c-divider); background: none; color: var(--vp-c-text-2); font-size: 12px; cursor: pointer; margin: 4px 0 4px 4px; }

/* editor */
.cr__editor { width: 100%; padding: 12px; font-family: var(--vp-font-family-mono); font-size: 13px; line-height: 1.6; background: var(--vp-c-bg); color: var(--vp-c-text-1); border: none; resize: vertical; outline: none; box-sizing: border-box; }

/* output */
.cr__output { border-top: 1px solid var(--vp-c-divider); }
.cr__output-hd { display: flex; justify-content: space-between; padding: 6px 12px; font-size: 12px; font-weight: 600; color: var(--vp-c-text-2); background: var(--vp-c-bg-soft); }
.cr__time { color: var(--vp-c-brand); }
.cr__output-bd { margin: 0; padding: 12px; font-family: var(--vp-font-family-mono); font-size: 13px; white-space: pre-wrap; word-break: break-all; }

/* trace */
.cr__trace { border-top: 1px solid var(--vp-c-divider); }
.cr__trace-hd { display: flex; align-items: center; justify-content: space-between; padding: 6px 12px; background: var(--vp-c-bg-soft); font-size: 12px; font-weight: 600; color: var(--vp-c-text-2); }
.cr__trace-nav { display: flex; align-items: center; gap: 8px; }
.cr__trace-nav button { padding: 2px 10px; border-radius: 4px; border: 1px solid var(--vp-c-divider); background: var(--vp-c-bg); color: var(--vp-c-text-1); cursor: pointer; font-size: 13px; }
.cr__trace-nav button:disabled { opacity: 0.4; cursor: not-allowed; }
.cr__trace-bd { padding: 12px; }
.cr__trace-desc { font-size: 13px; padding: 6px 10px; background: var(--vp-c-brand-soft); border-left: 3px solid var(--vp-c-brand); border-radius: 4px; margin-bottom: 8px; }
.cr__trace-vars { display: flex; flex-wrap: wrap; gap: 8px; }
.cr__trace-var { display: flex; align-items: center; gap: 4px; padding: 3px 10px; background: var(--vp-c-bg-soft); border: 1px solid var(--vp-c-divider); border-radius: 4px; font-family: var(--vp-font-family-mono); font-size: 12px; }
.cr__var-key { color: var(--vp-c-brand); font-weight: 600; }
</style>
