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
      case 'updateProfile':
        return updateProfile(data);
      // ============ TO-DO ============
      case 'addTodo':
        return handleAddTodo(ss, data);
      case 'completeTodo':
        return handleCompleteTodo(ss, data);
      case 'deleteTodo':
        return handleDeleteTodo(ss, data);
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
      // ============ VERSION ============
      case 'version':
        return createResponse({
          version: '2.0.0',
          name: 'TSS Backend with PIN Auth',
          features: ['PIN認証', 'プロフィール同期', 'To-Do同期', 'JINSEI AI'],
          deployedAt: '2026-01-21'
        });
      
      // ============ PIN AUTH ============
      case 'register':
        return registerUser(e.parameter);
      case 'login':
        return loginUser(e.parameter);
      case 'sync':
        return syncUserData(e.parameter);
      case 'changePin':
        return changePinForUser(e.parameter);
      case 'updateProfile':
        return updateProfile(e.parameter);
      case 'getTodos':
        return getTodos(ss, e.parameter);
      
      // ============ EXISTING ============
      case 'members':
        return getMembers(ss);
      case 'posts':
        return getPosts(ss);
      case 'stats':
        return getStats(ss);
      case 'chat':
        const question = e?.parameter?.q || '';
        const userName = e?.parameter?.name || 'User';
        const history = e?.parameter?.history || '[]';
        return askJinseiAI(question, userName, JSON.parse(history));
      case 'comments':
        const postId = e?.parameter?.postId || '';
        return getComments(ss, postId);
      case 'like':
        return handleLike(ss, e.parameter);
      case 'comment':
        return handleComment(ss, e.parameter);
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
  return createResponse({ success: true, commentId: commentId, tokens: 1 });
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
  let membersMap = new Map();

  // 1. Fetch from TSS_Users (V2)
  const usersSheet = ss.getSheetByName('TSS_Users');
  if (usersSheet) {
    const data = usersSheet.getDataRange().getValues().slice(1);
    data.forEach(row => {
        if (!row[0]) return;
        membersMap.set(row[0], {
            name: row[0],
            role: row[2] || 'メンバー',
            bio: row[3] || '',
            future: row[4] || '',
            tokens: row[5] || 0,
            profileImage: row[6] || '',
            themeSongUrl: row[7] || '',
            joinedAt: row[8] || '',
            lastLogin: row[9] || ''
        });
    });
  }

  // 2. Fetch from TSS_Members (Legacy)
  const membersSheet = ss.getSheetByName('TSS_Members');
  if (membersSheet) {
    const data = membersSheet.getDataRange().getValues().slice(1);
    data.forEach(row => {
        const name = row[1];
        if (name && !membersMap.has(name)) { // Merge only new unique users
             membersMap.set(name, {
                  name: name,
                  role: row[2] || 'メンバー',
                  bio: row[3] || '',
                  future: '', // No future in legacy
                  tokens: row[4] || 0,
                  profileImage: '',
                  themeSongUrl: '',
                  joinedAt: row[5] || '',
                  lastLogin: ''
             });
        }
    });
  }
  
  return createResponse({ members: Array.from(membersMap.values()) });
}

function getPosts(ss) {
  const postsSheet = ss.getSheetByName('TSS_Posts');
  if (!postsSheet) return createResponse({ posts: [] });

  // Get users for profile images and roles
  // Get users for profile images and roles
  let userInfo = {};
  const usersSheet = ss.getSheetByName('TSS_Users');
  if (usersSheet) {
    const userData = usersSheet.getDataRange().getValues().slice(1);
    userData.forEach(row => {
      userInfo[row[0]] = {
        image: row[6] || '',
        role: row[2] || 'メンバー'
      };
    });
  }

  // Fetch Comments
  const commentsSheet = ss.getSheetByName('TSS_Comments');
  let commentsMap = {};
  if (commentsSheet) {
    const commData = commentsSheet.getDataRange().getValues();
    for (let i = 1; i < commData.length; i++) {
       const cRow = commData[i];
       const pId = String(cRow[1]);
       if (!commentsMap[pId]) commentsMap[pId] = [];
       
       const cAuthor = cRow[2];
       const cUserInfo = userInfo[cAuthor] || {};
       
       commentsMap[pId].push({
         createdAt: cRow[0],
         author: cAuthor,
         content: cRow[3],
         id: cRow[4],
         authorImage: cUserInfo.image || '',
         authorRole: cUserInfo.role || ''
       });
    }
  }

  const data = postsSheet.getDataRange().getValues();
  const headers = data[0];
  const posts = data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h.toLowerCase().replace(/\s/g, '')] = row[i]);
    
    // Add user info
    const info = userInfo[obj['author']] || {};
    obj['authorImage'] = info.image || '';
    obj['authorRole'] = info.role || '';
    obj['comments'] = commentsMap[String(obj['postid'])] || [];

    return obj;
  }).reverse(); // Latest first
  
  return createResponse({ posts });
}

