// =============================================================================
// Sheet 3: "3-Resolved Review"
//
// การเปลี่ยนแปลงล่าสุด:
//   - บังคับว่าถ้า Campaign ใน Sheet 2 คอลัมน์ L เปลี่ยนเป็น Inactive
//     จะต้องถูกเตะออกจากหน้า Resolved Review ทันที 100%
//   - แก้ไขตัวแปรชื่อ Sheet ด้านบนให้เชื่อมโยงกันสมบูรณ์
// =============================================================================

// ── Sheet 3 Cell References ───────────────────────────────────
var CELL_TARGET_TYPE  = "B4";
var CELL_TARGET_NAME  = "B5";
var CELL_START_DAY    = "B7";
var CELL_END_DAY      = "B8";
var CELL_CAMPAIGN     = "B9";
var CELL_BRANCH_LIST  = "C5";
var CELL_PRODUCT_LIST = "C6";
var CELL_CAMP_MULT    = "C9";
var CELL_THRESH_COUNT = "E5";
var CELL_THRESH_UPPER = "E6";
var CELL_THRESH_LOWER = "E7";
var CELL_PENALTY_DEF  = "E8";
var CELL_SORT_MODE    = "E10";

// ── Column Indexes (1-based) ──────────────────────────────────
var REVIEW_DATA_START  = 16;
var COL_BRANCH         = 1;  // A
var COL_PRODUCT        = 2;  // B
var COL_START_DAY      = 3;  // C
var COL_END_DAY        = 4;  // D
var COL_CAMPAIGNS      = 5;  // E
var COL_UNIQUE_COUNT   = 6;  // F
var COL_RAW_MULTIPLIER = 7;  // G
var COL_COUNT_WARN     = 8;  // H
var COL_MULT_WARN      = 9;  // I
var COL_PENALTY        = 10; // J
var COL_FINAL_MULT     = 11; // K
var COL_SURPLUS_DEMAND = 12; // L

// ── Sheet 1: Group Master layout ─────────────────────────────
var GM_DATA_START_ROW  = 12;
var GM_COL_GROUP_NAME  = 3;  // C
var GM_COL_BRANCHES    = 4;  // D
var GM_COL_STATUS      = 6;  // F

// ── Sheet 2: Campaign Master layout ──────────────────────────
var CM_DATA_START_ROW   = 24;
var CM_COL_CAMP_NAME    = 2;  // B
var CM_COL_ADDER_DEMAND = 11; // K  
var CM_COL_STATUS       = 12; // L

// =============================================================================
// 🔧 HELPER: ดึง Active Campaign names จาก Sheet 2 (col L = Active)
// =============================================================================
function getActiveCampaignNames_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SH_CAMPAIGN_MASTER);
  var activeNames = {};
  if (!sh) return activeNames;

  var lastRow = sh.getLastRow();
  if (lastRow < CM_DATA_START_ROW) return activeNames;

  var numRows = lastRow - CM_DATA_START_ROW + 1;
  var data = sh.getRange(CM_DATA_START_ROW, 1, numRows, CM_COL_STATUS).getDisplayValues();

  data.forEach(function(row) {
    var campName = String(row[CM_COL_CAMP_NAME - 1]).trim();
    var status   = String(row[CM_COL_STATUS   - 1]).trim().toLowerCase();
    if (campName && status === "active") {
      activeNames[campName.toLowerCase()] = campName;
    }
  });
  return activeNames;
}

// =============================================================================
// 🔧 HELPER: ดึง Active/Inactive status ของ Group จาก Sheet 1
// =============================================================================
function getGroupStatusMap_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SH_GROUP_MASTER);
  var statusMap = {};
  if (!sh) return statusMap;

  var lastRow = sh.getLastRow();
  if (lastRow < GM_DATA_START_ROW) return statusMap;

  var numRows = lastRow - GM_DATA_START_ROW + 1;
  var data = sh.getRange(GM_DATA_START_ROW, 1, numRows, GM_COL_STATUS).getDisplayValues();

  data.forEach(function(row) {
    var gName   = String(row[GM_COL_GROUP_NAME - 1]).trim();
    var status  = String(row[GM_COL_STATUS    - 1]).trim().toLowerCase();
    if (gName) statusMap[gName.toLowerCase()] = status;
  });
  return statusMap;
}

// =============================================================================
// 🔧 HELPER: อ่าน Price Sensitivity & Growth Index จาก sheet 2
// =============================================================================
function loadProductFactors_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SH_CAMPAIGN_MASTER);
  var factors = { "A":{ps:1,gi:1}, "B":{ps:1,gi:1}, "C":{ps:1,gi:1}, "D":{ps:1,gi:1} };
  if (!sh) return factors;

  var data = sh.getRange(5, 1, 4, 3).getValues();
  data.forEach(function(row) {
    var prod = String(row[0]).trim().toUpperCase();
    var ps   = parseFloat(row[1]);
    var gi   = parseFloat(row[2]);
    if (prod && !isNaN(ps) && !isNaN(gi)) factors[prod] = { ps:ps, gi:gi };
  });
  return factors;
}

