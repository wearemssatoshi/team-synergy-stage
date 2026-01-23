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
      // ============ ANNOUNCEMENTS ============
      case 'postAnnouncement':
        return handlePostAnnouncement(ss, data);
      // ============ SETTINGS (YouTube etc) ============
      case 'saveSettings':
        return handleSaveSettings(ss, data);
      // ============ TO-DO ============
      case 'addTodo':
        return handleAddTodo(ss, data);
      case 'completeTodo':
        return handleCompleteTodo(ss, data);
      case 'deleteTodo':
        return handleDeleteTodo(ss, data);
      // ============ SCHEDULE ============
      case 'addEvent':
        return handleAddEvent(ss, data);
      case 'deleteEvent':
        return handleDeleteEvent(ss, data);
      case 'deleteEvent':
        return handleDeleteEvent(ss, data);
      // ============ SMART SCHEDULE (v3.2) ============
      case 'createAdjustment':
        return handleCreateAdjustment(ss, data);
      case 'submitVote':
        return handleSubmitVote(ss, data);
      case 'finalizeAdjustment':
        return handleFinalizeAdjustment(ss, data);
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
          version: 'v5.1',
          name: 'TSS Backend Group Suite',
          features: ['Smart Schedule (GCal Sync)', 'Token History', 'PIN Auth', 'JINSEI AI'],
          deployedAt: new Date().toISOString()
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
      case 'getEvents':
        return getEvents(ss, e.parameter);
      case 'announcements':
        return getAnnouncements(ss);
      case 'settings':
        return getSettings(ss);
      case 'settings':
        return getSettings(ss);
      case 'getAdjustments':
        return getAdjustments(ss, e.parameter);
      case 'history':
        return handleGetMyStats(ss, e.parameter);
      
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

function handleSaveSettings(ss, data) {
  let sheet = ss.getSheetByName('TSS_Settings');
  if (!sheet) {
    sheet = ss.insertSheet('TSS_Settings');
    sheet.getRange(1, 1, 1, 3).setValues([['Key', 'Value', 'Updated_At']]);
    sheet.getRange(1, 1, 1, 3).setFontWeight('bold');
  }
  
  const key = data.key;
  const value = typeof data.value === 'object' ? JSON.stringify(data.value) : String(data.value);
  const now = new Date().toISOString();
  
  const allData = sheet.getDataRange().getValues();
  let found = false;
  
  // Update existing
  for (let i = 1; i < allData.length; i++) {
    if (allData[i][0] === key) {
      sheet.getRange(i + 1, 2).setValue(value);
      sheet.getRange(i + 1, 3).setValue(now);
      found = true;
      break;
    }
  }
  
  // Insert new
  if (!found) {
    sheet.appendRow([key, value, now]);
  }
  
  return createResponse({ success: true });
}

function getSettings(ss) {
  const sheet = ss.getSheetByName('TSS_Settings');
  const settings = {};
  
  if (sheet) {
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const key = data[i][0];
      let value = data[i][1];
      
      // Try to parse JSON if it looks like one
      try {
        if (value.startsWith('{') || value.startsWith('[')) {
          value = JSON.parse(value);
        }
      } catch (e) {}
      
      settings[key] = value;
    }
  }
  
  return createResponse({ settings: settings });
}

function handlePostAnnouncement(ss, data) {
  let sheet = ss.getSheetByName('TSS_Announcements');
  if (!sheet) {
    sheet = ss.insertSheet('TSS_Announcements');
    sheet.getRange(1, 1, 1, 6).setValues([['Timestamp', 'Content', 'Attachments', 'AnnouncementId', 'Author', 'Likes']]);
    sheet.getRange(1, 1, 1, 6).setFontWeight('bold');
  }
  
  const id = Date.now();
  const attachments = JSON.stringify(data.attachments || []);
  
  const row = [
    new Date().toISOString(),
    data.content,
    attachments,
    id,
    data.author || 'TSS運営',
    0 // Likes
  ];
  
  sheet.appendRow(row);
  return createResponse({ success: true, id: id });
}

