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
      case 'like':
        return handleLike(ss, data);
      case 'comment':
        return handleComment(ss, data);
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
        return askJinseiAI(question, userName);
      case 'comments':
        const postId = e?.parameter?.postId || '';
        return getComments(ss, postId);
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

// ============ POST INTERACTIONS ============

function handleLike(ss, data) {
  const sheet = ss.getSheetByName('TSS_Posts');
  if (!sheet) return createResponse({ error: 'Posts sheet not found' });
  
  const allData = sheet.getDataRange().getValues();
  for (let i = 1; i < allData.length; i++) {
    if (String(allData[i][4]) === String(data.postId)) {
      const currentLikes = allData[i][3] || 0;
      sheet.getRange(i + 1, 4).setValue(currentLikes + 1);
      return createResponse({ success: true, likes: currentLikes + 1 });
    }
  }
  return createResponse({ error: 'Post not found' });
}

function handleComment(ss, data) {
  let sheet = ss.getSheetByName('TSS_Comments');
  if (!sheet) {
    sheet = ss.insertSheet('TSS_Comments');
    sheet.getRange(1, 1, 1, 5).setValues([['Timestamp', 'PostId', 'Author', 'Content', 'CommentId']]);
    sheet.getRange(1, 1, 1, 5).setFontWeight('bold');
  }
  
  const commentId = Date.now();
  const row = [
    new Date().toISOString(),
    data.postId,
    data.author,
    data.content,
    commentId
  ];
  
  sheet.appendRow(row);
  
  // Award tokens for commenting
  addTokensToUser(ss, data.author, 1);
  
  return createResponse({ success: true, commentId: commentId, tokensEarned: 1 });
}

function getComments(ss, postId) {
  const sheet = ss.getSheetByName('TSS_Comments');
  if (!sheet) return createResponse({ comments: [] });
  
  const data = sheet.getDataRange().getValues();
  const comments = data.slice(1)
    .filter(row => String(row[1]) === String(postId))
    .map(row => ({
      timestamp: row[0],
      postId: row[1],
      author: row[2],
      content: row[3],
      commentId: row[4]
    }));
  
  return createResponse({ comments });
}

// ============ JINSEI AI ============

function askJinseiAI(question, userName) {
  try {
    const GEMINI_API_KEY = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
    
    if (!GEMINI_API_KEY) {
      return createResponse({ 
        response: generateJinseiResponse(question),
        source: 'local'
      });
    }
    
    const systemPrompt = `あなたは「JINSEI AI」です。TEAM SYNERGY STAGEコミュニティの専属AIアドバイザーとして、仁成（じんせい）氏の「自走型組織づくり」メソッドに基づいたアドバイスを提供します。

## 仁成メソッドの核心知識

### 自走型組織とは
- 経営者が指示・命令しなくても社員が自ら考えて行動できる組織
- チーム全体で「右腕」として機能する組織づくり
- 個人プレイではなく、チームで協力し力を結集させる

### 心理的安全性の重要性
- 人が主体的に行動するには心理的安全性が必須
- 「無知だと思われる不安」「無能だと思われる不安」を取り除く
- 失敗しても大丈夫という安心感がチャレンジを生む

### 承認の力
- 相手の挑戦や取り組みをまず「認める」ことが大切
- 叱る前に褒める、結果より過程を評価
- 心理的安全性を高める最も効果的な方法

### ミッション・ビジョンの重要性
- 使命があることで「やらされ感」が「やりたい」に変わる
- 自分たちで決めたミッションだからこそ習慣化しやすい
- ビジョンに共感する人材が集まる

### 指示待ち組織から自走組織への3ステップ
1. 経営者が理念を決め、方向性を定める
2. 共感してくれるチームを募り、中心メンバーを作る
3. チームビルディングでミッション・ビジョン・行動指針を決める

### 良いリーダーの条件
- 号令をかけるだけでなく、共感する力を持つ
- 心理的安全性を確保できる人
- 発言が多く、仕切り屋にならない人

## 回答ガイドライン
1. 200〜300文字程度で簡潔に
2. 相談者の名前で呼びかける（${userName}さん）
3. 具体的で実践的なアドバイス
4. 前向きで寄り添う姿勢
5. 適度に絵文字を使用（控えめに）
6. 仁成メソッドに基づいた知見を提供

相談者: ${userName}さん`;

    const payload = {
      contents: [{
        parts: [{
          text: systemPrompt + '\n\n質問: ' + question
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500
      }
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
    const aiText = result.candidates?.[0]?.content?.parts?.[0]?.text || generateJinseiResponse(question);
    
    return createResponse({ 
      response: aiText,
      source: 'gemini'
    });
    
  } catch (error) {
    return createResponse({ 
      response: generateJinseiResponse(question),
      source: 'local',
      error: error.message
    });
  }
}

function generateJinseiResponse(question) {
  const q = question.toLowerCase();
  
  if (q.includes('こんにちは') || q.includes('はじめまして')) {
    return 'こんにちは！JINSEI AIです😊 人生のこと、仕事のこと、チームのこと、何でも相談してくださいね。一緒に考えましょう！';
  }
  
  if (q.includes('ありがとう') || q.includes('感謝')) {
    return 'どういたしまして！また気軽に話しかけてくださいね。あなたの挑戦を応援しています🌟';
  }
  
  if (q.includes('チーム') || q.includes('組織') || q.includes('メンバー')) {
    return '自走型組織を作るコツは「承認」です。メンバーの挑戦をまず認め、心理的安全性を高めること。失敗しても大丈夫という環境があれば、人は自然と主体的になります✨';
  }
  
  if (q.includes('リーダー') || q.includes('上司') || q.includes('部下')) {
    return '良いリーダーは号令をかける人ではなく、共感できる人です。メンバー一人ひとりの声に耳を傾け、承認し、巻き込んでいく。そうすることで、チーム全体が自走し始めます🚀';
  }
  
  if (q.includes('やる気') || q.includes('モチベーション') || q.includes('主体性')) {
    return '主体性を引き出す鍵は「使命」です。自分たちで決めたミッションがあると、「やらされ感」が「やりたい！」に変わります。一緒に目標を作ってみませんか？💪';
  }
  
  if (q.includes('失敗') || q.includes('ミス') || q.includes('不安')) {
    return '失敗は学びのチャンスです。心理的安全性が高い組織では、失敗を恐れずチャレンジできます。まずあなたの挑戦を認めてくれる人を見つけましょう。きっといるはずです😊';
  }
  
  if (q.includes('トークン') || q.includes('ポイント') || q.includes('TSST')) {
    return 'TSSトークン(TSST)は活動で獲得できます！\n📝 投稿: +3 TSST\n✅ タスク追加: +1 TSST\n🎯 タスク完了: +2 TSST\n💬 コメント: +1 TSST\n積極的に活動して、コミュニティに貢献しましょう！';
  }
  
  const responses = [
    'いい質問ですね！もう少し詳しく教えていただけますか？一緒に考えましょう✨',
    'なるほど、その悩みは多くの人が持っています。まず「心理的安全性」を意識してみてください。自分を認めてくれる環境があると、人は変われます😊',
    '素晴らしい視点ですね！自走型組織を作る第一歩は、共感してくれる仲間を見つけること。あなたはすでにその一歩を踏み出していますよ🚀'
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
  console.log('TSS Backend v2.0 - JINSEI AI Ready');
}