// =============================================================================
// 🔧 HELPER: safe getSheetByName
// =============================================================================
function getSheetSafe_(name) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) { SpreadsheetApp.getUi().alert('❌ ไม่พบ Sheet: "' + name + '"'); return null; }
  return sh;
}

// =============================================================================
// 🔧 HELPER: แปลงวันที่ → timestamp ms
// =============================================================================
function parseDateToMs_(dateStr) {
  if (!dateStr) return null;
  var s = String(dateStr).trim();
  var parts = s.split(/[\/\-]/);
  if (parts.length === 3) {
    var d = parseInt(parts[0]);
    var m = parseInt(parts[1]) - 1;
    var y = parseInt(parts[2]);
    return new Date(y, m, d).getTime();
  }
  var dt = new Date(s);
  return isNaN(dt.getTime()) ? null : dt.getTime();
}

// =============================================================================
// 🔧 HELPER: getAssignSheet
// =============================================================================
function getAssignSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SH_ASSIGN_DATA);
  var targetHeaders = ["Branch","Product","CampaignName","StartDay","EndDay","Status","Multiplier"];
  if (!sh) {
    sh = ss.insertSheet(SH_ASSIGN_DATA);
    sh.hideSheet();
    sh.getRange(1, 1, 1, 7).setValues([targetHeaders]).setFontWeight("bold");
  } else {
    var currentHeaders = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0]
                           .map(function(h){ return String(h).trim().toLowerCase(); });
    if (currentHeaders.indexOf("multiplier") === -1) {
      sh.getRange(1, sh.getLastColumn() + 1).setValue("Multiplier").setFontWeight("bold");
    }
  }
  return sh;
}

// =============================================================================
// 🔧 HELPER: clearReviewTable
// =============================================================================
function clearReviewTable(sh) {
  var lastRow = sh.getLastRow();
  if (lastRow >= REVIEW_DATA_START) {
    sh.getRange(REVIEW_DATA_START, 1, lastRow - REVIEW_DATA_START + 1, COL_SURPLUS_DEMAND) 
      .clearContent().clearFormat();
  }
}

// =============================================================================
// 🔧 HELPER: ดึงข้อมูล AdderDemand จาก Sheet 2
// =============================================================================
function getAdderDemandMap_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SH_CAMPAIGN_MASTER);
  var map = {};
  if (!sh) return map;

  var lastRow = sh.getLastRow();
  if (lastRow < CM_DATA_START_ROW) return map;

  var numRows = lastRow - CM_DATA_START_ROW + 1;
  var data = sh.getRange(CM_DATA_START_ROW, CM_COL_CAMP_NAME, numRows, CM_COL_STATUS - CM_COL_CAMP_NAME + 1).getValues();

  data.forEach(function(row) {
    var campName = String(row[0]).trim();
    var adderD   = parseFloat(row[CM_COL_ADDER_DEMAND - CM_COL_CAMP_NAME]) || 0;
    var status   = String(row[CM_COL_STATUS - CM_COL_CAMP_NAME]).trim().toLowerCase();
    
    if (campName && status === "active") {
      map[campName.toLowerCase()] = adderD;
    }
  });
  return map;
}

// =============================================================================
// 🔧 HELPER: 🌟 [NEW] ดึงข้อมูล Multiplier ล่าสุดแบบสดๆ จาก Sheet 2
// =============================================================================
function getLiveCampaignMultipliers_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SH_CAMPAIGN_MASTER);
  var map = {};
  if (!sh) return map;

  var lastRow = sh.getLastRow();
  if (lastRow < CM_DATA_START_ROW) return map;

  var headers = sh.getRange(CM_DATA_START_ROW - 1, 1, 1, sh.getLastColumn()).getDisplayValues()[0];
  var campMulCol = -1;
  for (var c = 0; c < headers.length; c++) {
    var h = headers[c].trim().toLowerCase();
    if (h.indexOf("camp multi") >= 0 || h.indexOf("proxytotalm") >= 0) {
      campMulCol = c + 1;
      break;
    }
  }
  if (campMulCol === -1) campMulCol = 10; 

  var numRows = lastRow - CM_DATA_START_ROW + 1;
  var names   = sh.getRange(CM_DATA_START_ROW, CM_COL_CAMP_NAME, numRows, 1).getValues();
  var mults   = sh.getRange(CM_DATA_START_ROW, campMulCol, numRows, 1).getValues();
  var status  = sh.getRange(CM_DATA_START_ROW, CM_COL_STATUS, numRows, 1).getValues();

  for (var i = 0; i < numRows; i++) {
    var campName = String(names[i][0]).trim().toLowerCase();
    var stat     = String(status[i][0]).trim().toLowerCase();
    var parsedMult = parseFloat(mults[i][0]);                    //แก้ Alpha
    var multVal = isNaN(parsedMult) ? 0.0 : parsedMult;         //แก้ Alpha
    
    if (campName && stat === "active") {
      map[campName] = multVal;
    }
  }
  return map;
}

