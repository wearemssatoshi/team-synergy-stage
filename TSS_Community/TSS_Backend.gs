/**
 * TEAM SYNERGY STAGE - Google Apps Script Backend
 * 
 * 設定手順:
 * 1. Google Spreadsheetを作成
 * 2. 拡張機能 > Apps Script を開く
 * 3. このコードを貼り付け
 * 4. デプロイ > 新しいデプロイ > ウェブアプリ
 * 5. アクセス: 全員（匿名ユーザーを含む）
 * 6. デプロイしてURLをコピー
 * 7. TSS_Community.htmlのSCRIPT_URLに設定
 */

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    switch (data.action) {
      case 'register':
        return handleRegister(ss, data);
      case 'post':
        return handlePost(ss, data);
      case 'addToken':
        return handleAddToken(ss, data);
      default:
        return createResponse({ error: 'Unknown action' });
    }
    
  } catch (error) {
    return createResponse({ error: error.message });
  }
}

function doGet(e) {
  try {
    const action = e?.parameter?.action || 'data';
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    switch (action) {
      case 'members':
        return getMembers(ss);
      case 'posts':
        return getPosts(ss);
      case 'stats':
        return getStats(ss);
      case 'chat':
        const question = e?.parameter?.q || '';
        const userName = e?.parameter?.name || 'User';
        return askSatoshiAI(question, userName);
      default:
        return getAllData(ss);
    }
    
  } catch (error) {
    return createResponse({ error: error.message });
  }
}

// ============ HANDLERS ============

function handleRegister(ss, data) {
  let sheet = ss.getSheetByName('TSS_Members');
  if (!sheet) {
    sheet = ss.insertSheet('TSS_Members');
    sheet.getRange(1, 1, 1, 6).setValues([['Timestamp', 'Name', 'Role', 'Bio', 'Tokens', 'JoinedAt']]);
    sheet.getRange(1, 1, 1, 6).setFontWeight('bold');
  }
  
  // Check if user already exists
  const allData = sheet.getDataRange().getValues();
  for (let i = 1; i < allData.length; i++) {
    if (allData[i][1] === data.name) {
      // Update existing user
      sheet.getRange(i + 1, 3).setValue(data.role);
      sheet.getRange(i + 1, 4).setValue(data.bio);
      return createResponse({ success: true, updated: true });
    }
  }
  
  // Add new user
  const row = [
    new Date().toISOString(),
    data.name,
    data.role || 'メンバー',
    data.bio || '',
    10, // Welcome bonus
    new Date().toISOString()
  ];
  
  sheet.appendRow(row);
  
  return createResponse({ success: true, tokens: 10 });
}

function handlePost(ss, data) {
  let sheet = ss.getSheetByName('TSS_Posts');
  if (!sheet) {
    sheet = ss.insertSheet('TSS_Posts');
    sheet.getRange(1, 1, 1, 5).setValues([['Timestamp', 'Author', 'Content', 'Likes', 'PostId']]);
    sheet.getRange(1, 1, 1, 5).setFontWeight('bold');
  }
  
  const postId = Date.now();
  const row = [
    new Date().toISOString(),
    data.author,
    data.content,
    0,
    postId
  ];
  
  sheet.appendRow(row);
  
  // Award tokens for posting
  addTokensToUser(ss, data.author, 3);
  
  return createResponse({ success: true, postId: postId, tokensEarned: 3 });
}

function handleAddToken(ss, data) {
  const result = addTokensToUser(ss, data.name, data.amount || 1);
  return createResponse(result);
}

function addTokensToUser(ss, name, amount) {
  const sheet = ss.getSheetByName('TSS_Members');
  if (!sheet) return { success: false, error: 'Members sheet not found' };
  
  const allData = sheet.getDataRange().getValues();
  for (let i = 1; i < allData.length; i++) {
    if (allData[i][1] === name) {
      const currentTokens = allData[i][4] || 0;
      const newTokens = currentTokens + amount;
      sheet.getRange(i + 1, 5).setValue(newTokens);
      return { success: true, newBalance: newTokens };
    }
  }
  
  return { success: false, error: 'User not found' };
}

// ============ GETTERS ============

function getMembers(ss) {
  const sheet = ss.getSheetByName('TSS_Members');
  if (!sheet) return createResponse({ members: [] });
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const members = data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h.toLowerCase().replace(/\s/g, '')] = row[i]);
    return obj;
  });
  
  return createResponse({ members });
}