function getAnnouncements(ss) {
  const sheet = ss.getSheetByName('TSS_Announcements');
  if (!sheet) return createResponse({ announcements: [] });
  
  const data = sheet.getDataRange().getValues();
  // Skip header, reverse to show latest first
  const items = data.slice(1).reverse().map(row => {
    let attachments = [];
    try {
      attachments = JSON.parse(row[2]);
    } catch (e) {}
    
    return {
      date: row[0],
      content: row[1],
      attachments: attachments,
      id: row[3],
      author: row[4] || 'TSS運営',
      likes: row[5] || 0
    };
  });
  
  return createResponse({ announcements: items });
}

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
  addTokensToUser(ss, data.author, 3, 'post', 'New Post Created');
  
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
  const result = addTokensToUser(ss, data.name, data.amount || 1, 'manual', 'Admin added token');
  return createResponse(result);
}

function addTokensToUser(ss, name, amount, action = 'manual', description = '') {
  const sheet = ss.getSheetByName('TSS_Members');
  if (!sheet) return { success: false, error: 'Members sheet not found' };
  
  // 1. Update Balance (Current Snapshot)
  let userFound = false;
  let newBalance = 0;
  
  // Legacy Sheet Update
  const allData = sheet.getDataRange().getValues();
  for (let i = 1; i < allData.length; i++) {
    if (allData[i][1] === name) {
      const currentTokens = allData[i][4] || 0;
      newBalance = currentTokens + amount;
      sheet.getRange(i + 1, 5).setValue(newBalance);
      userFound = true;
      break;
    }
  }
  
  // Update V2 Sheet (TSS_Users) with Total Earned Logic
  const v2Sheet = ss.getSheetByName('TSS_Users');
  if (v2Sheet) {
      // Ensure header exists for Total_Earned (Col 12 / Index 11)
      const header = v2Sheet.getRange(1, 12).getValue();
      if (header !== 'Total_Earned') {
          v2Sheet.getRange(1, 12).setValue('Total_Earned').setFontWeight('bold');
      }

      const v2Data = v2Sheet.getDataRange().getValues();
      for (let i = 1; i < v2Data.length; i++) {
          if (v2Data[i][0] === name) {
              const currentBalance = Number(v2Data[i][5] || 0); // Token_Balance (Col 6)
              const currentTotalEarned = Number(v2Data[i][11] || currentBalance); // Total_Earned (Col 12) - Fallback to balance if empty
              
              // Update Balance
              const updatedBalance = currentBalance + amount;
              v2Sheet.getRange(i + 1, 6).setValue(updatedBalance);
              newBalance = updatedBalance; // Prioritize V2 balance
              
              // Update Total Earned (Only if amount is positive)
              if (amount > 0) {
                  v2Sheet.getRange(i + 1, 12).setValue(currentTotalEarned + amount);
              }
              
              userFound = true;
              break;
          }
      }
  }
  
  if (!userFound) return { success: false, error: 'User not found' };

  // 2. Log Transaction (History)
  logTokenTransaction(ss, name, amount, action, description);
  
  return { success: true, newBalance: newBalance };
}