// =============================================================================
// 🔧 HELPER: readPenaltyOverrides
// =============================================================================
function readPenaltyOverrides(shResolved) {
  var overrides = {};
  var lastRow = shResolved.getLastRow();
  if (lastRow < REVIEW_DATA_START) return overrides;
  var data = shResolved.getRange(REVIEW_DATA_START, 1, lastRow - REVIEW_DATA_START + 1, COL_FINAL_MULT)
                       .getDisplayValues();
  data.forEach(function(row) {
    var branch  = String(row[COL_BRANCH    - 1]).toUpperCase().trim();
    var product = String(row[COL_PRODUCT   - 1]).toUpperCase().trim();
    var start   = String(row[COL_START_DAY - 1]).trim();
    var end     = String(row[COL_END_DAY   - 1]).trim();
    var camp    = String(row[COL_CAMPAIGNS - 1]).trim();
    var penalty = parseFloat(row[COL_PENALTY - 1]);
    if (branch && product && camp && !isNaN(penalty)) {
      overrides[branch + "|" + product + "|" + start + "|" + end + "|" + camp] = penalty;
    }
  });
  return overrides;
}

// =============================================================================
// ⚡ addAssignment
// =============================================================================
function addAssignment() {
  var shResolved = getSheetSafe_(SH_RESOLVED);
  if (!shResolved) return;
  var ui = SpreadsheetApp.getUi();
  var shAssign = getAssignSheet();

  var targetType   = String(shResolved.getRange(CELL_TARGET_TYPE).getDisplayValue()).trim();
  var targetName   = String(shResolved.getRange(CELL_TARGET_NAME).getDisplayValue()).trim();
  var startDisplay = String(shResolved.getRange(CELL_START_DAY).getDisplayValue()).trim();
  var endDisplay   = String(shResolved.getRange(CELL_END_DAY).getDisplayValue()).trim();
  var campName     = String(shResolved.getRange(CELL_CAMPAIGN).getDisplayValue()).trim();
  var branchStr    = String(shResolved.getRange(CELL_BRANCH_LIST).getDisplayValue()).trim();
  var prodStr      = String(shResolved.getRange(CELL_PRODUCT_LIST).getDisplayValue()).trim();
  var campMultRaw = parseFloat(shResolved.getRange(CELL_CAMP_MULT).getValue());                     //แก้ Alpha
  var campMult = isNaN(campMultRaw) ? 0.0 : campMultRaw;                                            //แก้ Alpha

  if (!campName)    { ui.alert("❌ กรุณากรอก Campaign (ช่อง B9)"); return; }
  if (!startDisplay || !endDisplay) { ui.alert("❌ กรุณาระบุวันที่เริ่มต้นและสิ้นสุด"); return; }
  
  var startMsCheck = parseDateToMs_(startDisplay);
  var minDateMs = new Date(2026, 5, 29).getTime(); // 29 มิ.ย. 2026 
  
  if (!startMsCheck || startMsCheck < minDateMs) {
    ui.alert("❌ ไม่อนุญาตให้ทำรายการ\n\nวันที่เริ่มต้น (Start Date) ต้องเป็นตั้งแต่วันที่ 29/06/2026 เป็นต้นไปเท่านั้น");
    return;
  }

  if (!branchStr || branchStr === "#NAME?") { ui.alert("❌ ไม่พบข้อมูลสาขา (ช่อง C5)"); return; }
  if (!prodStr   || prodStr   === "#NAME?") { ui.alert("❌ ไม่พบข้อมูลสินค้า (ช่อง C6)"); return; }

  var branches = branchStr.split(",").map(function(b){ return b.trim(); }).filter(Boolean);
  var products = prodStr.split(",").map(function(p){ return p.trim(); }).filter(Boolean);

  var warnings = [];

  var activeCampaigns    = getActiveCampaignNames_();
  var campaignIsInactive = false;

  // 🌟 บังคับตรวจสอบ ถ้าไม่มีชื่อใน List Active (หรือกลายเป็น Inactive ไปแล้ว) ให้บล็อกการแอดทันที
  if (activeCampaigns[campName.toLowerCase()] === undefined) {
    campaignIsInactive = true;
    warnings.push("⚠️ Campaign '" + campName + "' มีสถานะ Inactive หรือไม่มีอยู่จริงใน Sheet 2\n  → ไม่มีรายการที่สามารถ Add ได้");
  }

  if (campaignIsInactive) {
    ui.alert("❌ ไม่สามารถ Add Assignment ได้\n\n" + warnings.join("\n\n") +
             "\n\nกรุณาเปลี่ยนสถานะ Campaign เป็น Active ใน Sheet 2 ก่อน");
    return;
  }

  var skippedBranches = []; 

  if (String(targetType).trim().toLowerCase() === "group" && targetName) {
    var groupStatusMap = getGroupStatusMap_();
    var groupStatus    = groupStatusMap[targetName.toLowerCase()];

    if (groupStatus === "inactive") {
      skippedBranches = branches.slice(); 
      branches        = [];               
      warnings.push("⚠️ Group '" + targetName + "' มีสถานะ Inactive ใน Sheet 1\n  → ข้าม " + skippedBranches.length + " สาขา: " + skippedBranches.join(", "));
    }
  }

  if (branches.length === 0 || products.length === 0) {
    var noRowMsg = "❌ ไม่มีรายการที่สามารถ Add ได้\n\n";
    if (warnings.length > 0) noRowMsg += warnings.join("\n\n");
    ui.alert(noRowMsg);
    return;
  }

  var newRows = [];
  branches.forEach(function(branch) {
    products.forEach(function(prod) {
      newRows.push([branch, prod, campName, startDisplay, endDisplay, "Active", campMult]);
    });
  });

  shAssign.getRange(shAssign.getLastRow() + 1, 1, newRows.length, 7).setValues(newRows);
  SpreadsheetApp.flush();

  var successMsg =
    "✅ เพิ่มข้อมูลสำเร็จ\n\n" +
    "Campaign  : " + campName + "\n" +
    "Branches  : " + branches.length + " สาขา (" + branches.join(", ") + ")\n" +
    "Products  : " + products.length + " ประเภท\n" +
    "แถวที่ add: " + newRows.length + " รายการ";

  if (warnings.length > 0) {
    successMsg += "\n\n──────────────────────────\n" +
                  "⚠️ รายการที่ถูกข้ามเนื่องจาก Inactive:\n" +
                  warnings.join("\n");
  }

  if (skippedBranches.length > 0) {
    successMsg += "\n\nสาขาที่ถูกข้าม (" + skippedBranches.length + "): " +
                  skippedBranches.join(", ");
  }

  successMsg += "\n\n💡 กดปุ่ม 'Update Resolved' เมื่อต้องการดูผลลัพธ์";
  ui.alert(successMsg);
}