function getPosts(ss) {
  const sheet = ss.getSheetByName('TSS_Posts');
  if (!sheet) return createResponse({ posts: [] });
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const posts = data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h.toLowerCase().replace(/\s/g, '')] = row[i]);
    return obj;
  }).reverse(); // Latest first
  
  return createResponse({ posts });
}

function getStats(ss) {
  const membersSheet = ss.getSheetByName('TSS_Members');
  const postsSheet = ss.getSheetByName('TSS_Posts');
  
  const membersData = membersSheet ? membersSheet.getDataRange().getValues().slice(1) : [];
  const postsData = postsSheet ? postsSheet.getDataRange().getValues().slice(1) : [];
  
  const totalMembers = membersData.length;
  const totalTokens = membersData.reduce((sum, row) => sum + (row[4] || 0), 0);
  const totalPosts = postsData.length;
  
  // Top members by tokens
  const topMembers = membersData
    .map(row => ({ name: row[1], role: row[2], tokens: row[4] }))
    .sort((a, b) => b.tokens - a.tokens)
    .slice(0, 10);
  
  return createResponse({
    totalMembers,
    totalTokens,
    totalPosts,
    topMembers
  });
}

function getAllData(ss) {
  const members = JSON.parse(getMembers(ss).getContent()).members;
  const posts = JSON.parse(getPosts(ss).getContent()).posts;
  const stats = JSON.parse(getStats(ss).getContent());
  
  return createResponse({
    members,
    posts,
    ...stats
  });
}

// ============ AI CHAT ============

function askSatoshiAI(question, userName) {
  try {
    const GEMINI_API_KEY = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
    
    if (!GEMINI_API_KEY) {
      return createResponse({ 
        response: generateLocalResponse(question),
        source: 'local'
      });
    }
    
    const systemPrompt = `あなたは「SATOSHI」です。TEAM SYNERGY STAGEのコミュニティメンバーをサポートするAIアシスタントです。

## 基本姿勢
- フレンドリーで親しみやすい態度
- 建設的で前向きなアドバイス
- コミュニティの団結を促進
- 簡潔で分かりやすい回答

## 対応できるトピック
- コミュニティ活動のアドバイス
- チームワーク、コラボレーション
- モチベーション維持
- トークンシステムの説明
- アプリの使い方

相談者: ${userName}さん

回答は200〜300文字程度で簡潔に。`;

    const payload = {
      contents: [{
        parts: [{
          text: systemPrompt + '\n\n質問: ' + question
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
    
    return createResponse({ 
      response: aiText,
      source: 'gemini'
    });
    
  } catch (error) {
    return createResponse({ 
      response: generateLocalResponse(question),
      source: 'local',
      error: error.message
    });
  }
}

function generateLocalResponse(question) {
  const q = question.toLowerCase();
  
  if (q.includes('こんにちは') || q.includes('はじめまして')) {
    return 'こんにちは！TEAM SYNERGY STAGEへようこそ😊 何かお手伝いできることはありますか？';
  }
  
  if (q.includes('ありがとう')) {
    return 'どういたしまして！また気軽に声をかけてくださいね🌟';
  }
  
  if (q.includes('トークン') || q.includes('ポイント')) {
    return 'トークンは活動で獲得できます！\n📝 投稿: +3 TSS\n✅ タスク追加: +1 TSS\n🎯 タスク完了: +2 TSS\n積極的に活動してトークンを貯めましょう！';
  }
  
  if (q.includes('使い方') || q.includes('ヘルプ')) {
    return 'このアプリでは:\n🏠 HOME: お知らせ・動画\n💬 BOARD: 投稿・交流\n✅ TODO: タスク管理\n🤖 AI: 私に相談\n👤 PROFILE: プロフィール確認\nができます！';
  }
  
  const responses = [
    'いい質問ですね！もう少し詳しく教えていただけますか？',
    '面白い視点ですね。一緒に考えましょう！',
    'なるほど！他に気になることはありますか？'
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

// ============ UTILITIES ============

function createResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============ TEST FUNCTIONS ============

function testSetup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  console.log('Spreadsheet ID:', ss.getId());
  console.log('Spreadsheet URL:', ss.getUrl());
}