function logTokenTransaction(ss, user, amount, action, description) {
  let sheet = ss.getSheetByName('TSS_TokenLogs');
  if (!sheet) {
    sheet = ss.insertSheet('TSS_TokenLogs');
    sheet.getRange(1, 1, 1, 5).setValues([['Timestamp', 'User', 'Amount', 'Action', 'Description']]);
    sheet.getRange(1, 1, 1, 5).setFontWeight('bold');
  }
  
  const now = new Date().toISOString();
  sheet.appendRow([now, user, amount, action, description]);
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
            totalEarned: row[11] || row[5] || 0, // Col 12 is index 11
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
          const balance = row[5] || 0;
          const earned = row[11] || balance; // Col 12
          
          totalTokens += balance; // Current Balance Sum
          
          topMembersData.push({ 
              name: row[0], 
              role: row[2] || 'メンバー', 
              tokens: balance,
              totalEarned: earned
          });
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
              const balance = row[4] || 0;
              totalTokens += balance;
              topMembersData.push({ 
                  name: name, 
                  role: row[2] || 'メンバー', 
                  tokens: balance,
                  totalEarned: balance // Legacy fallback
              });
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
  
  // Calculate Total Issued from Users' Total Earned (More accurate/fast than logs)
  const totalTokensIssued = topMembersData.reduce((sum, m) => sum + (m.totalEarned || 0), 0);

  // Sort by Total Earned (Contribution) instead of Balance
  const topMembers = topMembersData
    .sort((a, b) => (b.totalEarned || 0) - (a.totalEarned || 0))
    .slice(0, 10);

  // Fetch Token Logs for Activity Stream
  const logSheet = ss.getSheetByName('TSS_TokenLogs');
  let recentActivity = [];

  if (logSheet) {
      const logData = logSheet.getDataRange().getValues();
      const logs = logData.slice(1);
      const last20 = logs.slice(-20).reverse();
      
      recentActivity = last20.map(row => ({
          timestamp: row[0],
          user: row[1],
          amount: row[2],
          action: row[3],
          description: row[4] || ''
      }));
  }
  
  return createResponse({
    totalMembers,
    totalTokens,
    totalTokensIssued, 
    totalPosts,
    completedTasks,
    topMembers,
    recentActivity
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
  const type = data.type || 'post'; // 'post' or 'announcement'
  const sheetName = type === 'announcement' ? 'TSS_Announcements' : 'TSS_Posts';
  const idColIndex = type === 'announcement' ? 3 : 4; // AnnouncementId: Col 4 (idx 3), PostId: Col 5 (idx 4)
  const likesColIndex = type === 'announcement' ? 5 : 3; // Likes: Col 6 (idx 5), Likes: Col 4 (idx 3)
  
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return createResponse({ error: 'Sheet not found' });
  
  const targetId = String(data.postId || data.id); // 'postId' for posts, 'id' for announcements
  const allData = sheet.getDataRange().getValues();
  
  for (let i = 1; i < allData.length; i++) {
    const rowId = String(allData[i][idColIndex]);
    
    if (rowId === targetId) {
      const currentLikes = Number(allData[i][likesColIndex] || 0);
      const author = allData[i][type === 'announcement' ? 4 : 1]; // Author col index
      
      // Update likes
      sheet.getRange(i + 1, likesColIndex + 1).setValue(currentLikes + 1);
      
      // Award token to author (Approval Bonus!) if it's a post (Announcements are usually admin)
      if (type === 'post') {
        addTokensToUser(ss, author, 1, 'like_received', `Post Liked (ID: ${targetId})`);
      }
      
      return createResponse({ success: true, likes: currentLikes + 1 });
    }
  }
  return createResponse({ error: 'Target not found' });
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
  addTokensToUser(ss, data.author, 1, 'comment', 'Commented on post');
  
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

// ============ TO-DO LIST HANDLERS ============

function handleAddTodo(ss, data) {
  const sheet = getTodosSheet(ss);
  
  const todoId = Date.now();
  const now = new Date().toISOString();
  
  // Columns: Timestamp, User, Content, Type, Completed, CompletedAt, TodoId
  const row = [
    now,
    data.user || 'Anonymous',
    data.content || '',
    data.type || 'daily',
    false,
    '',
    todoId
  ];
  
  sheet.appendRow(row);
  
  // Award token (Action Bonus)
  if (data.user) {
    addTokensToUser(ss, data.user, 1, 'task_add', 'Added new task');
  }
  
  return createResponse({ 
    success: true, 
    todoId: todoId, 
    tokenEarned: 1,
    message: 'Task added successfully' 
  });
}

function handleCompleteTodo(ss, data) {
  const sheet = getTodosSheet(ss);
  const allData = sheet.getDataRange().getValues();
  const targetId = String(data.todoId);
  const isCompleted = data.completed === true || data.completed === 'true'; // Toggle value from frontend
  
  for (let i = 1; i < allData.length; i++) {
    if (String(allData[i][6]) === targetId) { // TodoId column index 6
      // Update Completed status
      sheet.getRange(i + 1, 5).setValue(isCompleted);
      
      // Update CompletedAt
      const completedAt = isCompleted ? new Date().toISOString() : '';
      sheet.getRange(i + 1, 6).setValue(completedAt);
      
      // Award token if completed
      let tokenEarned = 0;
      if (isCompleted && data.user) {
        addTokensToUser(ss, data.user, 2, 'task_complete', 'Completed task');
        tokenEarned = 2;
      }
      
      return createResponse({ 
        success: true, 
        completed: isCompleted,
        tokenEarned: tokenEarned 
      });
    }
  }
  
  return createResponse({ error: 'Todo not found' });
}

function handleDeleteTodo(ss, data) {
  const sheet = getTodosSheet(ss);
  const allData = sheet.getDataRange().getValues();
  const targetId = String(data.todoId);
  
  for (let i = 1; i < allData.length; i++) {
    if (String(allData[i][6]) === targetId) {
      sheet.deleteRow(i + 1);
      return createResponse({ success: true, message: 'Todo deleted' });
    }
  }
  
  return createResponse({ error: 'Todo not found' });
}

function getTodos(ss, params) {
  const sheet = getTodosSheet(ss);
  const user = params.user || '';
  
  if (!user) return createResponse({ todos: [] });
  
  const data = sheet.getDataRange().getValues();
  const todos = [];
  
  // Columns: Timestamp, User, Content, Type, Completed, CompletedAt, TodoId
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[1] === user) {
      todos.push({
        id: row[6],
        text: row[2],
        type: row[3],
        completed: row[4] === true || row[4] === 'true',
        createdAt: row[0],
        completedAt: row[5]
      });
    }
  }
  
  // Sort by created time (desc)
  todos.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  // Group by type for frontend convenience if needed, but array is fine
  return createResponse({ todos });
}


// ============ JINSEI AI v3.0 (Based on MINDFUL SATOSHI AI pattern) ============

function askJinseiAI(question, userName, userContext = []) {
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
    
    const systemPrompt = `あなたは「JINSEI」です。チームビルディングと自走型組織づくりの専門家として、働く仲間をサポートするAIメンターです。

## JINSEIメソッドの哲学
- **自走型組織**: 指示待ちではなく、自ら考えて動くチームを作る
- **心理的安全性**: 「失敗しても大丈夫」という安心感が挑戦を生む
- **承認の力**: 否定から入らず、まず「認める」ことで信頼関係を築く
- **ミッション・ビジョン**: 「やらされ感」を「やりたい」に変える原動力

## あなたのスタンス
- 相談者の話を否定せず、まずは受け止めて承認する
- 抽象的な正論ではなく、明日から使える具体的なアクションを提案する
- 堅苦しい先生ではなく、頼れるパートナーとして接する
- 時にユーモアや絵文字を交えて、話しやすい雰囲気を作る

## 相談者の情報
${contextInfo}

## 回答のルール
1. 質問に対して、JINSEIメソッドの視点（自走・承認・心理的安全性）からアドバイスする
2. 長文になりすぎないよう、200〜400文字程度で簡潔にまとめる
3. 最後に「あなたはどう思う？」や「まずこれを試してみて」といった、次につながる言葉を添える`;

    // 履歴を含めたコンテンツを構築
    const contents = [];
    
    // システムプロンプトを最初のメッセージとして設定（Gemini 1.5/Pro系の一部パターン、またはUserメッセージとして工夫）
    // ここではMINDFUL同様、直近のプロンプトにコンテキストを埋め込む方式と、マルチターン履歴を組み合わせる
    
    // 過去の会話履歴を追加
    if (userContext && Array.isArray(userContext) && userContext.length > 0) {
      userContext.forEach(msg => {
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        });
      });
    }

    // 現在の質問を追加（システムプロンプトを付与してキャラ付けを強化）
    // 会話の最初、または毎回システムプロンプトを付与することでキャラクターを維持
    const currentQuestionText = contents.length === 0 
      ? systemPrompt + '\n\n相談内容: ' + question 
      : systemPrompt + '\n\n(継続会話) 相談内容: ' + question; 
      
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

