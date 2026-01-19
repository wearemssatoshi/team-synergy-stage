/**
 * TSS (TEAM SYNERGY STAGE) - Google Apps Script Backend
 * 
 * 設定手順:
 * 1. Google Spreadsheetを作成
 * 2. 拡張機能 > Apps Script を開く
 * 3. このコードを貼り付け
 * 4. デプロイ > 新しいデプロイ > ウェブアプリ
 * 5. アクセス: 全員（匿名ユーザーを含む）
 * 6. デプロイしてURLをコピー
 * 7. TSS.htmlのSCRIPT_URLに設定
 */

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // アクションに応じて処理を分岐
    switch (data.action) {
      case 'post':
        return postToBoard(data);
      case 'like':
        return likePost(data);
      case 'addTodo':
        return addTodo(data);
      case 'toggleTodo':
        return toggleTodo(data);
      case 'deleteTodo':
        return deleteTodo(data);
      default:
        return jsonResponse({ success: false, error: 'Unknown action' });
    }
  } catch (error) {
    return jsonResponse({ success: false, error: error.message });
  }
}

function doGet(e) {
  try {
    const action = e?.parameter?.action || 'data';
    
    switch (action) {
      case 'version':
        return jsonResponse({
          version: '1.0.0',
          name: 'TSS Backend',
          deployedAt: new Date().toISOString().split('T')[0]
        });
      
      case 'register':
        return registerUser(e.parameter);
      
      case 'login':
        return loginUser(e.parameter);
      
      case 'sync':
        return syncUserData(e.parameter);
      
      case 'board':
        return getBoardPosts();
      
      case 'todos':
        return getUserTodos(e.parameter);
      
      case 'chat':
        return askAI(e.parameter);
      
      default:
        return getStats();
    }
  } catch (error) {
    return jsonResponse({ success: false, error: error.message });
  }
}

// ========== ユーザー管理 ==========

function getUsersSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('TSS_Users');
  if (!sheet) {
    sheet = ss.insertSheet('TSS_Users');
    sheet.getRange(1, 1, 1, 7).setValues([[
      'Name', 'PIN_Hash', 'Points', 'Posts', 'Likes_Given', 'Created_At', 'Last_Login'
    ]]);
    sheet.getRange(1, 1, 1, 7).setFontWeight('bold');
  }
  return sheet;
}

function hashPin(pin) {
  const hash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, pin);
  return hash.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
}

function registerUser(params) {
  const name = params.name || '';
  const pin = params.pin || '';
  
  if (!name || !pin) {
    return jsonResponse({ success: false, error: '名前とPINを入力してください' });
  }
  
  const sheet = getUsersSheet();
  const data = sheet.getDataRange().getValues();
  
  // 既存ユーザーチェック
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === name) {
      return jsonResponse({ 
        success: false, 
        error: 'この名前は既に登録されています',
        exists: true 
      });
    }
  }
  
  const pinHash = hashPin(pin);
  const now = new Date().toISOString();
  
  sheet.appendRow([name, pinHash, 0, 0, 0, now, now]);
  
  return jsonResponse({ 
    success: true, 
    message: '登録完了！',
    name: name,
    points: 0
  });
}

function loginUser(params) {
  const name = params.name || '';
  const pin = params.pin || '';
  
  if (!name || !pin) {
    return jsonResponse({ success: false, error: '名前とPINを入力してください' });
  }
  
  const sheet = getUsersSheet();
  const data = sheet.getDataRange().getValues();
  const pinHash = hashPin(pin);
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === name && data[i][1] === pinHash) {
      // ログイン成功 - 最終ログイン時刻を更新
      sheet.getRange(i + 1, 7).setValue(new Date().toISOString());
      
      return jsonResponse({ 
        success: true,
        name: name,
        points: data[i][2] || 0,
        posts: data[i][3] || 0,
        likesGiven: data[i][4] || 0
      });
    }
  }
  
  return jsonResponse({ success: false, error: '名前またはPINが正しくありません' });
}

