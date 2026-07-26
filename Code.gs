// ================================================================
// 胖爸省工坊 - 報價單自動產生工具 (Apps Script 後端)
// 部署方式：
//   1. 開啟 Google Apps Script (script.google.com)
//   2. 建立新專案，貼上此程式碼
//   3. 部署 > 新增部署 > Web 應用程式
//      - 執行身分：我
//      - 存取權限：所有人
//   4. 複製部署網址，貼到 index.html 的 APPS_SCRIPT_URL
// ================================================================

// 從 Google Sheets 讀取設定（不 hardcode 帳密）
// 或使用 PropertiesService 儲存
function getSenderName() {
  return PropertiesService.getScriptProperties().getProperty('SENDER_NAME') || '胖爸省工坊';
}

// ── 主要入口：接收前端 POST ──
function doPost(e) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  try {
    const data = JSON.parse(e.postData.contents);

    // 基本驗證
    if (!data.clientEmail || !data.clientName || !data.items || data.items.length === 0) {
      return buildResponse({ success: false, error: '缺少必填欄位' }, headers);
    }

    // 產生 Google Doc 報價單並轉 PDF
    const pdfBlob = createQuotePdf(data);

    // 寄送 Email
    sendQuoteEmail(data, pdfBlob);

    return buildResponse({ success: true }, headers);

  } catch (err) {
    console.error('doPost error:', err.toString());
    return buildResponse({ success: false, error: err.toString() }, headers);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ status: 'ok', service: '報價單 API' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── 建立報價單 Google Doc → PDF ──
function createQuotePdf(data) {
  const { clientName, quoteNo, quoteDate, items, total, notes } = data;

  // 建立暫時 Google Doc
  const doc = DocumentApp.create(`[暫存] 報價單_${quoteNo}`);
  const body = doc.getBody();
  body.setMarginTop(54).setMarginBottom(54).setMarginLeft(54).setMarginRight(54);

  // ── 頁首：公司名稱 ──
  const headerPara = body.appendParagraph('胖爸省工坊');
  headerPara.setHeading(DocumentApp.ParagraphHeading.HEADING1);
  headerPara.setAlignment(DocumentApp.HorizontalAlignment.LEFT);
  styleText(headerPara.editAsText(), '#D97706', 26, true);

  const subPara = body.appendParagraph('一人省工自動化服務');
  styleText(subPara.editAsText(), '#6B7280', 11, false);

  body.appendHorizontalRule();

  // ── 報價單標題 ──
  const titlePara = body.appendParagraph('報  價  單');
  titlePara.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  styleText(titlePara.editAsText(), '#1F2937', 22, true);

  body.appendParagraph('');

  // ── 基本資訊表格 ──
  const infoTable = body.appendTable([
    ['報價單編號', quoteNo, '報價日期', quoteDate],
    ['客戶名稱', clientName, '', '']
  ]);
  styleInfoTable(infoTable);

  body.appendParagraph('');

  // ── 明細標題 ──
  const detailTitle = body.appendParagraph('服務明細');
  styleText(detailTitle.editAsText(), '#1F2937', 12, true);

  // ── 明細表格 ──
  const rows = [['項目名稱', '數量', '單價（元）', '小計（元）']];
  items.forEach(item => {
    rows.push([
      item.name,
      String(item.qty),
      `$${Number(item.price).toLocaleString()}`,
      `$${Number(item.subtotal).toLocaleString()}`
    ]);
  });
  // 合計列
  rows.push(['', '', '合計', `$${Number(total).toLocaleString()}`]);

  const itemTable = body.appendTable(rows);
  styleItemTable(itemTable, items.length);

  body.appendParagraph('');

  // ── 備注 ──
  if (notes) {
    const noteTitle = body.appendParagraph('備注');
    styleText(noteTitle.editAsText(), '#6B7280', 11, true);
    const noteBody = body.appendParagraph(notes);
    styleText(noteBody.editAsText(), '#4B5563', 11, false);
    body.appendParagraph('');
  }

  // ── 頁尾 ──
  body.appendHorizontalRule();
  const footerPara = body.appendParagraph('此報價單由系統自動產生 | 胖爸省工坊 | pangba-workshop.vercel.app');
  footerPara.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  styleText(footerPara.editAsText(), '#9CA3AF', 10, false);

  doc.saveAndClose();

  // 轉 PDF
  const docId = doc.getId();
  const pdfBlob = DriveApp.getFileById(docId)
    .getBlob()
    .setName(`報價單_${quoteNo}.pdf`);

  // 刪除暫存 Doc（避免垃圾堆積）
  DriveApp.getFileById(docId).setTrashed(true);

  return pdfBlob;
}

// ── 寄送 Email ──
function sendQuoteEmail(data, pdfBlob) {
  const { clientName, clientEmail, quoteNo, total } = data;
  const senderName = getSenderName();

  const subject = `【報價單】${quoteNo} — ${clientName} 您好`;
  const htmlBody = `
    <div style="font-family: sans-serif; max-width: 560px; color: #1f2937;">
      <div style="background:#D97706; color:#fff; padding:16px 24px; border-radius:8px 8px 0 0;">
        <strong style="font-size:16px;">胖爸省工坊</strong>
      </div>
      <div style="background:#f9fafb; padding:24px; border-radius:0 0 8px 8px; border:1px solid #e5e7eb;">
        <p style="font-size:15px;">您好，${clientName}，</p>
        <p style="margin-top:12px;">感謝您的詢問！附件為您的報價單（PDF），請查收。</p>
        <div style="background:#fff; border:1px solid #e5e7eb; border-radius:8px; padding:16px; margin:20px 0;">
          <p style="font-size:13px; color:#6b7280; margin-bottom:4px;">報價單編號</p>
          <p style="font-size:16px; font-weight:700;">${quoteNo}</p>
          <p style="font-size:13px; color:#6b7280; margin:12px 0 4px;">報價總金額</p>
          <p style="font-size:20px; font-weight:700; color:#D97706;">$${Number(total).toLocaleString()} 元</p>
        </div>
        <p style="font-size:13px; color:#6b7280;">如有任何問題，歡迎回信詢問。</p>
        <p style="margin-top:20px;">敬祝商祺，<br><strong>${senderName}</strong></p>
      </div>
    </div>
  `;

  GmailApp.sendEmail(clientEmail, subject, '', {
    name: senderName,
    htmlBody,
    attachments: [pdfBlob]
  });
}

// ── 輔助：樣式函式 ──
function styleText(text, hexColor, fontSize, bold) {
  text.setForegroundColor(hexColor)
    .setFontSize(fontSize)
    .setBold(bold)
    .setFontFamily('Arial');
}

function styleInfoTable(table) {
  table.setBorderWidth(0);
  for (let r = 0; r < table.getNumRows(); r++) {
    const row = table.getRow(r);
    for (let c = 0; c < row.getNumCells(); c++) {
      const cell = row.getCell(c);
      const text = cell.editAsText();
      if (c % 2 === 0) {
        // 標籤欄
        text.setForegroundColor('#6B7280').setFontSize(10).setBold(true);
        cell.setBackgroundColor('#F3F4F6');
      } else {
        text.setForegroundColor('#1F2937').setFontSize(11).setBold(false);
      }
      cell.setPaddingTop(8).setPaddingBottom(8).setPaddingLeft(10).setPaddingRight(10);
    }
  }
}

function styleItemTable(table, itemCount) {
  for (let r = 0; r < table.getNumRows(); r++) {
    const row = table.getRow(r);
    for (let c = 0; c < row.getNumCells(); c++) {
      const cell = row.getCell(c);
      const text = cell.editAsText();
      cell.setPaddingTop(8).setPaddingBottom(8).setPaddingLeft(10).setPaddingRight(10);
      if (r === 0) {
        // 表頭
        text.setForegroundColor('#FFFFFF').setFontSize(11).setBold(true);
        cell.setBackgroundColor('#D97706');
      } else if (r === itemCount + 1) {
        // 合計列
        text.setForegroundColor('#1F2937').setFontSize(12).setBold(true);
        cell.setBackgroundColor('#FEF3C7');
      } else {
        // 資料列
        text.setForegroundColor('#1F2937').setFontSize(11).setBold(false);
        cell.setBackgroundColor(r % 2 === 0 ? '#F9FAFB' : '#FFFFFF');
      }
    }
  }
}

function buildResponse(obj, headers) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