// ============ SCHEDULE HANDLERS ============

function handleAddEvent(ss, data) {
  let sheet = ss.getSheetByName('TSS_Schedule');
  if (!sheet) {
    sheet = ss.insertSheet('TSS_Schedule');
    sheet.getRange(1, 1, 1, 7).setValues([['Timestamp', 'Title', 'Start', 'AllDay', 'Author', 'EventId', 'Type']]);
    sheet.getRange(1, 1, 1, 7).setFontWeight('bold');
  }
  
  const eventId = String(Date.now());
  const row = [
    new Date().toISOString(),
    data.title,
    data.start,
    data.allDay,
    data.author || 'Anonymous',
    eventId,
    data.type || 'shared' // Col 7: Type
  ];
  
  sheet.appendRow(row);
  
  // Reward for scheduling
  if (data.author) {
    addTokensToUser(ss, data.author, 1, 'schedule_add', 'Added schedule event');
  }
  
  return createResponse({ success: true, eventId: eventId, tokensEarned: 1 });
}

function handleDeleteEvent(ss, data) {
  const sheet = ss.getSheetByName('TSS_Schedule');
  if (!sheet) return createResponse({ error: 'Schedule sheet not found' });
  
  const allData = sheet.getDataRange().getValues();
  const targetId = String(data.eventId);
  
  for (let i = 1; i < allData.length; i++) {
    if (String(allData[i][5]) === targetId) { // EventId column index 5
      sheet.deleteRow(i + 1);
      return createResponse({ success: true, message: 'Event deleted' });
    }
  }
  return createResponse({ error: 'Event not found' });
}