// =============================================================================
// 🗑️ removeAssignment
// =============================================================================
function removeAssignment() {
  var ui = SpreadsheetApp.getUi();
  var shAssign = getAssignSheet();

  var resp = ui.prompt("🗑️ ลบ Assignment", "กรุณากรอก 'ชื่อ Campaign' ที่ต้องการลบ:", ui.ButtonSet.OK_CANCEL);
  if (resp.getSelectedButton() !== ui.Button.OK) return;
  var campName = resp.getResponseText().trim();
  if (!campName) { ui.alert("❌ กรุณากรอกชื่อ Campaign ให้ถูกต้อง"); return; }

  resp = ui.prompt("🗑️ ลบ Assignment",
    "Campaign: " + campName + "\n\nกรุณากรอก 'รหัสสาขา' ที่ต้องการลบ\n(เว้นว่าง = ลบทุกสาขา):",
    ui.ButtonSet.OK_CANCEL);
  if (resp.getSelectedButton() === ui.Button.CANCEL) return;
  var targetBranch = resp.getResponseText().trim().toUpperCase();

  var lastRow = shAssign.getLastRow();
  if (lastRow < 2) { ui.alert("❌ ไม่มีข้อมูลในระบบ"); return; }

  var data    = shAssign.getDataRange().getValues();
  var headers = data[0].map(function(h){ return String(h).trim().toLowerCase(); });
  var iCamp   = headers.indexOf("campaignname");
  var iBranch = headers.indexOf("branch");
  var iStatus = headers.indexOf("status");
  if (iCamp === -1 || iBranch === -1 || iStatus === -1) return;

  var removed = 0;
  for (var i = 1; i < data.length; i++) {
    var rowCamp   = String(data[i][iCamp]).trim();
    var rowBranch = String(data[i][iBranch]).trim().toUpperCase();
    var rowStatus = String(data[i][iStatus]).trim().toLowerCase();
    if (rowStatus === "active" && rowCamp.toLowerCase() === campName.toLowerCase()) {
      if (!targetBranch || targetBranch === "ALL" || rowBranch === targetBranch) {
        shAssign.getRange(i + 1, iStatus + 1).setValue("Inactive");
        removed++;
      }
    }
  }

  if (removed > 0) {
    SpreadsheetApp.flush();
    updateResolvedData();
    ui.alert("✅ ลบสำเร็จ! เปลี่ยนสถานะ " + removed + " รายการเป็น Inactive");
  } else {
    ui.alert("⚠️ ไม่พบข้อมูล Campaign '" + campName + "' ที่ Active อยู่");
  }
}

