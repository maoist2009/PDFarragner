import type { ReactNode } from 'react';
import { type Lang } from '../i18n';

interface Props {
  lang: Lang;
  onClose: () => void;
}

const docContent: Record<Lang, ReactNode> = {
  zh: (
    <>
      <h2 className="text-xl font-bold mb-3">📘 PDF 页面编辑器 — 使用说明</h2>

      <section className="mb-4">
        <h3 className="font-bold text-base mb-1">🎯 设计目标</h3>
        <p className="text-sm leading-relaxed">
          一个完全在浏览器中运行、离线工作的 PDF 页面级编辑工具。所有处理都在你的设备上完成，
          文件不会上传到任何服务器。专为大型扫描版 PDF（数千页）和移动端低端机优化。
        </p>
      </section>

      <section className="mb-4">
        <h3 className="font-bold text-base mb-1">⚡ 三种渲染质量模式</h3>
        <ul className="text-sm space-y-2">
          <li>
            <strong>🐢 低 (Low):</strong> 缩略图缩放因子 0.5 倍。占用最少内存与 CPU，
            适合手机/平板/低端机。文字可能略显模糊但能识别页面内容。
            <span className="text-gray-500">推荐：超过 500 页时强制使用。</span>
          </li>
          <li>
            <strong>⚡ 中 (Medium):</strong> 缩放因子 1.0 倍（默认）。在普通笔记本上的最佳平衡。
          </li>
          <li>
            <strong>🚀 高 (High):</strong> 缩放因子 1.5 倍。缩略图更清晰，但渲染更慢、占用更多内存。
            <span className="text-gray-500">仅在大屏幕、强机器、需要看清细节时使用。</span>
          </li>
        </ul>
        <p className="text-xs text-gray-500 mt-1">
          系统启动时会自动检测 CPU 核心数：≤2 核会自动选低模式。
        </p>
      </section>

      <section className="mb-4">
        <h3 className="font-bold text-base mb-1">🖱️ 选择模式</h3>
        <ul className="text-sm space-y-1">
          <li><strong>普通模式（默认）：</strong>单击 = 单选；Ctrl/⌘+单击 = 加入/取消选中；Shift+单击 = 区间选择。</li>
          <li><strong>选择模式（☑ 按钮开启后）：</strong>单击 = 切换选中（等同于按 Ctrl）。手机/触屏推荐使用此模式批量选择。</li>
          <li><strong>长按（移动端）：</strong>呼出右键菜单。</li>
        </ul>
      </section>

      <section className="mb-4">
        <h3 className="font-bold text-base mb-1">✂️ 分割点</h3>
        <p className="text-sm leading-relaxed">
          每个缩略图下方有 <code>···</code> 按钮，点击变成 <span className="bg-red-500 text-white px-1 rounded">✂</span>，
          表示在该页之后分割。导出时每段会成为一个独立 PDF 文件。
          段数 = 分割点数 + 1。
        </p>
      </section>

      <section className="mb-4">
        <h3 className="font-bold text-base mb-1">📑 目录面板</h3>
        <ul className="text-sm space-y-1">
          <li><strong>展开/收起：</strong>点击左侧 ▸ ▾ 按钮。</li>
          <li><strong>跳转：</strong>点击条目本身（包括有子项的非叶子节点）。</li>
          <li><strong>红 ✕：</strong>原 PDF 中该目录指向的页已被删除。</li>
          <li><strong>编辑目录：</strong>使用"编辑目录"按钮可手动添加/删除/调整层级（拖拽支持）。</li>
        </ul>
      </section>

      <section className="mb-4">
        <h3 className="font-bold text-base mb-1">🔍 单页放大查看</h3>
        <p className="text-sm leading-relaxed">
          双击任意缩略图打开。支持：
        </p>
        <ul className="text-sm space-y-1 mt-1">
          <li>← → 键 / 左右滑动 切换页面</li>
          <li>+/− 键 缩放</li>
          <li>"⇱" 按钮跳转到该页（关闭弹窗并定位）</li>
        </ul>
      </section>

      <section className="mb-4">
        <h3 className="font-bold text-base mb-1">⌨️ 快捷键</h3>
        <ul className="text-sm space-y-1">
          <li><code>Ctrl/⌘+Z</code> 撤销 · <code>Ctrl/⌘+Shift+Z</code> 重做</li>
          <li><code>Ctrl/⌘+A</code> 全选</li>
          <li><code>Delete / Backspace</code> 删除选中页</li>
          <li><code>Esc</code> 取消选择 / 关闭菜单</li>
          <li><code>双击</code> 缩略图 = 放大查看</li>
        </ul>
      </section>

      <section className="mb-4">
        <h3 className="font-bold text-base mb-1">💾 性能设计</h3>
        <ul className="text-sm space-y-1">
          <li><strong>懒加载：</strong>只渲染屏幕可见 + 上下 200px 范围的缩略图。</li>
          <li><strong>不全部读入内存：</strong>PDF 启用了 <code>disableAutoFetch</code> 与 <code>disableStream</code>，
              页面按需从原始 ArrayBuffer 中按对象读取。</li>
          <li><strong>取消渲染：</strong>快速滚动时自动取消看不到的页的渲染任务。</li>
          <li><strong>虚拟列表：</strong>页面 DOM 节点只创建可见行，万页 PDF 也能流畅滚动。</li>
        </ul>
      </section>

      <section className="mb-4">
        <h3 className="font-bold text-base mb-1">📦 关于目录的导出</h3>
        <p className="text-sm leading-relaxed">
          PDF 内有两种引用：
        </p>
        <ul className="text-sm space-y-1 mt-1">
          <li><strong>相对引用（page reference）：</strong>指向 PDF 内某个对象。重新组合 PDF 后我们使用 pdf-lib 的 <code>copyPages</code>，会自动保留该页内的所有相对引用（链接、跳转等）。</li>
          <li><strong>绝对引用（page+coords）：</strong>目录中典型用此方式。当源页被复制到新文档时，pdf-lib 会重写为新的页对象引用，但这只对页内引用有效。
            源 PDF 的整体目录结构本身不会自动迁移，因此生成的 PDF 默认无目录（除非使用本工具的"编辑目录"功能手动构建）。</li>
        </ul>
      </section>

      <section className="mb-4">
        <h3 className="font-bold text-base mb-1">🔒 隐私</h3>
        <p className="text-sm leading-relaxed">
          完全离线运行：所有 PDF 解析、合并、导出都在浏览器内完成。
          无任何网络请求。可断网使用。
        </p>
      </section>

      <section className="mb-2">
        <h3 className="font-bold text-base mb-1">💡 典型场景</h3>
        <p className="text-sm leading-relaxed">
          <strong>多册书合并并按章节分册：</strong>
          上传 4 个 PDF 文件 → 在文件顺序对话框中拖拽排序 → 删除每册的封面/目录/封底 →
          按章节标记分割点 → 导出 ZIP。
        </p>
      </section>
    </>
  ),
  en: (
    <>
      <h2 className="text-xl font-bold mb-3">📘 PDF Page Editor — User Guide</h2>

      <section className="mb-4">
        <h3 className="font-bold text-base mb-1">🎯 Goals</h3>
        <p className="text-sm leading-relaxed">
          A 100% in-browser, offline PDF page editor. All processing happens on your device — files never leave your browser.
          Optimized for very large scanned PDFs (thousands of pages) and low-end mobile devices.
        </p>
      </section>

      <section className="mb-4">
        <h3 className="font-bold text-base mb-1">⚡ Three render quality modes</h3>
        <ul className="text-sm space-y-2">
          <li><strong>🐢 Low:</strong> Thumbnail render scale 0.5×. Lowest memory & CPU. Best for phones/tablets/low-end devices. Text may be slightly blurry but content is recognizable. <span className="text-gray-500">Recommended for 500+ pages.</span></li>
          <li><strong>⚡ Medium:</strong> Scale 1.0× (default). Balanced for normal laptops.</li>
          <li><strong>🚀 High:</strong> Scale 1.5×. Crisper thumbnails but slower and more memory. <span className="text-gray-500">Use only on large screens / strong devices.</span></li>
        </ul>
        <p className="text-xs text-gray-500 mt-1">
          On startup, devices with ≤2 CPU cores auto-switch to Low.
        </p>
      </section>

      <section className="mb-4">
        <h3 className="font-bold text-base mb-1">🖱️ Selection modes</h3>
        <ul className="text-sm space-y-1">
          <li><strong>Normal (default):</strong> Click = single-select · Ctrl/⌘+Click = toggle · Shift+Click = range.</li>
          <li><strong>Selection Mode (toggle ☑ button):</strong> Click = toggle (like holding Ctrl). Recommended for batch selection on touch devices.</li>
          <li><strong>Long-press (mobile):</strong> Opens context menu.</li>
        </ul>
      </section>

      <section className="mb-4">
        <h3 className="font-bold text-base mb-1">✂️ Split points</h3>
        <p className="text-sm leading-relaxed">
          Below each thumbnail there's a <code>···</code> button. Click to toggle a <span className="bg-red-500 text-white px-1 rounded">✂</span> split AFTER this page.
          On export, each segment becomes a separate PDF. Total segments = splits + 1.
        </p>
      </section>

      <section className="mb-4">
        <h3 className="font-bold text-base mb-1">📑 Outline panel</h3>
        <ul className="text-sm space-y-1">
          <li><strong>Expand/collapse:</strong> Click the ▸ ▾ button on the left.</li>
          <li><strong>Jump:</strong> Click the entry itself (works on non-leaf items too).</li>
          <li><strong>Red ✕:</strong> The page this outline entry pointed to has been deleted.</li>
          <li><strong>Edit outline:</strong> The "Edit outline" button lets you add/remove/re-level entries (with drag-and-drop).</li>
        </ul>
      </section>

      <section className="mb-4">
        <h3 className="font-bold text-base mb-1">🔍 Single-page zoom view</h3>
        <p className="text-sm leading-relaxed">Double-click any thumbnail. Supports:</p>
        <ul className="text-sm space-y-1 mt-1">
          <li>← → keys / swipe left-right to navigate</li>
          <li>+ / − keys to zoom</li>
          <li>"⇱" button to jump (closes modal and positions there)</li>
        </ul>
      </section>

      <section className="mb-4">
        <h3 className="font-bold text-base mb-1">⌨️ Shortcuts</h3>
        <ul className="text-sm space-y-1">
          <li><code>Ctrl/⌘+Z</code> Undo · <code>Ctrl/⌘+Shift+Z</code> Redo</li>
          <li><code>Ctrl/⌘+A</code> Select all</li>
          <li><code>Delete / Backspace</code> Delete selected</li>
          <li><code>Esc</code> Deselect / close menu</li>
          <li><code>Double-click</code> thumbnail = zoom view</li>
        </ul>
      </section>

      <section className="mb-4">
        <h3 className="font-bold text-base mb-1">💾 Performance design</h3>
        <ul className="text-sm space-y-1">
          <li><strong>Lazy rendering:</strong> Only renders thumbnails currently visible (+ 200px buffer).</li>
          <li><strong>No full load:</strong> PDFs use <code>disableAutoFetch</code> + <code>disableStream</code>; pages parsed on demand.</li>
          <li><strong>Cancellable renders:</strong> Off-screen renders are cancelled while you scroll fast.</li>
          <li><strong>Virtual list:</strong> Only visible rows have DOM nodes — even 10k-page PDFs scroll smoothly.</li>
        </ul>
      </section>

      <section className="mb-4">
        <h3 className="font-bold text-base mb-1">📦 About outline preservation</h3>
        <p className="text-sm leading-relaxed">PDFs use two reference styles:</p>
        <ul className="text-sm space-y-1 mt-1">
          <li><strong>Indirect (page reference):</strong> Points to a specific page object. After re-assembling, pdf-lib's <code>copyPages</code> preserves all such intra-page references (links, internal anchors).</li>
          <li><strong>Explicit (page+coords):</strong> The typical outline style. When source pages are copied, pdf-lib rewrites these to new page object refs — but only for in-page references. The source's whole outline tree is NOT auto-migrated, so generated PDFs have no outline by default (unless you build one with the "Edit outline" tool).</li>
        </ul>
      </section>

      <section className="mb-4">
        <h3 className="font-bold text-base mb-1">🔒 Privacy</h3>
        <p className="text-sm leading-relaxed">
          Fully offline: parsing, merging, exporting all happen in your browser. No network requests. Works without internet.
        </p>
      </section>

      <section className="mb-2">
        <h3 className="font-bold text-base mb-1">💡 Typical workflow</h3>
        <p className="text-sm leading-relaxed">
          <strong>Merge a 4-volume book and split by chapter:</strong> Upload 4 PDFs → reorder them in the file-order dialog →
          delete each volume's cover/TOC/back-cover → mark split points at chapter starts → Export ZIP.
        </p>
      </section>
    </>
  ),
};

export default function HelpDialog({ lang, onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto text-gray-800 dark:text-gray-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 flex justify-end bg-white dark:bg-gray-800 p-2 border-b border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">✕</button>
        </div>
        <div className="p-4 sm:p-6">
          {docContent[lang]}
        </div>
      </div>
    </div>
  );
}
