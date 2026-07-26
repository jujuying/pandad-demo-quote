# 報價單自動產生工具 — 胖爸省工坊 Demo #3

## 這解決了什麼問題？

裝潢業、顧問業、設計業老闆每次報價都要開 Word 手動排版，改來改去還容易出錯。
這個工具讓老闆在網頁填幾個欄位，PDF 報價單自動產出並寄到客戶信箱。

## 技術架構

```
前端 (Vercel)          後端 (Google Apps Script)
  HTML 表單     →  POST  →  doPost()
  填入資訊               →  建立 Google Doc
  顯示結果               →  轉出 PDF
                         →  Gmail 寄附件
```

- 前端：純 HTML + CSS + Vanilla JS，部署 Vercel（零成本）
- 後端：Google Apps Script Web App（零成本，免伺服器）
- PDF：DocumentApp → DriveApp export（Google 原生，版面穩定）
- Email：GmailApp（用部署者的 Gmail 帳號寄出）

## 部署步驟

### 1. 部署 Apps Script 後端

1. 開啟 [Google Apps Script](https://script.google.com)
2. 建立新專案，貼上 `Code.gs` 內容
3. 設定寄件人名稱（選擇性）：
   - 「專案設定」→「指令碼屬性」
   - 新增屬性：`SENDER_NAME` = `胖爸省工坊`
4. 部署為 Web 應用程式：
   - 部署 > 新增部署 > 類型選「網頁應用程式」
   - 執行身分：**我**
   - 存取權限：**所有人**
5. 複製部署網址

### 2. 設定前端

開啟 `index.html`，找到這一行：

```javascript
const APPS_SCRIPT_URL = 'YOUR_APPS_SCRIPT_WEB_APP_URL_HERE';
```

替換為步驟 1 取得的部署網址。

### 3. 部署到 Vercel

```bash
# 安裝 Vercel CLI（如未安裝）
npm i -g vercel

# 在 pangba-demo-quote 目錄執行
vercel
```

或直接在 [vercel.com](https://vercel.com) 匯入 GitHub repo。

## 檔案說明

```
pangba-demo-quote/
├── index.html      # 前端表單頁
├── Code.gs         # Apps Script 後端（複製貼上到 Google）
├── vercel.json     # Vercel 部署設定
├── assets/
│   └── hero.png    # 頁面示意圖
└── README.md
```

## 注意事項

- Apps Script 每日寄信上限：100 封（免費帳號）
- PDF 產生需要 3–10 秒，前端有 loading 狀態
- `SENDER_NAME` 用 PropertiesService 儲存，不 hardcode
- 部署 Apps Script 時需授予 Gmail + Drive + Document 權限
