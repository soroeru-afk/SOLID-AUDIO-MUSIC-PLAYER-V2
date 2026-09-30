<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/a286936b-cb8d-4b95-a342-2f61fad8989b

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

---

## ⚠️ AIエージェント/再統合時の超重要注意事項 (先祖返り防止仕様)

AI Studio等の外部ツールでコードの修正・再インポートを行う際は、以下の**ウィンドウサイズ永続記憶およびリサイズ自動復元機能**が上書き除去（先祖返り）されないよう、必ず保護・再統合してください。

1. **表示モード（viewMode）の記憶**:
   - `FULL` / `MINI` / `SLIM` モード選択を `v2_solidViewMode` (localStorage / IndexedDB) に保存・復元。
2. **モード別カスタムウィンドウサイズの自動記憶・復元**:
   - カオルさまがドラッグして変更した各モードごとのウィンドウ幅・高さを `v2_solidWindowSizes` (localStorage / IndexedDB) に保存。
   - アプリ起動時およびモード変更時に `window.resizeTo(target.width, target.height)` で動的に再現・復元すること。
