# TSS Token Economy Architecture: Log-First Design

## 1. Response to Feedback regarding "2-Sheet Structure"

**Verdict:** 100% Agree. This is the **Event Sourcing** pattern used in financial ledgers.
- **Log (Journal)**: The single source of truth. Immutable history of "what happened".
- **State (Ledger)**: A derived view of "current status". Can be rebuilt from the Log at any time.

This structure allows us to:
1.  **Audit**: Trace exactly why a user has 500 tokens.
2.  **Recover**: If the State sheet is corrupted, we just re-run the calculation from the Log.
3.  **Analyze**: We can graph "Daily Active Tokens" because we have time-series data.

---

## 2. Sheet Item Design

We will refine the existing sheets to strictly adhere to this separation.

### Sheet A: `TSS_TokenLogs` (The Source of Truth)
*Type: Append-Only. Never delete rows.*

| Column | Header | Type | Description |
| :--- | :--- | :--- | :--- |
| A | `Timestamp` | Date | `new Date().toISOString()` (Global Order) |
| B | `TransactionId` | String | Unique UUID or `timestamp_user` (for idempotency) |
| C | `User_Id` | String | The user receiving/spending tokens (Primary Key) |
| D | `Action_Type` | String | e.g., `LOGIN`, `POST`, `LIKE_GIVEN`, `LIKE_RECEIVED`, `TASK_COMPLETE` |
| E | `Amount` | Number | Positive for earning, Negative for spending. |
| F | `Related_Id` | String | Optional. ID of the Post, Task, or Event. |
| G | `Description` | String | Human readable note (e.g., "Daily Login Bonus") |

### Sheet B: `TSS_Users` (The State)
*Type: Mutable. Updates on every transaction.*

| Column | Header | Description | Formula / Logic |
| :--- | :--- | :--- | :--- |
| A | `User_Id` | Unique ID (Name) | |
| ... | ... | (Profile Info) | |
| F | `Token_Balance` | **Current Wallet** | `Previous Balance + New Amount` |
| L | `Total_Earned` | **Career Lifetime** | `Previous Total + New Amount (only if > 0)` |
| M | `Last_Activity` | Timestamp | Update on every token action |
| N | `Rank` | String | Derived from Total_Earned (e.g., "Bronze", "Silver") |

---

## 3. GAS Logic (Pseudo-code)

The core principle: **Write to Log FIRST, then Update State.**

```javascript
/**
 * Core Token Function
 * @param {string} userId - The user's ID (Name)
 * @param {number} amount - Token amount (can be negative)
 * @param {string} actionType - Category of action
 * @param {string} description - Human readable text
 * @param {string} relatedId - (Optional) ID of related object
 */
function processTokenTransaction(userId, amount, actionType, description, relatedId = "") {
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName('TSS_TokenLogs');
  const userSheet = ss.getSheetByName('TSS_Users');
  
  // 1. PREPARE THE LOG ENTRY (FACT)
  const timestamp = new Date().toISOString();
  const transactionId = Utilities.getUuid();
  
  const logRow = [
    timestamp,
    transactionId,
    userId,
    actionType,
    amount, // Can be + or -
    relatedId,
    description
  ];
  
  // 2. WRITE TO LOG (The Commit)
  logSheet.appendRow(logRow);
  
  // 3. UPDATE STATE (The View)
  // Find the user row efficiently
  const userRowIndex = findUserRowIndex(userSheet, userId);
  
  if (userRowIndex > 0) {
    const balanceRange = userSheet.getRange(userRowIndex, 6); // Col F
    const totalEarnedRange = userSheet.getRange(userRowIndex, 12); // Col L
    
    // Get current values (protect against empty/NaN)
    let currentBalance = Number(balanceRange.getValue()) || 0;
    let currentTotal = Number(totalEarnedRange.getValue()) || 0;
    
    // Calculate new state
    let newBalance = currentBalance + amount;
    
    // Update Balance
    balanceRange.setValue(newBalance);
    
    // Update Total Earned (ONLY IF amount is positive)
    // We never subtract from "Lifetime Earnings" even if they spend tokens
    if (amount > 0) {
      totalEarnedRange.setValue(currentTotal + amount);
    }
    
    // Update Last Activity
    userSheet.getRange(userRowIndex, 13).setValue(timestamp); // Col M
    
  } else {
    // Edge case: User doesn't exist in State sheet?
    // Could auto-register or log error.
    console.error("User not found in state sheet: " + userId);
  }
}

// Helper to find user row (cache map could be used for speed)
function findUserRowIndex(sheet, userId) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == userId) {
      return i + 1; // 1-based index
    }
  }
  return -1;
}
```

### Self-Correction / Robustness Feature
We can add a "Recalculate" function that runs nightly or on demand.

```javascript
function recalibrateAllUserBalances() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logData = ss.getSheetByName('TSS_TokenLogs').getDataRange().getValues().slice(1);
  const userSheet = ss.getSheetByName('TSS_Users');
  
  // 1. Aggregate from Logs
  let userStats = {};
  
  logData.forEach(row => {
    let uid = row[2];
    let amt = Number(row[4]);
    
    if (!userStats[uid]) userStats[uid] = { balance: 0, total: 0 };
    
    userStats[uid].balance += amt;
    if (amt > 0) userStats[uid].total += amt;
  });
  
  // 2. Bulk Update User Sheet
  // (Implementation would loop through user sheet and set values from userStats)
}
```