// =============================================================================
// 🧹 clearResolvedTable
// =============================================================================
function clearResolvedTable() {
  var ui = SpreadsheetApp.getUi();
  var resp = ui.alert("🧹 ล้างตารางแสดงผล",
    "ต้องการลบข้อมูลในตาราง '3-Resolved Review' ทั้งหมดใช่ไหม?\n(ข้อมูล Assignment ยังอยู่ครบ)",
    ui.ButtonSet.YES_NO);
  if (resp === ui.Button.YES) {
    var sh = getSheetSafe_(SH_RESOLVED);
    if (!sh) return;
    clearReviewTable(sh);
    sh.getRange(REVIEW_DATA_START, 1).setValue("— ไม่มีข้อมูลแสดงผล —");
    ui.alert("✅ ล้างตารางเรียบร้อยแล้ว");
  }
}

// =============================================================================
// 🧠 updateResolvedData
// =============================================================================
function updateResolvedData() {
  var ui = SpreadsheetApp.getUi();

  try {
    var shResolved = getSheetSafe_(SH_RESOLVED);
    if (!shResolved) return;
    var shAssign = getAssignSheet();

    var threshCount = parseFloat(shResolved.getRange(CELL_THRESH_COUNT).getValue()) || 3;
    var threshUpper = parseFloat(shResolved.getRange(CELL_THRESH_UPPER).getValue()) || 1.5;
    var penaltyDef  = parseFloat(shResolved.getRange(CELL_PENALTY_DEF).getValue())  || 1.0;
    var sortMode    = String(shResolved.getRange(CELL_SORT_MODE).getDisplayValue()).toLowerCase();

    var activeCampaigns   = getActiveCampaignNames_();
    var productFactors    = loadProductFactors_();
    var penaltyOverrides  = readPenaltyOverrides(shResolved);
    var adderDemandMap    = getAdderDemandMap_();
    var liveMultipliers   = getLiveCampaignMultipliers_(); 

    var lastAssign = shAssign.getLastRow();
    if (lastAssign < 2) {
      clearReviewTable(shResolved);
      ui.alert("✅ ไม่มีข้อมูลในระบบ");
      return;
    }

    var assignData = shAssign.getDataRange().getDisplayValues();
    var headers    = assignData.shift().map(function(h){ return String(h).trim().toLowerCase(); });

    var iBranch = headers.indexOf("branch");
    var iProd   = headers.indexOf("product");
    var iCamp   = headers.indexOf("campaignname");
    var iStart  = headers.indexOf("startday");
    var iEnd    = headers.indexOf("endday");
    var iStatus = headers.indexOf("status");

    if (iBranch===-1||iProd===-1||iCamp===-1||iStart===-1||iEnd===-1||iStatus===-1) {
      ui.alert("🚨 โครงสร้าง AssignmentData ผิดปกติ"); return;
    }

    var groups          = {};
    var dateParseError  = false;
    var skippedInactive = 0;

    assignData.forEach(function(row) {
      var branch   = String(row[iBranch]).trim().toUpperCase();
      var product  = String(row[iProd]).trim().toUpperCase();
      var campName = String(row[iCamp]).trim();
      var startDay = String(row[iStart]).trim();
      var endDay   = String(row[iEnd]).trim();
      var status   = String(row[iStatus]).trim().toLowerCase();
      
      var campKey = campName.toLowerCase();                                       // แก้ Alpha
      var mult = Object.prototype.hasOwnProperty.call(liveMultipliers, campKey)   // แก้ Alpha
                  ? liveMultipliers[campKey]                                      // แก้ Alpha
                  : 0.0;                                                          // แก้ Alpha

      if (!branch || !product || !campName || status !== "active") return;

      // 🌟 บังคับกรองทิ้งทันที ถ้า Campaign นั้นไม่อยู่ในกลุ่มที่ Active ใน Sheet 2 (แม้จะเคย Add ไว้แล้วก็ตาม)
      if (activeCampaigns[campName.toLowerCase()] === undefined) {
        skippedInactive++;
        return;
      }

      var startMs = parseDateToMs_(startDay);
      var endMs   = parseDateToMs_(endDay);
      if (!startMs || !endMs) { dateParseError = true; return; }

      var key = branch + "|" + product;
      if (!groups[key]) groups[key] = [];
      groups[key].push({ campName:campName, startMs:startMs, endMs:endMs, mult:mult });
    });

    if (dateParseError) ui.alert("⚠️ พบวันที่บางแถวอ่านไม่ออก ระบบข้ามข้อมูลนั้นไป");

    var rows = [];
    var tz   = Session.getScriptTimeZone();

    Object.keys(groups).forEach(function(key) {
      var parts   = key.split("|");
      var branch  = parts[0];
      var product = parts[1];
      var camps   = groups[key];

      var pf               = productFactors[product] || { ps:1.0, gi:1.0 };
      var priceSensitivity = pf.ps;
      var growthIndex      = pf.gi;

      var boundaries = {};
      camps.forEach(function(c) {
        boundaries[c.startMs] = true;
        boundaries[c.endMs + 86400000] = true;
      });
      var sortedBounds = Object.keys(boundaries).map(Number).sort(function(a,b){ return a-b; });

      for (var i = 0; i < sortedBounds.length - 1; i++) {
        var segStartMs = sortedBounds[i];
        var segEndMs   = sortedBounds[i+1] - 86400000;
        if (segStartMs > segEndMs) continue;

        var activeCamps = camps.filter(function(c) {
          return c.startMs <= segStartMs && c.endMs >= segEndMs;
        });
        if (activeCamps.length === 0) continue;

        var campMultMap = {};
        activeCamps.forEach(function(c) { campMultMap[c.campName] = c.mult; });

        var uniqueCampNames = Object.keys(campMultMap).sort();
        var uniqueCount     = uniqueCampNames.length;

        var sumCampMult = 0;
        var sumAdderDemand = 0;
        
        uniqueCampNames.forEach(function(k){ 
          sumCampMult += campMultMap[k]; 
          sumAdderDemand += (adderDemandMap[k.toLowerCase()] || 0);
        });

        // ============================================
        // 🚨 หมายเหตุ: สูตรคำนวณปัจจุบัน
        // ============================================
        var totalMul    = (priceSensitivity + sumCampMult) * growthIndex;
        // ============================================

        var campListStr = uniqueCampNames.join(", ");
        var startStr    = Utilities.formatDate(new Date(segStartMs), tz, "dd/MM/yyyy");
        var endStr      = Utilities.formatDate(new Date(segEndMs),   tz, "dd/MM/yyyy");

        var countWarn  = uniqueCount >= threshCount ? "WARN" : "-";
        var multWarn   = totalMul >= threshUpper    ? "WARN" : "-";
        var penaltyKey = branch+"|"+product+"|"+startStr+"|"+endStr+"|"+campListStr;
        var penalty    = penaltyOverrides[penaltyKey] !== undefined
                         ? penaltyOverrides[penaltyKey] : penaltyDef;

        rows.push({
          branch:branch, product:product, startDay:startStr, endDay:endStr,
          campaigns:campListStr, uniqueCount:uniqueCount, raw:totalMul,
          countWarn:countWarn, multWarn:multWarn, penalty:penalty,
          severity:(countWarn==="WARN"?2:0)+(multWarn==="WARN"?1:0),
          adderDemand: sumAdderDemand 
        });
      }
    });

    if (sortMode.indexOf("severity") >= 0) {
      rows.sort(function(a,b){ return b.severity - a.severity || b.raw - a.raw; });
    } else {
      rows.sort(function(a,b){
        var bc = a.branch.localeCompare(b.branch);
        if (bc !== 0) return bc;
        var pc = a.product.localeCompare(b.product);
        if (pc !== 0) return pc;
        return parseDateToMs_(a.startDay) - parseDateToMs_(b.startDay);
      });
    }

    clearReviewTable(shResolved);
    if (rows.length === 0) {
      shResolved.getRange(REVIEW_DATA_START, 1).setValue("— ไม่มีข้อมูล Assignment ที่ Active ในระบบ —");
      var msg = "✅ อัปเดตเสร็จสิ้น (ไม่มีข้อมูลที่ใช้งานอยู่)";
      if (skippedInactive > 0) msg += "\n⚠️ ข้าม " + skippedInactive + " รายการ (ถูกปรับเป็น Inactive ใน Sheet 2)";
      ui.alert(msg);
      return;
    }

    var maxRows    = shResolved.getMaxRows();
    var neededRows = REVIEW_DATA_START + rows.length;
    if (maxRows < neededRows) shResolved.insertRowsAfter(maxRows, neededRows - maxRows + 5);

    var allValues   = rows.map(function(r) {
      return [r.branch, r.product, r.startDay, r.endDay,
              r.campaigns, r.uniqueCount, r.raw,
              r.countWarn==="WARN"?"WARN":"-",
              r.multWarn ==="WARN"?"WARN":"-",
              r.penalty, "", r.adderDemand];
    });

    var bgColors=[], fontColors=[], fontWeights=[], formulasK=[];

    rows.forEach(function(r, idx) {
      var rowNum = REVIEW_DATA_START + idx;
      var baseBg = idx % 2 === 0 ? "#FFFFFF" : "#F5F5F5";
      var rowBg=[], rowFc=[], rowFw=[];
      for (var c = 0; c < COL_SURPLUS_DEMAND; c++) {
        rowBg.push(baseBg); rowFc.push("#000000"); rowFw.push("normal");
      }
      if (r.multWarn==="WARN") { rowFc[COL_RAW_MULTIPLIER-1]="#CC0000"; rowFw[COL_RAW_MULTIPLIER-1]="bold"; }
      if (r.countWarn==="WARN") { rowBg[COL_COUNT_WARN-1]="#FF0000"; rowFc[COL_COUNT_WARN-1]="#FFFFFF"; rowFw[COL_COUNT_WARN-1]="bold"; }
      else rowFc[COL_COUNT_WARN-1]="#999999";
      if (r.multWarn==="WARN")  { rowBg[COL_MULT_WARN-1]="#FF0000";  rowFc[COL_MULT_WARN-1]="#FFFFFF";  rowFw[COL_MULT_WARN-1]="bold"; }
      else rowFc[COL_MULT_WARN-1]="#999999";
      rowBg[COL_PENALTY-1]    = r.penalty < 1.0 ? "#FFD966" : "#FFF2CC";
      rowFc[COL_PENALTY-1]    = "#0000CC";
      rowFw[COL_PENALTY-1]    = "bold";
      rowFw[COL_FINAL_MULT-1] = "bold";
      bgColors.push(rowBg); fontColors.push(rowFc); fontWeights.push(rowFw);
      formulasK.push(["=G"+rowNum+"*J"+rowNum]);
    });

    var targetRange = shResolved.getRange(REVIEW_DATA_START, 1, rows.length, COL_SURPLUS_DEMAND); 
    targetRange.setValues(allValues).setBackgrounds(bgColors).setFontColors(fontColors).setFontWeights(fontWeights);

    shResolved.getRange(REVIEW_DATA_START, COL_UNIQUE_COUNT,   rows.length, 1).setNumberFormat("0");
    shResolved.getRange(REVIEW_DATA_START, COL_RAW_MULTIPLIER, rows.length, 1).setNumberFormat("0.000000");
    shResolved.getRange(REVIEW_DATA_START, COL_PENALTY,        rows.length, 1).setNumberFormat("0.000000");
    shResolved.getRange(REVIEW_DATA_START, COL_FINAL_MULT,     rows.length, 1).setFormulas(formulasK).setNumberFormat("0.000000");
    
    shResolved.getRange(REVIEW_DATA_START, COL_SURPLUS_DEMAND, rows.length, 1).setNumberFormat("#,##0");

    targetRange.setBorder(true,true,true,true,true,true,"#CCCCCC",SpreadsheetApp.BorderStyle.THIN)
               .setHorizontalAlignment("center").setVerticalAlignment("middle").setFontSize(10);

    if (typeof updateGanttDB === "function") updateGanttDB();

    var doneMsg = "✅ อัปเดตตาราง Resolved เรียบร้อยแล้ว!\n\nแสดง: " + rows.length + " แถว";
    if (skippedInactive > 0) doneMsg += "\n⚠️ ซ่อน " + skippedInactive + " รายการ (ถูกปรับเป็น Inactive ใน Sheet 2)";
    ui.alert(doneMsg);

  } catch(error) {
    ui.alert("🚨 พบข้อผิดพลาด!\n\nสาเหตุ: " + error.message);
  }
}