function syncUserData(params) {
  const name = params.name || '';
  
  if (!name) {
    return jsonResponse({ success: false, error: 'ユーザー名が必要です' });
  }
  
  const sheet = getUsersSheet();
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === name) {
      return jsonResponse({ 
        success: true,
        points: data[i][2] || 0,
        posts: data[i][3] || 0,
        likesGiven: data[i][4] || 0
      });
    }
  }
  
  return jsonResponse({ success: false, error: 'ユーザーが見つかりません' });
}

// ========== 掲示板機能 ==========

function getBoardSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('TSS_Board');
  if (!sheet) {
    sheet = ss.insertSheet('TSS_Board');
    sheet.getRange(1, 1, 1, 6).setValues([[
      'ID', 'Author', 'Content', 'Likes', 'Created_At', 'Likers'
    ]]);
    sheet.getRange(1, 1, 1, 6).setFontWeight('bold');
  }
  return sheet;
}

function postToBoard(data) {
  const sheet = getBoardSheet();
  const id = Date.now().toString();
  const now = new Date().toISOString();
  
  sheet.appendRow([id, data.author, data.content, 0, now, '[]']);
  
  // ユーザーのポイントと投稿数を更新
  updateUserStats(data.author, 'posts', 1);
  updateUserStats(data.author, 'points', 1); // 投稿で1ポイント
  
  return jsonResponse({ 
    success: true, 
    id: id,
    pointsEarned: 1 
  });
}

function likePost(data) {
  const sheet = getBoardSheet();
  const allData = sheet.getDataRange().getValues();
  
  for (let i = 1; i < allData.length; i++) {
    if (allData[i][0] === data.postId) {
      // いいね数を更新
      const currentLikes = allData[i][3] || 0;
      sheet.getRange(i + 1, 4).setValue(currentLikes + 1);
      
      // いいねした人を記録
      let likers = [];
      try {
        likers = JSON.parse(allData[i][5] || '[]');
      } catch (e) {
        likers = [];
      }
      
      if (!likers.includes(data.liker)) {
        likers.push(data.liker);
        sheet.getRange(i + 1, 6).setValue(JSON.stringify(likers));
        
        // いいねした人のポイントを更新
        updateUserStats(data.liker, 'likesGiven', 1);
      }
      
      return jsonResponse({ success: true, likes: currentLikes + 1 });
    }
  }
  
  return jsonResponse({ success: false, error: '投稿が見つかりません' });
}

function getBoardPosts() {
  const sheet = getBoardSheet();
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) {
    return jsonResponse({ success: true, posts: [] });
  }
  
  const posts = [];
  for (let i = 1; i < data.length; i++) {
    posts.push({
      id: data[i][0],
      author: data[i][1],
      content: data[i][2],
      likes: data[i][3] || 0,
      createdAt: data[i][4]
    });
  }
  
  // 新しい順にソート
  posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  return jsonResponse({ success: true, posts: posts.slice(0, 50) });
}

// ========== To-do機能 ==========

function getTodosSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('TSS_Todos');
  if (!sheet) {
    sheet = ss.insertSheet('TSS_Todos');
    sheet.getRange(1, 1, 1, 5).setValues([[
      'ID', 'User', 'Text', 'Completed', 'Created_At'
    ]]);
    sheet.getRange(1, 1, 1, 5).setFontWeight('bold');
  }
  return sheet;
}

function addTodo(data) {
  const sheet = getTodosSheet();
  const id = Date.now().toString();
  const now = new Date().toISOString();
  
  sheet.appendRow([id, data.user, data.text, false, now]);
  
  return jsonResponse({ success: true, id: id });
}

function toggleTodo(data) {
  const sheet = getTodosSheet();
  const allData = sheet.getDataRange().getValues();
  
  for (let i = 1; i < allData.length; i++) {
    if (allData[i][0] === data.id && allData[i][1] === data.user) {
      const currentState = allData[i][3];
      sheet.getRange(i + 1, 4).setValue(!currentState);
      
      // 完了したらポイント付与
      if (!currentState) {
        updateUserStats(data.user, 'points', 1);
      }
      
      return jsonResponse({ success: true, completed: !currentState });
    }
  }
  
  return jsonResponse({ success: false, error: 'タスクが見つかりません' });
}