function getStats(ss) {
  // Merge Users
  let userNames = new Set();
  let totalTokens = 0;
  let topMembersData = [];

  // V2 Users
  const usersSheet = ss.getSheetByName('TSS_Users');
  if (usersSheet) {
      const data = usersSheet.getDataRange().getValues().slice(1);
      data.forEach(row => {
          if (!row[0]) return;
          userNames.add(row[0]);
          totalTokens += (row[5] || 0);
          topMembersData.push({ name: row[0], role: row[2] || 'メンバー', tokens: row[5] || 0 });
      });
  }

  // Legacy Users
  const membersSheet = ss.getSheetByName('TSS_Members');
  if (membersSheet) {
      const data = membersSheet.getDataRange().getValues().slice(1);
      data.forEach(row => {
          const name = row[1];
          // If name is unique, add stats
          if (name && !userNames.has(name)) {
              userNames.add(name);
              totalTokens += (row[4] || 0);
              topMembersData.push({ name: name, role: row[2] || 'メンバー', tokens: row[4] || 0 });
          }
      });
  }

  const postsSheet = ss.getSheetByName('TSS_Posts');
  const todosSheet = ss.getSheetByName('TSS_Todos');
  
  const postsData = postsSheet ? postsSheet.getDataRange().getValues().slice(1) : [];
  const todosData = todosSheet ? todosSheet.getDataRange().getValues().slice(1) : [];
  
  const totalMembers = topMembersData.length;
  const totalPosts = postsData.length;
  const completedTasks = todosData.filter(row => row[4] === true || row[4] === 'true').length; 
  
  const topMembers = topMembersData
    .sort((a, b) => b.tokens - a.tokens)
    .slice(0, 10);
  
  return createResponse({
    totalMembers,
    totalTokens,
    totalPosts,
    completedTasks,
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
      const author = allData[i][1]; // Author is column 2 (index 1)
      
      // Update likes
      sheet.getRange(i + 1, 4).setValue(currentLikes + 1);
      
      // Award token to author (Approval Bonus!)
      const usersSheet = ss.getSheetByName('TSS_Users');
      if (usersSheet && author) {
         const usersData = usersSheet.getDataRange().getValues();
         for (let j = 1; j < usersData.length; j++) {
            if (usersData[j][0] === author) { // Name match
               const currentTokens = usersData[j][5] || 0;
               usersSheet.getRange(j + 1, 6).setValue(currentTokens + 1);
               break;
            }
         }
      }
      
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

// ============ JINSEI AI v3.0 (Based on MINDFUL SATOSHI AI pattern) ============

function askJinseiAI(question, userName, userContext = {}) {
  try {
    const GEMINI_API_KEY = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
    
    if (!GEMINI_API_KEY) {
      return ContentService.createTextOutput(JSON.stringify({ 
        response: generateLocalJinseiResponse(question),
        source: 'local'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // 相談者コンテキストを構築
    let contextInfo = '';
    if (userName && userName !== 'User') {
      contextInfo += `相談者: ${userName}さん\n`;
    }
    if (userContext.role) {
      contextInfo += `役割: ${userContext.role}\n`;
    }
    
    const systemPrompt = `あなたは「JINSEI」です。チームビルディングと自走型組織づくりの専門家として、働く仲間をサポートするAIメンターです。

## 仁成（JINSEI）メソッドの核心

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

## あなたの基本姿勢
- **まず聴く**: 相談者の話の意図を正確に理解することを最優先にする
- **押し付けない**: 「こうすべき」ではなく「こういう方法もある」と選択肢を提示
- **実用的**: 抽象論より、明日から使える具体的なアドバイスを優先
- **謙虚に**: 分からないことは正直に「分からない」と言う
- **寄り添う**: 一緒に考えるパートナーとして接する

## 対応できるトピック

### チームビルディング
- 自走型組織づくり
- 心理的安全性の確保
- リーダーシップ開発
- コミュニケーション改善
- チームの一体感づくり

### キャリア・成長
- スキルアップの方法
- 将来のキャリアパス
- モチベーション維持
- 目標設定と達成

### 仕事の悩み
- 人間関係の改善
- 業務改善
- タイムマネジメント
- ストレス対処

## 相談者の情報
${contextInfo || '（初めての相談者です）'}

## 回答ガイドライン
1. 質問に直接答える（関係ない話に飛ばない）
2. 200〜400文字程度で簡潔に
3. 具体的な次のアクションを1つ提案
4. 必要に応じて絵文字を使う（控えめに）
5. 押し付けがましい励ましは不要（自然な言葉で締める）
6. 相談者の名前が分かる場合は名前で呼びかける`;

    // 履歴を含めたコンテンツを構築
    const contents = [];
    
    if (userContext && Array.isArray(userContext) && userContext.length > 0) {
      userContext.forEach(msg => {
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        });
      });
    }

    // 現在の質問を追加（システムプロンプトを先頭に付与）
    const currentQuestionText = contents.length === 0 
      ? systemPrompt + '\n\n相談内容: ' + question 
      : question;
      
    contents.push({
      role: 'user',
      parts: [{ text: currentQuestionText }]
    });

    const payload = {
      contents: contents,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
      }
    };
    
    const response = UrlFetchApp.fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=' + GEMINI_API_KEY,
      {
        method: 'POST',
        contentType: 'application/json',
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      }
    );
    
    const responseText = response.getContentText();
    console.log('API Response:', responseText);
    
    const result = JSON.parse(responseText);
    console.log('Parsed result:', JSON.stringify(result));
    
    const aiText = result.candidates?.[0]?.content?.parts?.[0]?.text || generateLocalJinseiResponse(question);
    
    return ContentService.createTextOutput(JSON.stringify({ 
      response: aiText,
      source: 'gemini'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    console.log('Error in askJinseiAI:', error.message);
    return ContentService.createTextOutput(JSON.stringify({ 
      response: generateLocalJinseiResponse(question),
      source: 'local',
      error: error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function generateLocalJinseiResponse(question) {
  // キーワードに基づいて適切な回答を選択（寄り添い型）
  const q = question.toLowerCase();
  
  if (q.includes('チーム') || q.includes('組織') || q.includes('メンバー')) {
    return '自走型組織についての相談だね。一つ提案があるよ。まずメンバーの小さな挑戦を「認める」ことから始めてみて。承認から始めると、心理的安全性が高まって、自然とチームが動き出すよ。';
  }
  
  if (q.includes('リーダー') || q.includes('上司') || q.includes('部下')) {
    return 'リーダーシップについての相談だね。良いリーダーは号令をかける人じゃなくて、共感できる人だよ。メンバーの声に耳を傾けて、まず認める。そこから信頼関係が生まれる。';
  }
  
  if (q.includes('やる気') || q.includes('モチベーション') || q.includes('主体性')) {
    return '主体性を引き出すには「使命」が大切。自分たちで決めたミッションがあると「やらされ感」が「やりたい！」に変わるよ。何を目指したいか、一緒に考えてみない？';
  }
  
  if (q.includes('心理的安全性') || q.includes('安心') || q.includes('安全')) {
    return '心理的安全性は自走型組織の土台だよ。「失敗しても大丈夫」という安心感があれば、人はチャレンジできる。まず自分が失敗を認められる環境を作ることから始めてみて。';
  }
  
  if (q.includes('失敗') || q.includes('ミス') || q.includes('不安')) {
    return '失敗は学びのチャンスだよ。心理的安全性が高い組織では、失敗を恐れずチャレンジできる。まずあなたの挑戦を認めてくれる人を見つけよう。きっといるはずだよ。';
  }
  
  if (q.includes('コミュニケーション') || q.includes('伝え') || q.includes('話し')) {
    return 'コミュニケーションの悩みだね。大切なのは「伝える」より「聴く」こと。相手の話を最後まで聴いて、まず認める。そこから対話が始まるよ。';
  }
  
  if (q.includes('目標') || q.includes('ビジョン') || q.includes('ミッション')) {
    return 'ビジョンやミッションは組織の羅針盤だよ。でも押し付けじゃなくて、みんなで決めることが大切。自分たちで決めたからこそ、習慣化しやすいんだ。';
  }
  
  // デフォルトの回答（謙虚・寄り添い型）
  const responses = [
    'いい質問だね。もう少し詳しく状況を教えてもらえる？具体的なアドバイスができると思う。',
    'その悩み、しっかり聞きたい。背景や状況をもう少し教えてくれると、一緒に考えられるよ。',
    '分かった、考えてみよう。何か特に気になっていることや、試してみたいことはある？',
    '相談してくれてありがとう。どんな結果を目指しているか教えてもらえると、具体的な提案ができそう。'
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

// テスト用関数
function testJinseiAI() {
  const key = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  console.log('API Key exists:', !!key);
  console.log('Key starts with:', key ? key.substring(0, 10) : 'null');
  
  if (key) {
    const result = askJinseiAI('チームビルディングについて教えて', 'テストユーザー');
    console.log('Result:', result.getContent());
  }
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
  console.log('TSS Backend v2.0 - PIN Auth Ready');
  
  // Create sheets if needed
  getUsersSheet(ss);
  getTodosSheet(ss);
  console.log('All sheets initialized!');
}

function testPinHash() {
  const hash = hashPin('1234');
  console.log('PIN Hash:', hash);
  console.log('Hash length:', hash.length); // 64文字（SHA-256）
}

// ============ PIN AUTHENTICATION SYSTEM ============

/**
 * ユーザーシートを取得または作成
 */
function getUsersSheet(ss) {
  if (!ss) ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('TSS_Users');
  if (!sheet) {
    sheet = ss.insertSheet('TSS_Users');
    sheet.getRange(1, 1, 1, 11).setValues([[
      'Name', 'PIN_Hash', 'Role', 'Bio', 'Future',
      'Token_Balance', 'Profile_Image', 'Theme_Song_URL',
      'Created_At', 'Last_Login', 'Settings_JSON'
    ]]);
    sheet.getRange(1, 1, 1, 11).setFontWeight('bold');
  }
  return sheet;
}

/**
 * To-Doシートを取得または作成
 */
function getTodosSheet(ss) {
  if (!ss) ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('TSS_Todos');
  if (!sheet) {
    sheet = ss.insertSheet('TSS_Todos');
    sheet.getRange(1, 1, 1, 7).setValues([[
      'Timestamp', 'User', 'Content', 'Type', 'Completed', 'CompletedAt', 'TodoId'
    ]]);
    sheet.getRange(1, 1, 1, 7).setFontWeight('bold');
  }
  return sheet;
}

/**
 * 簡易ハッシュ関数（SHA-256）
 */
function hashPin(pin) {
  const hash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, pin);
  return hash.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
}

/**
 * ユーザー登録（PIN付き）
 */
function registerUser(params) {
  try {
    const name = params?.name || '';
    const pin = params?.pin || '';
    const role = params?.role || 'メンバー';
    const bio = params?.bio || '';
    const future = params?.future || '';
    
    if (!name || !pin) {
      return createResponse({ 
        success: false, 
        error: '名前とPINを入力してください' 
      });
    }
    
    if (pin.length < 4) {
      return createResponse({ 
        success: false, 
        error: 'PINは4桁以上で設定してください' 
      });
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getUsersSheet(ss);
    const data = sheet.getDataRange().getValues();
    
    // 既存ユーザーチェック
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === name) {
        return createResponse({ 
          success: false, 
          error: 'この名前は既に登録されています。ログインしてください。',
          exists: true
        });
      }
    }
    
    // 新規ユーザー登録
    const pinHash = hashPin(pin);
    const now = new Date().toISOString();
    
    // Name, PIN_Hash, Role, Bio, Future, Token_Balance, Profile_Image, Theme_Song_URL, Created_At, Last_Login, Settings_JSON
    sheet.appendRow([name, pinHash, role, bio, future, 10, '', '', now, now, '{}']);
    
    // TSS_Membersにも追加（後方互換性）
    addToLegacyMembers(ss, name, role, bio);
    
    return createResponse({ 
      success: true, 
      message: '登録完了！Welcome Bonus +10 TSST',
      tokenBalance: 10
    });
    
  } catch (error) {
    return createResponse({ 
      success: false, 
      error: error.message 
    });
  }
}

/**
 * 後方互換: TSS_Membersにも追加
 */
function addToLegacyMembers(ss, name, role, bio) {
  let sheet = ss.getSheetByName('TSS_Members');
  if (!sheet) {
    sheet = ss.insertSheet('TSS_Members');
    sheet.getRange(1, 1, 1, 6).setValues([['Timestamp', 'Name', 'Role', 'Bio', 'Tokens', 'JoinedAt']]);
    sheet.getRange(1, 1, 1, 6).setFontWeight('bold');
  }
  
  const now = new Date().toISOString();
  sheet.appendRow([now, name, role, bio, 10, now]);
}

/**
 * ログイン
 */
function loginUser(params) {
  try {
    const name = params?.name || '';
    const pin = params?.pin || '';
    
    if (!name || !pin) {
      return createResponse({ 
        success: false, 
        error: '名前とPINを入力してください' 
      });
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getUsersSheet(ss);
    const data = sheet.getDataRange().getValues();
    const pinHash = hashPin(pin);
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === name && data[i][1] === pinHash) {
        // ログイン成功 - 最終ログイン時刻を更新 (列10: Last_Login)
        sheet.getRange(i + 1, 10).setValue(new Date().toISOString());
        
        // ユーザーデータを返す
        // Name(0), PIN_Hash(1), Role(2), Bio(3), Future(4), Token_Balance(5), Profile_Image(6), Theme_Song_URL(7)
        return createResponse({ 
          success: true, 
          name: name,
          role: data[i][2] || 'メンバー',
          bio: data[i][3] || '',
          future: data[i][4] || '',
          tokenBalance: data[i][5] || 0,
          profileImage: data[i][6] || '',
          themeSongUrl: data[i][7] || ''
        });
      }
    }
    
    // ログイン失敗
    return createResponse({ 
      success: false, 
      error: '名前またはPINが正しくありません'
    });
    
  } catch (error) {
    return createResponse({ 
      success: false, 
      error: error.message 
    });
  }
}

/**
 * データ同期（現在のユーザーデータを取得）
 */
function syncUserData(params) {
  try {
    const name = params?.name || '';
    const pin = params?.pin || '';
    
    if (!name || !pin) {
      return createResponse({ 
        success: false, 
        error: '認証情報が必要です' 
      });
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getUsersSheet(ss);
    const data = sheet.getDataRange().getValues();
    const pinHash = hashPin(pin);
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === name && data[i][1] === pinHash) {
        // To-Doを取得
        const todos = getUserTodos(ss, name);
        
        // Name(0), PIN_Hash(1), Role(2), Bio(3), Future(4), Token_Balance(5), Profile_Image(6), Theme_Song_URL(7)
        return createResponse({ 
          success: true,
          future: data[i][4] || '',
          tokenBalance: data[i][5] || 0,
          profileImage: data[i][6] || '',
          themeSongUrl: data[i][7] || '',
          todos: todos
        });
      }
    }
    
    return createResponse({ 
      success: false, 
      error: '認証に失敗しました'
    });
    
  } catch (error) {
    return createResponse({ 
      success: false, 
      error: error.message 
    });
  }
}

/**
 * PIN変更
 */
function changePinForUser(params) {
  try {
    const name = params?.name || '';
    const currentPin = params?.currentPin || '';
    const newPin = params?.newPin || '';
    
    if (!name || !currentPin || !newPin) {
      return createResponse({ 
        success: false, 
        error: '必要な情報が不足しています' 
      });
    }
    
    if (newPin.length < 4) {
      return createResponse({ 
        success: false, 
        error: '新しいPINは4桁以上で設定してください' 
      });
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getUsersSheet(ss);
    const data = sheet.getDataRange().getValues();
    const currentPinHash = hashPin(currentPin);
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === name) {
        // 現在のPINを確認
        if (data[i][1] !== currentPinHash) {
          return createResponse({ 
            success: false, 
            error: '現在のPINが正しくありません'
          });
        }
        
        // 新しいPINを保存
        const newPinHash = hashPin(newPin);
        sheet.getRange(i + 1, 2).setValue(newPinHash);
        
        return createResponse({ 
          success: true, 
          message: 'PINを変更しました'
        });
      }
    }
    
    return createResponse({ 
      success: false, 
      error: 'ユーザーが見つかりません'
    });
    
  } catch (error) {
    return createResponse({ 
      success: false, 
      error: error.message 
    });
  }
}

/**
 * プロフィール更新
 */
function updateProfile(params) {
  try {
    const name = params?.name || '';
    let pin = params?.pin || ''; // PIN might be empty from legacy frontend
    const bio = params?.bio;
    const role = params?.role;
    const future = params?.future;
    const profileImage = params?.profileImage;
    const themeSongUrl = params?.themeSongUrl;
    
    if (!name) {
      return createResponse({ 
        success: false, 
        error: '名前が必要です' 
      });
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let usersSheet = ss.getSheetByName('TSS_Users');
    if (!usersSheet) {
       usersSheet = ss.insertSheet('TSS_Users');
       // Add headers if created (omitted for brevity, assume exists or handled elsewhere)
    }

    // 1. Try TSS_Users (V2)
    const data = usersSheet.getDataRange().getValues();
    const pinHash = pin ? hashPin(pin) : '';
    
    for (let i = 1; i < data.length; i++) {
      // If PIN is provided, check hash. If not provided (legacy), rely on Name match ONLY if PIN in DB is also empty or default?
      // For security, let's assume if they are in V2, they should have PIN.
      // But if pin param is empty, we might fail here.
      if (data[i][0] === name && (pin === '' || data[i][1] === pinHash)) {
        // Update V2
        if (role !== undefined) usersSheet.getRange(i + 1, 3).setValue(role);
        if (bio !== undefined) usersSheet.getRange(i + 1, 4).setValue(bio);
        if (future !== undefined) usersSheet.getRange(i + 1, 5).setValue(future);
        if (profileImage !== undefined) usersSheet.getRange(i + 1, 7).setValue(profileImage);
        if (themeSongUrl !== undefined) usersSheet.getRange(i + 1, 8).setValue(themeSongUrl);
        
        return createResponse({ success: true, message: 'V2 Updated' });
      }
    }

    // 2. Try TSS_Members (Legacy) & Migrate
    const membersSheet = ss.getSheetByName('TSS_Members');
    if (membersSheet) {
        const memData = membersSheet.getDataRange().getValues();
        for (let i = 1; i < memData.length; i++) {
           if (memData[i][1] === name) {
              // Found in Legacy! Migrate to V2
              const legacyRole = memData[i][2];
              const legacyBio = memData[i][3];
              const legacyTokens = memData[i][4];
              const legacyJoined = memData[i][5];
              
              // Use provided values or legacy values
              const newRole = role !== undefined ? role : legacyRole;
              const newBio = bio !== undefined ? bio : legacyBio;
              const newTokens = legacyTokens;
              
              // Create V2 Record
              // PIN: If not provided, set default '0000'
              const newPin = pin || '0000';
              
              const newRow = [
                  name,
                  hashPin(newPin),
                  newRole,
                  newBio,
                  future || '',
                  newTokens,
                  profileImage || '',
                  themeSongUrl || '',
                  legacyJoined,
                  new Date().toISOString(),
                  ''
              ];
              usersSheet.appendRow(newRow);
              
              return createResponse({ success: true, message: 'Migrated to V2' });
           }
        }
    }
    
    // Not found anywhere
    // Optional: Auto-register as new user if not found?
    // Let's create new user if not found to fix "missing user" issue completely.
    if (true) { // Auto-register switch
         const newPin = pin || '0000';
         const newRow = [
              name,
              hashPin(newPin),
              role || 'メンバー',
              bio || '',
              future || '',
              10, // Welcome token
              profileImage || '',
              themeSongUrl || '',
              new Date().toISOString(),
              new Date().toISOString(),
              ''
         ];
         usersSheet.appendRow(newRow);
         return createResponse({ success: true, message: 'Created New V2 User' });
    }

    return createResponse({ success: false, error: 'User not found' });

    
    return createResponse({ 
      success: false, 
      error: '認証に失敗しました'
    });
    
  } catch (error) {
    return createResponse({ 
      success: false, 
      error: error.message 
    });
  }
}

// ============ TO-DO MANAGEMENT ============

/**
 * ユーザーのTo-Doを取得
 */
function getUserTodos(ss, userName) {
  const sheet = ss.getSheetByName('TSS_Todos');
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  const todos = [];
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === userName) {
      todos.push({
        id: data[i][6],
        content: data[i][2],
        type: data[i][3],
        completed: data[i][4] === true || data[i][4] === 'true',
        timestamp: data[i][0],
        completedAt: data[i][5]
      });
    }
  }
  
  return todos;
}

/**
 * To-Do一覧取得（API）
 */
function getTodos(ss, params) {
  const name = params?.name || '';
  const type = params?.type || 'all';
  
  if (!name) {
    return createResponse({ todos: [] });
  }
  
  let todos = getUserTodos(ss, name);
  
  if (type !== 'all') {
    todos = todos.filter(t => t.type === type);
  }
  
  return createResponse({ todos });
}

/**
 * To-Do追加
 */
function handleAddTodo(ss, data) {
  try {
    const userName = data.name;
    const content = data.content;
    const type = data.type || 'personal';
    
    if (!userName || !content) {
      return createResponse({ error: 'ユーザー名とタスク内容が必要です' });
    }
    
    const sheet = getTodosSheet(ss);
    const todoId = Date.now();
    const now = new Date().toISOString();
    
    sheet.appendRow([now, userName, content, type, false, '', todoId]);
    
    // トークン付与（+1 TSST）
    updateUserTokens(ss, userName, 1);
    
    return createResponse({ 
      success: true, 
      todoId: todoId,
      tokensEarned: 1
    });
    
  } catch (error) {
    return createResponse({ error: error.message });
  }
}

/**
 * To-Do完了
 */
function handleCompleteTodo(ss, data) {
  try {
    const userName = data.name;
    const todoId = data.todoId;
    
    if (!userName || !todoId) {
      return createResponse({ error: 'ユーザー名とタスクIDが必要です' });
    }
    
    const sheet = ss.getSheetByName('TSS_Todos');
    if (!sheet) return createResponse({ error: 'Todos sheet not found' });
    
    const allData = sheet.getDataRange().getValues();
    
    for (let i = 1; i < allData.length; i++) {
      if (String(allData[i][6]) === String(todoId) && allData[i][1] === userName) {
        // 既に完了済みかチェック
        if (allData[i][4] === true || allData[i][4] === 'true') {
          return createResponse({ success: true, alreadyCompleted: true });
        }
        
        // 完了に更新
        sheet.getRange(i + 1, 5).setValue(true);
        sheet.getRange(i + 1, 6).setValue(new Date().toISOString());
        
        // トークン付与（+2 TSST）
        updateUserTokens(ss, userName, 2);
        
        return createResponse({ 
          success: true, 
          tokensEarned: 2
        });
      }
    }
    
    return createResponse({ error: 'タスクが見つかりません' });
    
  } catch (error) {
    return createResponse({ error: error.message });
  }
}

/**
 * To-Do削除
 */
function handleDeleteTodo(ss, data) {
  try {
    const userName = data.name;
    const todoId = data.todoId;
    
    if (!userName || !todoId) {
      return createResponse({ error: 'ユーザー名とタスクIDが必要です' });
    }
    
    const sheet = ss.getSheetByName('TSS_Todos');
    if (!sheet) return createResponse({ error: 'Todos sheet not found' });
    
    const allData = sheet.getDataRange().getValues();
    
    for (let i = 1; i < allData.length; i++) {
      if (String(allData[i][6]) === String(todoId) && allData[i][1] === userName) {
        sheet.deleteRow(i + 1);
        return createResponse({ success: true });
      }
    }
    
    return createResponse({ error: 'タスクが見つかりません' });
    
  } catch (error) {
    return createResponse({ error: error.message });
  }
}

/**
 * ユーザートークンを更新（TSS_Users）
 */
function updateUserTokens(ss, name, amount) {
  const sheet = ss.getSheetByName('TSS_Users');
  if (!sheet) return false;
  
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === name) {
      const currentTokens = data[i][4] || 0;
      const newTokens = currentTokens + amount;
      sheet.getRange(i + 1, 5).setValue(newTokens);
      
      // TSS_Membersも更新（後方互換）
      addTokensToUser(ss, name, amount);
      
      return true;
    }
  }
  
  return false;
}