// =============================================================================
// 🎛️ onEdit
// =============================================================================
function onEdit(e) {
  if (!e || !e.range) return;
  var sh  = e.range.getSheet();
  var col = e.range.getColumn();
  var row = e.range.getRow();

  if (sh.getName()===SH_RESOLVED && col===COL_PENALTY && row>=REVIEW_DATA_START) {
    var val = parseFloat(e.range.getValue());
    if (!isNaN(val)) e.range.setBackground(val < 1.0 ? "#FFD966" : "#FFF2CC");
  }

  if (sh.getName()===SH_RESOLVED && e.range.getA1Notation()===CELL_TARGET_TYPE) {
    var type       = String(e.value).trim().toLowerCase();
    var targetCell = sh.getRange(CELL_TARGET_NAME);
    targetCell.clearContent().clearDataValidations();

    var shGroup = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SH_GROUP_MASTER);
    if (!shGroup) return;
    var lastRow = shGroup.getLastRow();
    if (lastRow < GM_DATA_START_ROW) return;

    if (type === "group") {
      var activeGroupNames = [];
      var groupData = shGroup.getRange(GM_DATA_START_ROW, GM_COL_GROUP_NAME,
                                       lastRow - GM_DATA_START_ROW + 1,
                                       GM_COL_STATUS - GM_COL_GROUP_NAME + 1).getDisplayValues();
      groupData.forEach(function(r) {
        var gName   = String(r[0]).trim();
        var gStatus = String(r[GM_COL_STATUS - GM_COL_GROUP_NAME]).trim().toLowerCase();
        if (gName && gStatus === "active") activeGroupNames.push(gName);
      });
      if (activeGroupNames.length > 0) {
        targetCell.setDataValidation(
          SpreadsheetApp.newDataValidation().requireValueInList(activeGroupNames, true).build()
        );
      }

    } else if (type === "branch") {
      var branchSet  = [];
      var branchData = shGroup.getRange(GM_DATA_START_ROW, GM_COL_BRANCHES,
                                        lastRow - GM_DATA_START_ROW + 1,
                                        GM_COL_STATUS - GM_COL_BRANCHES + 1).getDisplayValues();
      branchData.forEach(function(r) {
        var bStr    = String(r[0]).trim();
        var bStatus = String(r[GM_COL_STATUS - GM_COL_BRANCHES]).trim().toLowerCase();
        if (bStr && bStatus === "active") {
          bStr.split(",").forEach(function(b) {
            var clean = b.trim().toUpperCase();
            if (clean && branchSet.indexOf(clean) === -1) branchSet.push(clean);
          });
        }
      });
      branchSet.sort();
      if (branchSet.length > 0) {
        targetCell.setDataValidation(
          SpreadsheetApp.newDataValidation().requireValueInList(branchSet, true).build()
        );
      }
    }
  }

  if (sh.getName()===SH_GANTT && e.range.getA1Notation()==="C2") {
    if (typeof renderGanttChart === "function") renderGanttChart();
  }
}