function getEvents(ss, params) {
  const sheet = ss.getSheetByName('TSS_Schedule');
  if (!sheet) return createResponse({ events: [] });
  
  const requestingUser = params?.user || '';
  const data = sheet.getDataRange().getValues();
  
  // Columns: Timestamp[0], Title[1], Start[2], AllDay[3], Author[4], EventId[5], Type[6]
  const events = [];
  
  // Skip header
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const type = row[6] || 'shared'; // Default to shared
    const author = row[4];
    
    // Privacy Filter
    // 1. Official/Management -> Always Show
    // 2. Shared -> Always Show
    // 3. Personal -> Show ONLY if author matches requestingUser
    
    if (type === 'personal' && author !== requestingUser) {
        continue; // Skip other's personal events
    }
    
    events.push({
      id: row[5],
      title: row[1],
      start: row[2],
      allDay: row[3],
      author: author,
      type: type,
      createdAt: row[0]
    });
  }
  
  return createResponse({ events });
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
      'Created_At', 'Last_Login', 'Settings_JSON', 'Total_Earned', 'Email'
    ]]);
    sheet.getRange(1, 1, 1, 13).setFontWeight('bold');
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
    
    // Name, PIN_Hash, Role, Bio, Future, Token_Balance, Profile_Image, Theme_Song_URL, Created_At, Last_Login, Settings_JSON, Total_Earned, Email
    sheet.appendRow([name, pinHash, role, bio, future, 10, '', '', now, now, '{}', 10, '']);
    
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
          tokenBalance: data[i][5] || 0,
          profileImage: data[i][6] || '',
          themeSongUrl: data[i][7] || '',
          email: data[i][12] || ''
        });
      }
    }

    // --- LEGACY FALLBACK (Auto-Migrate) ---
    const legacySheet = ss.getSheetByName('TSS_Members');
    if (legacySheet) {
      const legacyData = legacySheet.getDataRange().getValues();
      for (let i = 1; i < legacyData.length; i++) {
        // Legacy: Name is col index 1
        if (legacyData[i][1] === name) {
             // Found in Legacy! Migrate to V2
             const newPin = pin; 
             const newRole = legacyData[i][2] || 'メンバー';
             const newBio = legacyData[i][3] || '';
             const newTokens = legacyData[i][4] || 0;
             const joinedAt = legacyData[i][5] || new Date().toISOString();
             
             const v2Row = [
                  name,
                  hashPin(newPin),
                  newRole,
                  newBio,
                  '', // Future
                  newTokens,
                  '', // Image
                  '', // ThemeSong
                  joinedAt,
                  new Date().toISOString(), // Last Login
                  ''
             ];
             sheet.appendRow(v2Row);
             
             return createResponse({
                 success: true,
                 name: name,
                 role: newRole,
                 bio: newBio,
                 future: '',
                 tokenBalance: newTokens,
                 profileImage: '',
                 themeSongUrl: '',
                 message: 'ようこそ！アカウントをアップグレードしました。次回からこのPINでログインできます。'
             });
        }
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
          profileImage: data[i][6] || '',
          themeSongUrl: data[i][7] || '',
          email: data[i][12] || '',
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
    const email = params?.email;
    
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
        if (profileImage !== undefined) usersSheet.getRange(i + 1, 7).setValue(profileImage);
        if (themeSongUrl !== undefined) usersSheet.getRange(i + 1, 8).setValue(themeSongUrl);
        if (email !== undefined) usersSheet.getRange(i + 1, 13).setValue(email); // Email is Col 13
        
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
               new Date().toISOString(), // Created
               new Date().toISOString(), // Last Login
               '{}', // Settings
               10, // Total Earned
               email || '' // Email
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

// End of file

// ============ SMART SCHEDULE IMPLEMENTATION ============

function handleCreateAdjustment(ss, data) {
  let sheet = getAdjustmentsSheet(ss);
  const adjustmentId = String(Date.now());
  
  // Candidates: Array of { start: ISO, end: ISO }
  // Participants: Array of Name Strings
  const candidates = JSON.stringify(data.candidates || []);
  const participants = JSON.stringify(data.participants || []);
  const initialResponses = JSON.stringify({});

  // Columns: AdjustmentId, Title, Author, Candidates, Participants, Responses, Status, FinalDate, Timestamp
  const row = [
    adjustmentId,
    data.title || '日程調整',
    data.author || 'Anonymous',
    candidates,
    participants,
    initialResponses,
    'adjusting',
    '',
    new Date().toISOString()
  ];
  
  sheet.appendRow(row);
  
  // Reward author
  if (data.author) {
    addTokensToUser(ss, data.author, 2, 'adjustment_create', 'Created schedule adjustment');
  }
  
  return createResponse({ success: true, adjustmentId: adjustmentId });
}

function handleSubmitVote(ss, data) {
  const sheet = getAdjustmentsSheet(ss);
  const allData = sheet.getDataRange().getValues();
  const targetId = String(data.adjustmentId);
  const user = data.user;
  // Votes: { "2024-01-01T10:00": "O", "2024-01-01T12:00": "X" }
  const votes = data.votes || {}; 
  
  for (let i = 1; i < allData.length; i++) {
    if (String(allData[i][0]) === targetId) { // AdjustmentId is Col 1
      let responses = {};
      try {
        responses = JSON.parse(allData[i][5]); // Responses is Col 6 (index 5)
      } catch (e) {}
      
      // Update user's vote
      responses[user] = votes;
      
      // Save back
      sheet.getRange(i + 1, 6).setValue(JSON.stringify(responses));
      
      return createResponse({ success: true, message: 'Vote submitted' });
    }
  }
  return createResponse({ error: 'Adjustment not found' });
}

function handleFinalizeAdjustment(ss, data) {
  const sheet = getAdjustmentsSheet(ss);
  const allData = sheet.getDataRange().getValues();
  const targetId = String(data.adjustmentId);
  const finalDate = data.finalDate; // { start: ISO, end: ISO }
  
  // Find event
  let eventRowIndex = -1;
  let eventTitle = '';
  let participants = [];
  
  for (let i = 1; i < allData.length; i++) {
    if (String(allData[i][0]) === targetId) {
      eventRowIndex = i;
      eventTitle = allData[i][1];
      try {
        participants = JSON.parse(allData[i][4]);
      } catch(e) { participants = []; }
      // Add author to participants if not included
      const author = allData[i][2];
      if (!participants.includes(author)) participants.push(author);
      break;
    }
  }
  
  if (eventRowIndex === -1) return createResponse({ error: 'Adjustment not found' });
  
  // 1. Get Emails
  const emailMap = getUserEmails(ss, participants);
  const guestEmails = participants.map(p => emailMap[p]).filter(e => e && e.includes('@'));
  const guestList = guestEmails.join(',');

  // 2. Create Google Calendar Event
  let calendarEventId = '';
  try {
    const startTime = new Date(finalDate.start);
    const endTime = new Date(finalDate.end);
    
    // Advanced options to send invites
    const options = {
      description: `TSSで調整された予定です。\n参加者: ${participants.join(', ')}\n\n(Created by Team Synergy Stage App)`,
      guests: guestList,
      sendInvites: true
    };
    
    const calEvent = CalendarApp.getDefaultCalendar().createEvent(eventTitle, startTime, endTime, options);
    calendarEventId = calEvent.getId();
    
  } catch (e) {
    return createResponse({ error: 'Calendar Error: ' + e.message });
  }
  
  // 3. Update Sheet Status
  sheet.getRange(eventRowIndex + 1, 7).setValue('finalized'); // Status
  sheet.getRange(eventRowIndex + 1, 8).setValue(JSON.stringify(finalDate)); // FinalDate
  
  // 4. Reward Participants
  participants.forEach(p => {
    addTokensToUser(ss, p, 5, 'adjustment_finalized', 'Schedule finalized');
  });
  
  return createResponse({ 
    success: true, 
    message: 'Event finalized and invites sent', 
    count: guestEmails.length 
  });
}

function handleGetMyStats(ss, params) {
  const user = params.user;
  if (!user) return ContentService.createTextOutput("User not specified");

  const usersSheet = ss.getSheetByName('TSS_Users');
  const logsSheet = ss.getSheetByName('TSS_TokenLogs');
  
  // 1. Get User Summary
  let balance = 0;
  let total = 0;
  if (usersSheet) {
    const data = usersSheet.getDataRange().getValues();
    for(let i=1; i<data.length; i++) {
        if(data[i][0] === user) {
            balance = data[i][5] || 0;
            total = data[i][11] || balance;
            break;
        }
    }
  }

  // 2. Get Logs
  let historyRows = [];
  if (logsSheet) {
      const data = logsSheet.getDataRange().getValues();
      // Timestamp, User, Amount, Action, Description
      // Filter for user and reverse
      for(let i=1; i<data.length; i++) {
          if(data[i][1] === user) {
              historyRows.push({
                  ts: new Date(data[i][0]).toLocaleString('ja-JP'),
                  amount: data[i][2],
                  action: data[i][3],
                  desc: data[i][4]
              });
          }
      }
  }
  historyRows.reverse();

  // 3. Generate HTML
  const html = `
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Token History for ${user}</title>
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700&family=Noto+Sans+JP:wght@400;700&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Noto Sans JP', sans-serif; background: #FFFDF5; padding: 20px; color: #1a1a1a; max-width: 600px; margin: 0 auto; }
            h1 { font-family: 'Montserrat', sans-serif; color: #D4AF37; font-size: 20px; text-align: center; }
            .card { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); margin-bottom: 20px; text-align: center; }
            .balance { font-size: 36px; font-weight: bold; color: #B8960C; font-family: 'Montserrat', sans-serif; }
            .label { font-size: 10px; color: #888; letter-spacing: 0.1em; margin-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th { text-align: left; color: #D4AF37; border-bottom: 2px solid #eee; padding: 8px; }
            td { border-bottom: 1px solid #eee; padding: 10px 8px; vertical-align: top; }
            .amount { font-weight: bold; font-family: 'Montserrat', sans-serif; }
            .plus { color: #D4AF37; }
            .minus { color: #EF4444; }
            .back-btn { display: block; text-align: center; margin-top: 20px; color: #888; text-decoration: none; font-size: 12px; }
        </style>
    </head>
    <body>
        <h1>${user}'s Token History</h1>
        
        <div class="card">
            <div class="label">CURRENT BALANCE</div>
            <div class="balance">${balance} <span style="font-size:14px">TSST</span></div>
            <div style="margin-top:10px; font-size:11px; color:#666;">
                生涯獲得総数: <b>${total}</b> TSST
            </div>
        </div>

        <h3>History Log</h3>
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Action</th>
                    <th style="text-align:right">Amount</th>
                </tr>
            </thead>
            <tbody>
                ${historyRows.length === 0 ? '<tr><td colspan="3" style="text-align:center; padding:20px;">No history yet</td></tr>' : ''}
                ${historyRows.map(row => `
                    <tr>
                        <td style="color:#666;">${row.ts.split(' ')[0]}<br><span style="font-size:10px">${row.ts.split(' ')[1]}</span></td>
                        <td>
                            <div style="font-weight:bold;">${row.action}</div>
                            <div style="font-size:10px; color:#666;">${row.desc}</div>
                        </td>
                        <td style="text-align:right;" class="amount ${row.amount > 0 ? 'plus' : 'minus'}">
                            ${row.amount > 0 ? '+' : ''}${row.amount}
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        
        <a href="javascript:history.back()" class="back-btn">← Back to App</a>
    </body>
    </html>
  `;

  return HtmlService.createHtmlOutput(html)
      .setTitle(`Token History - ${user}`)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getAdjustments(ss, params) {
  const sheet = getAdjustmentsSheet(ss);
  const user = params.user || '';
  const data = sheet.getDataRange().getValues();
  const result = [];
  
  // Helper to check if user is participant
  const isRelated = (author, parts) => {
    if (author === user) return true;
    if (parts.includes(user)) return true;
    return false;
  };
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    let participants = [];
    try { participants = JSON.parse(row[4]); } catch(e){}
    
    if (isRelated(row[2], participants)) {
      result.push({
        id: row[0],
        title: row[1],
        author: row[2],
        candidates: JSON.parse(row[3] || '[]'),
        participants: participants,
        responses: JSON.parse(row[5] || '{}'),
        status: row[6],
        finalDate: JSON.parse(row[7] || 'null'),
        timestamp: row[8]
      });
    }
  }
  
  return createResponse({ adjustments: result.reverse() });
}

// Helper: Get Adjustment Sheet
function getAdjustmentsSheet(ss) {
  let sheet = ss.getSheetByName('TSS_Adjustments');
  if (!sheet) {
    sheet = ss.insertSheet('TSS_Adjustments');
    // AdjustmentId, Title, Author, Candidates, Participants, Responses, Status, FinalDate, Timestamp
    sheet.getRange(1, 1, 1, 9).setValues([[
      'AdjustmentId', 'Title', 'Author', 'Candidates', 'Participants', 'Responses', 'Status', 'FinalDate', 'Timestamp'
    ]]);
    sheet.getRange(1, 1, 1, 9).setFontWeight('bold');
  }
  return sheet;
}

// Helper: Get Emails for list of names
function getUserEmails(ss, names) {
  const usersSheet = ss.getSheetByName('TSS_Users');
  const data = usersSheet.getDataRange().getValues();
  const map = {};
  
  // Name is col 0, Email is col 12
  for (let i = 1; i < data.length; i++) {
    const n = data[i][0];
    const e = data[i][12];
    if (names.includes(n) && e) {
      map[n] = e;
    }
  }
  return map;
}

// Helper for Legacy Member compat (if needed later)

