# English Learning App 免費同步版（GitHub Pages + Firebase Spark）

## 初次部署
1. 請先把 `firebase-config.js` 內的 `apiKey`, `authDomain`, `projectId`, `appId` 填入 Firebase 控制台的 Web App 設定。這些為公開網頁設定，不要放管理員密碼或服務帳戶金鑰。
2. 將 `firestore.rules` 的內容貼入 Firebase → Firestore → 規則並發布；規則已鎖定 `https://english-learning-tw.github.io/english-learning-app/` 網址，若網址改變須同步調整。
3. 將本資料夾中的檔案（不是外層資料夾）上傳到公開的 GitHub 儲存庫 `english-learning-tw/english-learning-app` 根目錄。
4. GitHub 儲存庫 Settings → Pages → Build and deployment → Deploy from a branch → main / (root) → Save。網站網址 `https://english-learning-tw.github.io/english-learning-app/`。
5. 確保 Firebase Authentication → Settings → Authorized domains 加入 `english-learning-tw.github.io`，以支援網頁登入。

## 日常使用
- 自訂單字：管理後台編輯→登入 Firebase 管理員→按「發布全部本機單字」。其他手機可同步讀取。
- HTML 教材：先在 GitHub 儲存庫根目錄按 Add file → Upload files 上傳 `your_lesson.html` 並 Commit changes。再於 App 管理後台填入標題、分類和檔名，按「發布教材連結至 Firestore」。
- 本機 HTML 上傳仍可作為草稿預覽，但不會自動上傳 GitHub；不可誤以為點擊本機儲存就已分享。
- 既有 23 份 HTML 教材已放在專案根目錄。
- 登入需要已設定的 Authentication 管理員帳號及 `admins/{UID}` 文件。

## 限制及安全
- 這是免費方案測試版，不支援從 App 直接把 HTML 檔案傳到 GitHub（需要額外安全的後端代理；不能把 GitHub token 放在公開網頁中）。
- 公開 GitHub 網站與 HTML 程式碼對所有人可見；不要上傳私人資訊或密碼。
- 只允許管理員寫入 Firestore；讀者可閱讀公開單字與教材清單。
- 這套方法須透過 GitHub Pages 和 Firestore 免費額度；高流量可能受免費限制。
- 原始 HTML 教材使用 iframe 沙箱載入，仍僅建議發布可信任素材。