// =============================================================================
// 📋 onOpen
// =============================================================================
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("📋 Campaign Tools")
    .addItem("➕ Add Assignment",       "addAssignment")
    .addItem("🗑️ Remove Assignment",    "removeAssignment")
    .addItem("🔄 Update Resolved Data", "updateResolvedData")
    .addItem("🧹 Clear Resolved Table", "clearResolvedTable")
    .addToUi();
}






// ALPHA Diagnostic Function
function diagnoseAdderDemand() {
  var ss  = SpreadsheetApp.getActiveSpreadsheet();
  var sh2 = ss.getSheetByName(SH_CAMPAIGN_MASTER);
  var sh3 = ss.getSheetByName(SH_RESOLVED);
  var sa  = ss.getSheetByName(SH_ASSIGN_DATA);
  var out = [];

  out.push("===== DIAGNOSTIC REPORT =====");

  // [1] หา 24/7 Duo ใน Sheet 2
  out.push("\n[1] Sheet 2 — ค่า 24/7 Duo ทั้งหมด:");
  var lr = sh2.getLastRow();
  for (var r = 24; r <= lr; r++) {
    var name = String(sh2.getRange(r, 2).getValue()).trim();
    if (name.toLowerCase().indexOf("24/7 duo") >= 0) {
      var j = sh2.getRange(r, 10).getValue();
      var k = sh2.getRange(r, 11).getValue();
      var l = sh2.getRange(r, 12).getValue();
      out.push("  R" + r + ": name='" + name + "' len=" + name.length +
               " | J=" + j + " | K=" + k + " (" + typeof k + ") | L='" + l + "'");
    }
  }

  // [2] เรียก getAdderDemandMap_ จริง
  out.push("\n[2] getAdderDemandMap_() → entries ที่มีคำว่า duo:");
  var map = getAdderDemandMap_();
  Object.keys(map).forEach(function(k) {
    if (k.indexOf("duo") >= 0 || k.indexOf("24/7") >= 0) {
      out.push("  key='" + k + "' len=" + k.length + " → " + map[k]);
    }
  });

  // [3] หา segment C01|C ใน Sheet 3 row 26
  out.push("\n[3] Sheet 3 Row 26 (C01|C|29-30 มิ.ย.):");
  var campsStr = String(sh3.getRange(26, 5).getValue()).trim();
  var surplus  = sh3.getRange(26, 12).getValue();
  out.push("  Campaigns raw = '" + campsStr + "'");
  out.push("  Surplus ปัจจุบันในชีต = " + surplus);
  var list = campsStr.split(",").map(function(s){ return s.trim(); });
  var sum = 0;
  list.forEach(function(nm) {
    var key = nm.toLowerCase();
    var v   = map[key];
    out.push("    lookup '" + nm + "' → key='" + key + "' → " + 
             (v === undefined ? "❌ NOT FOUND" : v));
    sum += (v || 0);
  });
  out.push("  Sum (ถ้า lookup สำเร็จ) = " + sum);

  // [4] AssignmentData — 24/7 Duo สำหรับ C01|C
  out.push("\n[4] AssignmentData — C01|C|24/7 Duo:");
  var saData = sa.getDataRange().getValues();
  for (var i = 1; i < saData.length; i++) {
    var b = String(saData[i][0]).trim().toUpperCase();
    var p = String(saData[i][1]).trim().toUpperCase();
    var c = String(saData[i][2]).trim();
    var st= String(saData[i][5]).trim().toLowerCase();
    if (b === "C01" && p === "C" && c.toLowerCase().indexOf("24/7") >= 0) {
      out.push("  R" + (i+1) + ": camp='" + c + "' len=" + c.length + " | status=" + st);
    }
  }

  var msg = out.join("\n");
  Logger.log(msg);
  SpreadsheetApp.getUi().alert(msg);
}
