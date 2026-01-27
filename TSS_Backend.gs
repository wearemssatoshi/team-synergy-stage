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

const APP_VERSION = 'v9.3'; // v9.3 Photo Persistence + Calendar UI Edition

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    switch (data.action) {
      case 'register':
        return registerUser(data);
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
      // ============ SMART SCHEDULE (v3.2) ============
      case 'createAdjustment':
        return handleCreateAdjustment(ss, data);
      case 'submitVote':
        return handleSubmitVote(ss, data);
      case 'finalizeAdjustment':
        return handleFinalizeAdjustment(ss, data);
      case 'deleteAdjustment':
        return handleDeleteAdjustment(ss, data);
      // ============ ATTENDANCE ============
      case 'attendance':
        return handleAttendance(ss, data);
      // ============ v9.3 GOOGLE DRIVE PHOTO UPLOAD ============
      case 'uploadProfileImage':
        return handleUploadProfileImage(ss, data);
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
          version: APP_VERSION,
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
    sheet.getRange(1, 1, 1, 7).setValues([['Timestamp', 'Content', 'Attachments', 'AnnouncementId', 'Author', 'Likes', 'Likers']]);
    sheet.getRange(1, 1, 1, 7).setFontWeight('bold');
  }
  
  const id = Date.now();
  const attachments = JSON.stringify(data.attachments || []);
  
  const row = [
    new Date().toISOString(),
    data.content,
    attachments,
    id,
    data.author || 'TSS運営',
    0, // Likes
    '[]' // Likers - v9.2 Persistence
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
    
    // Parse Likers for v9.2 persistence
    let likers = [];
    try {
      likers = JSON.parse(row[6] || '[]');
    } catch (e) {}
    
    return {
      date: row[0],
      content: row[1],
      attachments: attachments,
      id: row[3],
      author: row[4] || 'TSS運営',
      likes: likers.length > 0 ? likers.length : (row[5] || 0),
      likedBy: likers // v9.2: Return who liked for frontend
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
    sheet.getRange(1, 1, 1, 6).setValues([['Timestamp', 'Author', 'Content', 'Likes', 'PostId', 'Likers']]);
    sheet.getRange(1, 1, 1, 6).setFontWeight('bold');
  }
  
  const postId = Date.now();
  const row = [
    new Date().toISOString(),
    data.author,
    data.content,
    0,
    postId,
    '[]' // Initial Likers list
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

/**
 * Wrapper for backward compatibility.
 * Delegates to the new Log-First architecture.
 */
function addTokensToUser(ss, name, amount, action = 'manual', description = '', relatedId = '') {
  return processTokenTransaction(ss, name, amount, action, description, relatedId);
}

/**
 * Counts how many times a user has received tokens for a specific action and related object.
 * Used for capping rewards (e.g., 10 rewards per post).
 */
function countRewardInstances(ss, userId, actionType, relatedId) {
  const logSheet = ss.getSheetByName('TSS_TokenLogs');
  if (!logSheet) return 0;
  
  const data = logSheet.getDataRange().getValues();
  let count = 0;
  const RIDString = String(relatedId);
  
  // Columns: [Timestamp, TransactionId, User_Id, Action_Type, Amount, Related_Id, Description]
  // idx: 0, 1, 2 (User_Id), 3 (Action_Type), 4, 5 (Related_Id), 6
  for (let i = 1; i < data.length; i++) {
    if (data[i][2] == userId && data[i][3] == actionType && String(data[i][5]) == RIDString) {
      count++;
    }
  }
  return count;
}

/**
 * Core Token Logic: Log-First Architecture (Event Sourcing)
 * 1. Append to TSS_TokenLogs (Immutable Fact)
 * 2. Update TSS_Users (Derived State)
 */
function processTokenTransaction(ss, userId, amount, actionType, description, relatedId = "") {
  try {
    const logSheet = getOrInitLogSheet(ss);
    const userSheet = ss.getSheetByName('TSS_Users');
    
    // 1. PREPARE LOG ENTRY
    const timestamp = new Date().toISOString();
    const transactionId = Utilities.getUuid();
    
    // Columns: [Timestamp, TransactionId, User_Id, Action_Type, Amount, Related_Id, Description]
    const logRow = [
      timestamp,
      transactionId,
      userId,
      actionType,
      amount,
      relatedId,
      description
    ];
    
    // 2. WRITE TO LOG (The Source of Truth)
    logSheet.appendRow(logRow);
    
    // 3. UPDATE STATE (View)
    if (!userSheet) {
      // Fallback for legacy if V2 sheet missing
      updateLegacyMemberSheet(ss, userId, amount);
      return { success: true, newBalance: 0, message: "Logged, but State sheet not found." };
    }

    let newBalance = 0;
    const userRowIndex = findUserRowIndex(userSheet, userId);
    
    if (userRowIndex > 0) {
      const balanceRange = userSheet.getRange(userRowIndex, 6); // Col F (Token_Balance)
      const totalEarnedRange = userSheet.getRange(userRowIndex, 12); // Col L (Total_Earned)
      
      let currentBalance = Number(balanceRange.getValue()) || 0;
      let currentTotal = Number(totalEarnedRange.getValue()) || 0;
      
      newBalance = currentBalance + amount;
      
      // Update Balance
      balanceRange.setValue(newBalance);
      
      // Update Total Earned (Only if positive - Lifetime Accumulation)
      // We never subtract from "Lifetime Earnings" even if they spend tokens
      if (amount > 0) {
        totalEarnedRange.setValue(currentTotal + amount);
      }
      
      // Update Last Activity
      userSheet.getRange(userRowIndex, 13).setValue(timestamp); // Col M
      
    } else {
      console.error("User not found in TSS_Users: " + userId);
      // Fallback to legacy
      updateLegacyMemberSheet(ss, userId, amount);
      return { success: true, newBalance: amount, warning: "User not in State sheet" };
    }
    
    return { success: true, newBalance: newBalance };
    
  } catch (err) {
    console.error("Token Transaction Error: " + err.message);
    return { success: false, error: err.message };
  }
}

function getOrInitLogSheet(ss) {
  let sheet = ss.getSheetByName('TSS_TokenLogs');
  if (!sheet) {
    sheet = ss.insertSheet('TSS_TokenLogs');
    // New Schema v2
    sheet.getRange(1, 1, 1, 7).setValues([['Timestamp', 'TransactionId', 'User_Id', 'Action_Type', 'Amount', 'Related_Id', 'Description']]);
    sheet.getRange(1, 1, 1, 7).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function findUserRowIndex(sheet, userId) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == userId) {
      return i + 1;
    }
  }
  return -1;
}

function updateLegacyMemberSheet(ss, name, amount) {
  const sheet = ss.getSheetByName('TSS_Members');
  if (!sheet) return;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === name) {
      const current = Number(data[i][4] || 0);
      sheet.getRange(i + 1, 5).setValue(current + amount);
      break;
    }
  }
}