function deleteTodo(data) {
  const sheet = getTodosSheet();
  const allData = sheet.getDataRange().getValues();
  
  for (let i = 1; i < allData.length; i++) {
    if (allData[i][0] === data.id && allData[i][1] === data.user) {
      sheet.deleteRow(i + 1);
      return jsonResponse({ success: true });
    }
  }
  
  return jsonResponse({ success: false, error: 'タスクが見つかりません' });
}

function getUserTodos(params) {
  const user = params.user || '';
  const sheet = getTodosSheet();
  const data = sheet.getDataRange().getValues();
  
  const todos = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === user) {
      todos.push({
        id: data[i][0],
        text: data[i][2],
        completed: data[i][3],
        createdAt: data[i][4]
      });
    }
  }
  
  return jsonResponse({ success: true, todos: todos });
}

// ========== AI機能 ==========

function askAI(params) {
  const question = params.q || '';
  const userName = params.name || '相談者';
  
  const GEMINI_API_KEY = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  
  if (!GEMINI_API_KEY) {
    return jsonResponse({ 
      response: generateLocalResponse(question),
      source: 'local'
    });
  }
  
  const systemPrompt = `あなたは「TSSアシスタント」です。TEAM SYNERGY STAGEコミュニティのメンバーをサポートするAIです。

## あなたの役割
- コミュニティメンバーの質問に親身に答える
- 応援やモチベーションを高めるアドバイスを提供
- ビジネスや自己成長に関する相談に対応
- 押し付けがましくなく、寄り添う姿勢で対話

## 回答ガイドライン
1. 200〜300文字程度で簡潔に
2. 具体的で実践的なアドバイスを心がける
3. 適度に絵文字を使用（控えめに）
4. 相談者の名前で呼びかける

相談者: ${userName}さん`;

  try {
    const payload = {
      contents: [{
        parts: [{
          text: systemPrompt + '\n\n相談内容: ' + question
        }]
      }]
    };
    
    const response = UrlFetchApp.fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + GEMINI_API_KEY,
      {
        method: 'POST',
        contentType: 'application/json',
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      }
    );
    
    const result = JSON.parse(response.getContentText());
    const aiText = result.candidates?.[0]?.content?.parts?.[0]?.text || generateLocalResponse(question);
    
    return jsonResponse({ response: aiText, source: 'gemini' });
  } catch (error) {
    return jsonResponse({ 
      response: generateLocalResponse(question),
      source: 'local',
      error: error.message
    });
  }
}

function generateLocalResponse(question) {
  const responses = [
    'いい質問ですね！もう少し詳しく教えていただけますか？具体的なアドバイスができると思います。✨',
    'その悩み、とても大切なことですね。一緒に考えていきましょう！',
    '素晴らしい視点です！TSSコミュニティの仲間にも相談してみるといいかもしれません。🤝',
    '一歩一歩前進していけば大丈夫です。今日できることから始めてみましょう！💪'
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

// ========== 統計・ユーティリティ ==========

function updateUserStats(userName, field, increment) {
  const sheet = getUsersSheet();
  const data = sheet.getDataRange().getValues();
  
  const fieldIndex = {
    'points': 2,
    'posts': 3,
    'likesGiven': 4
  };
  
  const colIndex = fieldIndex[field];
  if (!colIndex) return;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === userName) {
      const currentValue = data[i][colIndex] || 0;
      sheet.getRange(i + 1, colIndex + 1).setValue(currentValue + increment);
      return;
    }
  }
}

function getStats() {
  const usersSheet = getUsersSheet();
  const boardSheet = getBoardSheet();
  
  const usersData = usersSheet.getDataRange().getValues();
  const boardData = boardSheet.getDataRange().getValues();
  
  return jsonResponse({
    totalUsers: Math.max(0, usersData.length - 1),
    totalPosts: Math.max(0, boardData.length - 1),
    version: '1.0.0'
  });
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// テスト用
function testBackend() {
  console.log('TSS Backend is working!');
  console.log(getStats().getContent());
}