/**
 * Self-Healing: Rebuilds State from Logs
 * Re-calculates balances based on the immutable log history.
 * Supports both log schemas (Legacy 5-col and New 7-col).
 */
function recalibrateAllUserBalances() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName('TSS_TokenLogs');
  const userSheet = ss.getSheetByName('TSS_Users');
  
  if (!logSheet || !userSheet) return "Sheets not found";
  
  // 1. Aggregate from Logs
  const logData = logSheet.getDataRange().getValues().slice(1);
  let stats = {}; // { userId: { balance: 0, total: 0 } }
  
  logData.forEach(row => {
    let uid, amt;
    
    // Heuristic for Schema Version
    // Old: [Time, User, Amount, Action, Desc] - Amount is at index 2 (and is Number)
    // New: [Time, TxId, User, Action, Amount, ...] - User is at index 2 (String)
    
    const valAtIndex2 = row[2];
    
    if (typeof valAtIndex2 === 'number' || (!isNaN(Number(valAtIndex2)) && valAtIndex2 !== '')) {
       // OLD Schema detected
       uid = row[1];
       amt = Number(row[2]);
    } else {
       // NEW Schema assumed
       uid = row[2];
       amt = Number(row[4]);
    }
    
    if (!uid) return;
    if (isNaN(amt)) amt = 0;
    
    if (!stats[uid]) stats[uid] = { balance: 0, total: 0 };
    
    stats[uid].balance += amt;
    if (amt > 0) stats[uid].total += amt;
  });
  
  // 2. Update User Sheet
  const userData = userSheet.getDataRange().getValues();
  let updateCount = 0;
  
  for (let i = 1; i < userData.length; i++) {
    const uid = userData[i][0];
    if (stats[uid]) {
      // Update Balance (Col F / 6)
      userSheet.getRange(i + 1, 6).setValue(stats[uid].balance);
      
      // Update Total (Col L / 12) - Note: Recalculated total might differ if manual edits happened to sheet
      // We trust the LOG as truth.
      userSheet.getRange(i + 1, 12).setValue(stats[uid].total);
      updateCount++;
    }
  }
  
  return `Recalibration Complete. Updated ${updateCount} users.`;
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
    
    // Unified ID key for frontend
    obj['id'] = String(obj['postid'] || ''); 
    
    // Parse Likers
    let likers = [];
    try {
        likers = JSON.parse(row[5] || '[]'); // Col 6 is Likers
    } catch(e) {}
    
    obj['likedBy'] = likers;
    obj['likes'] = likers.length > 0 ? likers.length : Number(obj['likes'] || 0); // Trust valid likers list count if available

    // Add user info
    const info = userInfo[obj['author']] || {};
    obj['authorImage'] = info.image || '';
    obj['authorRole'] = info.role || '';
    obj['comments'] = commentsMap[String(obj['id'])] || [];

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
          const image = row[6] || ''; // Col 7 (Profile Image)
          
          totalTokens += balance; // Current Balance Sum
          
          topMembersData.push({ 
              name: row[0], 
              role: row[2] || 'メンバー', 
              tokens: balance,
              totalEarned: earned,
              image: image
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
                  totalEarned: balance, // Legacy fallback
                  image: ''
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
      // Build userId -> userName mapping from TSS_Users
      let userIdToName = {};
      if (usersSheet) {
          const userData = usersSheet.getDataRange().getValues().slice(1);
          userData.forEach(row => {
              const name = row[0];
              const hashedId = row[1]; // Column B contains hashed userId
              if (name && hashedId) {
                  userIdToName[hashedId] = name;
                  userIdToName[name] = name; // Also map name to itself
              }
          });
      }
      
      const logData = logSheet.getDataRange().getValues();
      const logs = logData.slice(1);
      const last20 = logs.slice(-20).reverse();
      
      recentActivity = last20.map(row => {
          const rawUser = row[1];
          // Resolve hashed ID to actual name, fallback to raw value
          const userName = userIdToName[rawUser] || rawUser;
          
          return {
              timestamp: row[0],
              user: userName,
              amount: row[2],
              action: row[3],
              description: row[4] || ''
          };
      });
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
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // 10s wait

    const type = data.type || 'post'; 
    const sheetName = type === 'announcement' ? 'TSS_Announcements' : 'TSS_Posts';
    const idColIndex = type === 'announcement' ? 3 : 4; 
    const likesColIndex = type === 'announcement' ? 5 : 3; 
    const likersColIndex = type === 'announcement' ? 6 : 5; // v9.2: Both have Likers column now
    
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return createResponse({ error: 'Sheet not found' });
    
    // Ensure ID is treated as string for comparison
    const targetId = String(data.postId || data.id || ''); 
    const liker = data.user || 'Anonymous';
    
    if (!targetId) return createResponse({ error: 'No ID provided' });

    const allData = sheet.getDataRange().getValues();
    
    for (let i = 1; i < allData.length; i++) {
      // Force string comparison for PostId
      const rowId = String(allData[i][idColIndex]);
      
      if (rowId === targetId) {
        let currentLikes = Number(allData[i][likesColIndex] || 0);
        const author = allData[i][type === 'announcement' ? 4 : 1];
        
        // --- v9.2 Persistence Logic (Both Posts and Announcements) ---
        let likers = [];
        try {
            likers = JSON.parse(allData[i][likersColIndex] || '[]');
        } catch(e) {}
        
        // Add if unique
        if (!likers.includes(liker)) {
            likers.push(liker);
            
            // Update Sheet
            sheet.getRange(i + 1, likersColIndex + 1).setValue(JSON.stringify(likers));
            sheet.getRange(i + 1, likesColIndex + 1).setValue(likers.length); // Sync count
            currentLikes = likers.length;
        } else {
             return createResponse({ success: true, likes: currentLikes, message: 'Already liked', likedBy: likers });
        }
        
        SpreadsheetApp.flush(); // Ensure commit
        
        // 2. Award tokens (v9.2: Both Post and Announcement)
        const existingRewards = countRewardInstances(ss, liker, 'like_bonus', targetId);
        if (existingRewards < 10) {
          addTokensToUser(ss, liker, 1, 'like_bonus', `Like Bonus (ID: ${targetId})`, targetId);
          if (type === 'post') {
            addTokensToUser(ss, author, 1, 'like_received', `Post Liked (ID: ${targetId})`, targetId);
          }
        }
        
        return createResponse({ success: true, likes: currentLikes, likedBy: likers, tokensAwarded: existingRewards < 10 });
      }
    }
    return createResponse({ error: 'Target ID not found: ' + targetId });
  } catch(e) {
    return createResponse({ error: 'Like failed: ' + e.message });
  } finally {
    lock.releaseLock();
  }
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
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sheet = getTodosSheet(ss);
    sheet.getRange('G:G').setNumberFormat('0'); // TodoId is Col 7
    const allData = sheet.getDataRange().getDisplayValues(); 
  const isCompleted = data.completed === true || data.completed === 'true';
  
  for (let i = 1; i < allData.length; i++) {
    if (allData[i][6] === targetId) { // TodoId col 6
      sheet.getRange(i + 1, 5).setValue(isCompleted);
      const completedAt = isCompleted ? new Date().toISOString() : '';
      sheet.getRange(i + 1, 6).setValue(completedAt);
      SpreadsheetApp.flush();
      
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
  } catch (e) {
    return createResponse({ error: 'Todo complete error: ' + e.message });
  } finally {
    lock.releaseLock();
  }
}

function handleDeleteTodo(ss, data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sheet = getTodosSheet(ss);
    sheet.getRange('G:G').setNumberFormat('0');
    const allData = sheet.getDataRange().getDisplayValues();
  const targetId = String(data.todoId);
  
  for (let i = 1; i < allData.length; i++) {
    if (allData[i][6] === targetId) {
      sheet.deleteRow(i + 1);
      SpreadsheetApp.flush();
      return createResponse({ success: true, message: 'Todo deleted' });
    }
  }
  return createResponse({ error: 'Todo not found' });
  } catch (e) {
    return createResponse({ error: 'Todo delete error: ' + e.message });
  } finally {
    lock.releaseLock();
  }
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
        headers: { 'Content-Type': 'application/json' }, // Added standard headers
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
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
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
    SpreadsheetApp.flush();
    
    // Reward for scheduling
    if (data.author) {
      addTokensToUser(ss, data.author, 1, 'schedule_add', 'Added schedule event');
    }
    
    return createResponse({ success: true, eventId: eventId, tokensEarned: 1 });
  } catch (e) {
    return createResponse({ error: 'Add Event Failed: ' + e.message });
  } finally {
    lock.releaseLock();
  }
}

function handleDeleteEvent(ss, data) {
  const sheet = ss.getSheetByName('TSS_Schedule');
  if (!sheet) return createResponse({ error: 'Schedule sheet not found' });
  
  const allData = sheet.getDataRange().getDisplayValues();
  const targetId = String(data.eventId);
  
  for (let i = 1; i < allData.length; i++) {
    if (allData[i][5] === targetId) { // EventId is col 5
      sheet.deleteRow(i + 1);
      SpreadsheetApp.flush();
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
  const events = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const type = row[6] || 'shared';
    const author = row[4];
    const allDayInput = row[3];
    
    // Explicitly handle boolean or string boolean
    const isAllDay = (allDayInput === true || allDayInput === 'true' || allDayInput === 'TRUE');
    
    if (type === 'personal' && author !== requestingUser) {
        continue;
    }
    
    events.push({
      id: row[5],
      title: row[1],
      start: row[2],
      allDay: isAllDay,
      author: author,
      type: type,
      createdAt: row[0]
    });
  }
  
  // Safe Sort by Date (Handle Invalid Dates)
  events.sort((a, b) => {
    const dateA = new Date(a.start);
    const dateB = new Date(b.start);
    if (isNaN(dateA.getTime())) return 1; // Push invalid to end
    if (isNaN(dateB.getTime())) return -1;
    return dateA - dateB;
  });
  
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
    sheet.getRange(1, 1, 1, 13).setValues([[
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
 * v9.1: Name-only sync + full profile data return
 */
function syncUserData(params) {
  try {
    const name = params?.name || '';
    
    if (!name) {
      return createResponse({ 
        success: false, 
        error: 'ユーザー名が必要です' 
      });
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getUsersSheet(ss);
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === name) {
        // To-Doを取得
        const todos = getUserTodos(ss, name);
        
        // Name(0), PIN_Hash(1), Role(2), Bio(3), Future(4), Token_Balance(5), Profile_Image(6), Theme_Song_URL(7)
        return createResponse({ 
          success: true,
          user: {
            name: data[i][0],
            role: data[i][2] || 'メンバー',
            bio: data[i][3] || '',
            future: data[i][4] || '',
            tokens: data[i][5] || 0,
            image: data[i][6] || '',
            themeSongUrl: data[i][7] || '',
            email: data[i][12] || ''
          },
          todos: todos
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
  // Concurrency Lock: Prevent overwrite if multiple users vote simultaneously
  const lock = LockService.getScriptLock();
  try {
      lock.waitLock(10000); // Wait up to 10 seconds
  } catch (e) {
      return createResponse({ error: 'Server busy, please try again.' });
  }

  try {
      const sheet = getAdjustmentsSheet(ss);
      sheet.getRange('A:A').setNumberFormat('0'); // Force plain number format
      const allData = sheet.getDataRange().getDisplayValues(); 
      const targetId = String(data.adjustmentId);
      const user = data.user;
      const votes = data.votes || {}; 
      
      for (let i = 1; i < allData.length; i++) {
        if (allData[i][0] === targetId) {
          let responses = {};
          try {
            responses = JSON.parse(allData[i][5] || '{}');
          } catch (e) { responses = {}; }
          
          // Update user's vote
          responses[user] = votes;
          
          // Save back
          sheet.getRange(i + 1, 6).setValue(JSON.stringify(responses));
          
          // --- Gamification: Participation Bonus (First Vote) ---
          const existingRewards = countRewardInstances(ss, user, 'vote_bonus', targetId);
          let tokenMsg = '';
          if (existingRewards < 1) {
             addTokensToUser(ss, user, 1, 'vote_bonus', `Vote Participation (ID: ${targetId})`, targetId);
             tokenMsg = ' (+1 TSST)';
          }

          return createResponse({ success: true, message: 'Vote submitted' + tokenMsg, tokensEarned: existingRewards < 1 ? 1 : 0 });
        }
      }
      return createResponse({ error: 'Adjustment not found' });
  } finally {
      lock.releaseLock();
  }
}

function handleFinalizeAdjustment(ss, data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000); // 15 seconds for heavy sync
    
    const sheet = getAdjustmentsSheet(ss);
    // Ensure column A (ID) is formatted as plain number to prevent 1.7E+12 conversion
    sheet.getRange('A:A').setNumberFormat('0'); 
    
    // Now read data inside the lock to ensure it's fresh
    const allData = sheet.getDataRange().getDisplayValues();
    const targetId = String(data.adjustmentId);
    const finalDate = data.finalDate;
    
    if (!finalDate) return createResponse({ error: 'Final date is missing' });

    let eventRowIndex = -1;
    let eventTitle = '';
    let participants = [];
    let author = '';
    
    for (let i = 1; i < allData.length; i++) {
      if (allData[i][0] === targetId) {
        eventRowIndex = i;
        eventTitle = allData[i][1];
        author = allData[i][2];
        try {
          const rawParts = allData[i][4];
          participants = typeof rawParts === 'string' && rawParts.startsWith('[') ? JSON.parse(rawParts) : [];
        } catch(e) { participants = []; }
        break;
      }
    }
    
    // 1. Get Emails for Guests
    const emailMap = getUserEmails(ss, participants);
    const guestEmails = participants.map(p => emailMap[p]).filter(e => e && e.includes('@'));
    const guestList = guestEmails.join(',');

    let calendarEventId = ''; // Declare here to avoid ReferenceError

  // 2. Update Sheet Status (Adjustment Status)
  sheet.getRange(eventRowIndex + 1, 7).setValue('finalized'); // Status is Col 7
  sheet.getRange(eventRowIndex + 1, 8).setValue(JSON.stringify(finalDate)); // FinalDate is Col 8
  
  // --- SYNC TO APP CALENDAR (TSS_Schedule) --- 
  // DO THIS FIRST OR AT LEAST BEFORE CALENDAR API TO ENSURE APP SYNC
  let scheduleSheet = ss.getSheetByName('TSS_Schedule');
  if (!scheduleSheet) {
    scheduleSheet = ss.insertSheet('TSS_Schedule');
    scheduleSheet.getRange(1, 1, 1, 7).setValues([['Timestamp', 'Title', 'Start', 'AllDay', 'Author', 'EventId', 'Type']]);
    scheduleSheet.getRange(1, 1, 1, 7).setFontWeight('bold');
  }

  // Columns: Timestamp[0], Title[1], Start[2], AllDay[3], Author[4], EventId[5], Type[6]
  const eventId = calendarEventId || ('adj-' + targetId);
  scheduleSheet.appendRow([
      new Date().toISOString(),
      eventTitle,
      finalDate.start,
      false, // Adjustments are usually timed
      author,
      eventId,
      'shared' 
  ]);
  
  SpreadsheetApp.flush(); // Commit data to spreadsheet immediately

    // 3. Create Google Calendar Event (Optional / Failure should NOT block app sync)
    try {
      const startTime = new Date(finalDate.start);
      const endTime = new Date(finalDate.end);
      
      let description = `【TSS日程調整 確定】\n\n`;
      description += `タイトル: ${eventTitle}\n`;
      description += `決定日時: ${Utilities.formatDate(startTime, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm')} - ${Utilities.formatDate(endTime, 'Asia/Tokyo', 'HH:mm')}\n`;
      description += `参加者: ${participants.join(', ')}\n`;
      description += `作成者: ${author}\n\n`;
      description += `--------------------------------\n`;
      description += `Team Synergy Stage Appにより自動作成\n`;
      
      if (guestEmails.length === 0) {
          description += `\n⚠️ 【注意】参加者のメールアドレスが登録されていないため、カレンダー招待は送信されませんでした。\n各自でカレンダーに登録してください。`;
      }

      const options = {
        description: description,
        guests: guestList,
        sendInvites: (guestEmails.length > 0)
      };
      
      const calEvent = CalendarApp.getDefaultCalendar().createEvent(eventTitle, startTime, endTime, options);
      calendarEventId = calEvent.getId();
      
      // Update the eventId in schedule sheet by finding the exact row
      if (calendarEventId) {
          const freshData = scheduleSheet.getDataRange().getDisplayValues();
          for (let k = freshData.length - 1; k >= 1; k--) {
              if (String(freshData[k][5]) === ('adj-' + targetId)) {
                  scheduleSheet.getRange(k + 1, 6).setValue(calendarEventId);
                  break;
              }
          }
      }
    
  } catch (e) {
    console.error('Calendar Error (Non-Fatal for App Sync): ' + e.message);
    // Continue even after calendar error
  }


  // 4. Reward Participants (Big Synergy Bonus)
  participants.forEach(p => {
    // Using new Token Architecture
    processTokenTransaction(ss, p, 5, 'adjustment_finalized', `Schedule Finalized: ${eventTitle}`, targetId);
  });
  
  return createResponse({ 
    success: true, 
    message: 'Event finalized, synced to Calendar & App', 
    count: guestEmails.length,
    calendarEventId: calendarEventId
  });
  } catch (e) {
    console.error('Finalize Adjustment failed: ' + e.message);
    return createResponse({ error: 'Finalize failed: ' + e.message });
  } finally {
    lock.releaseLock();
  }
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
    if (parts.includes('All')) return true; // Fix: Support 'All' broadcast
    return false;
  };
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    let participants = [];
    try { 
      const rawParts = row[4];
      participants = typeof rawParts === 'string' && rawParts.startsWith('[') ? JSON.parse(rawParts) : []; 
      if (!Array.isArray(participants)) participants = [];
    } catch(e){ participants = []; }
    
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
  if (!usersSheet) return {};
  
  const data = usersSheet.getDataRange().getValues();
  if (data.length < 1) return {};
  
  const headers = data[0];
  let emailIdx = headers.indexOf('Email');
  if (emailIdx === -1) emailIdx = headers.indexOf('email'); // Fallback
  if (emailIdx === -1) emailIdx = 12; // Legacy Fallback (Col 13)
  
  const map = {};
  for (let i = 1; i < data.length; i++) {
    const n = data[i][0]; // Name is Col 0
    const e = data[i][emailIdx];
    if (names.includes(n) && e) {
      map[n] = e;
    }
  }
  return map;
}

// ============ ATTENDANCE HANDLERS ============

function handleAttendance(ss, data) {
  try {
    let sheet = ss.getSheetByName('TSS_Attendance');
    if (!sheet) {
      sheet = ss.insertSheet('TSS_Attendance');
      sheet.getRange(1, 1, 1, 4).setValues([['Timestamp', 'User', 'Type', 'Date']]); // Date for easier daily processing
      sheet.getRange(1, 1, 1, 4).setFontWeight('bold');
    }
    
    const now = new Date();
    const dateStr = now.toLocaleDateString('ja-JP'); // YYYY/MM/DD
    const type = data.type || 'check_in'; // check_in or check_out
    
    // Log Attendance
    sheet.appendRow([
      now.toISOString(),
      data.user,
      type,
      dateStr
    ]);
    
    // Award Tokens (5 Tokens - User Request: Incentivize Check-In)
    const bonus = 5; 
    const logDesc = type === 'check_in' ? 'チェックインボーナス' : 'チェックアウト記録'; 
    const result = addTokensToUser(ss, data.user, bonus, 'attendance', logDesc);
    
    const displayMsg = type === 'check_in' ? 'チェックインしました！' : 'チェックアウトしました！';

    return createResponse({
      success: true,
      message: displayMsg,
      tokensEarned: bonus,
      newBalance: result // New balance
    });
  } catch (e) {
    return createResponse({ error: 'Check-in Error: ' + e.message });
  }
}

function handleDeleteAdjustment(ss, data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sheet = getAdjustmentsSheet(ss);
    sheet.getRange('A:A').setNumberFormat('0');
    const allData = sheet.getDataRange().getDisplayValues();
  const targetId = String(data.adjustmentId);
  const user = data.user;
  
  for (let i = 1; i < allData.length; i++) {
    if (allData[i][0] === targetId) {
      const author = allData[i][2];
      if (author !== user) {
        return createResponse({ error: 'Permission denied' });
      }
      sheet.deleteRow(i + 1);
      SpreadsheetApp.flush();
      return createResponse({ success: true, message: 'Adjustment deleted' });
    }
  }
  return createResponse({ error: 'Adjustment not found' });
  } catch (e) {
    return createResponse({ error: 'Adjustment delete error: ' + e.message });
  } finally {
    lock.releaseLock();
  }
}

// ============ v9.3 GOOGLE DRIVE PROFILE IMAGE UPLOAD (SSOT) ============
// フォルダID: Google Driveで「TSS_Profile_Photos」フォルダを作成し、そのIDに置き換えてください
const PROFILE_PHOTOS_FOLDER_ID = '1TF0UTsm1U6KmMvilQpAYN27kPKsqBoL6'; // TSS_Profile_Photos folder

function handleUploadProfileImage(ss, data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    
    const userName = data.name;
    const imageData = data.image; // Base64 (data:image/...;base64,XXX)
    const imageType = data.type || 'image/png';
    
    if (!userName || !imageData) {
      return createResponse({ error: '名前と画像が必要です' });
    }
    
    // Base64からBlobを作成
    let base64Content = imageData;
    if (imageData.includes(',')) {
      base64Content = imageData.split(',')[1]; // data:image/png;base64, を除去
    }
    
    const blob = Utilities.newBlob(
      Utilities.base64Decode(base64Content),
      imageType,
      `profile_${userName}_${Date.now()}.png`
    );
    
    // Google Driveに保存
    let folder;
    try {
      folder = DriveApp.getFolderById(PROFILE_PHOTOS_FOLDER_ID);
    } catch (e) {
      // フォルダが見つからない場合、ルートに保存
      folder = DriveApp.getRootFolder();
    }
    
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    // 直接アクセス可能なURLを生成
    const fileId = file.getId();
    const directUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
    
    // ユーザーのProfile_Image_URLを更新
    const usersSheet = ss.getSheetByName('TSS_Users');
    if (usersSheet) {
      const userData = usersSheet.getDataRange().getValues();
      for (let i = 1; i < userData.length; i++) {
        if (userData[i][0] === userName) {
          // 古い画像をDriveから削除（オプション）
          const oldUrl = userData[i][6];
          if (oldUrl && oldUrl.includes('drive.google.com')) {
            try {
              const oldIdMatch = oldUrl.match(/id=([a-zA-Z0-9_-]+)/);
              if (oldIdMatch) {
                DriveApp.getFileById(oldIdMatch[1]).setTrashed(true);
              }
            } catch (e) { /* 古いファイルが見つからなくても続行 */ }
          }
          
          // 新しいURLを保存
          usersSheet.getRange(i + 1, 7).setValue(directUrl); // Profile_Image column
          SpreadsheetApp.flush();
          break;
        }
      }
    }
    
    // メタ情報をログシートに保存（オプション）
    let imagesSheet = ss.getSheetByName('TSS_Images');
    if (!imagesSheet) {
      imagesSheet = ss.insertSheet('TSS_Images');
      imagesSheet.appendRow(['Timestamp', 'User', 'FileId', 'URL']);
    }
    imagesSheet.appendRow([new Date().toISOString(), userName, fileId, directUrl]);
    
    return createResponse({ 
      success: true, 
      url: directUrl,
      fileId: fileId,
      message: '画像をGoogle Driveに保存しました'
    });
    
  } catch (e) {
    return createResponse({ error: 'Image upload error: ' + e.message });
  } finally {
    lock.releaseLock();
  }
}
