// =============================================================
//  APP SCRIPT — หน้า 5: Forecast Demand  (vFinal — UI, Ceil, Formulas, Surplus)
//  วางใน Apps Script แล้ว assign ปุ่มในหน้า 5 → buildForecastDemand
// =============================================================

// ── SHEET NAMES ───────────────────────────────────────────────
var SHEET_RESOLVED_P3  = "3-Resolved Review";
var SHEET_BASE_DEMAND  = "Base Demand";
var SHEET_FORECAST_P5  = "4-Forecast Demand";

// ── หน้า 3 layout ─────────────────────────────────────────────
var P3_DATA_START_ROW  = 16;
var P3_COL_BRANCH      = 1;   // A
var P3_COL_PRODUCT     = 2;   // B
var P3_COL_START_DATE  = 3;   // C
var P3_COL_END_DATE    = 4;   // D
var P3_COL_FINAL_MUL   = 11;  // K 
var P3_COL_SURPLUS     = 12;  // L  <-- 🟢 [เพิ่มใหม่] คอลัมน์ L สำหรับ Surplus Demand

// ── Base Demand layout ────────────────────────────────────────
var BD_DATE_HEADER_ROW = 4;
var BD_DATA_START_ROW  = 5;
var BD_COL_BRANCH      = 1;   // A
var BD_COL_PRODUCT     = 2;   // B
var BD_COL_DATE_START  = 3;   // C

// =============================================================
//  HELPER FUNCTIONS
// =============================================================
function toMs_(val) {
  if (!val && val !== 0) return null;
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val.getTime();
  }
  var s = String(val).trim();
  if (!s) return null;
  var parts = s.split(/[\/\-]/);
  if (parts.length < 3) return null;
  var d = parseInt(parts[0], 10);
  var m = parseInt(parts[1], 10);
  var y = parseInt(parts[2], 10);
  if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
  if (y < 100) y += 2000;
  return new Date(y, m - 1, d).getTime();
}

function getSheet_(name) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) throw new Error('ไม่พบ Sheet ชื่อ "' + name + '" — กรุณาตรวจสอบชื่อ sheet');
  return sh;
}

// Helper: เปลี่ยนเลขคอลัมน์เป็นตัวอักษรเพื่อใช้ผูกสูตร
function columnToLetter_(column) {
  var temp, letter = '';
  while (column > 0) {
    temp = (column - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    column = (column - temp - 1) / 26;
  }
  return letter;
}

function buildMulLookup_() {
  var sh      = getSheet_(SHEET_RESOLVED_P3);
  var lastRow = sh.getLastRow();
  var lookup  = {};

  if (lastRow < P3_DATA_START_ROW) return lookup;

  var numRows = lastRow - P3_DATA_START_ROW + 1;
  // 🟢 ขยาย Range ให้อ่านไปถึงคอลัมน์ P3_COL_SURPLUS (L)
  var data = sh.getRange(P3_DATA_START_ROW, 1, numRows, P3_COL_SURPLUS).getValues();

  data.forEach(function(row) {
    var branch   = String(row[P3_COL_BRANCH   - 1]).trim().toUpperCase();
    var product  = String(row[P3_COL_PRODUCT  - 1]).trim().toUpperCase();
    var startMs  = toMs_(row[P3_COL_START_DATE - 1]);
    var endMs    = toMs_(row[P3_COL_END_DATE   - 1]);
    var finalMul = parseFloat(row[P3_COL_FINAL_MUL - 1]);
    var surplus  = parseFloat(row[P3_COL_SURPLUS - 1]) || 0; // 🟢 ดึงค่า Surplus มาด้วย

    if (!branch || !product || isNaN(finalMul)) return;

    var key = branch + "|" + product;
    if (!lookup[key]) lookup[key] = [];
    lookup[key].push({ startMs: startMs, endMs: endMs, finalMul: finalMul, surplus: surplus });
  });

  return lookup;
}

// 🟢 เปลี่ยนจาก getMul_ เป็น getAdjustment_ เพื่อส่งค่ากลับไปทั้ง Mul และ Surplus
function getAdjustment_(segments, dateMs) {
  if (!segments || segments.length === 0) return { mul: 1.0, surplus: 0 };
  if (!dateMs) return { mul: 1.0, surplus: 0 };

  for (var i = 0; i < segments.length; i++) {
    var seg  = segments[i];
    var sOk  = !seg.startMs || dateMs >= seg.startMs;
    var eOk  = !seg.endMs   || dateMs <= seg.endMs;
    if (sOk && eOk) return { mul: seg.finalMul, surplus: seg.surplus };
  }
  return { mul: 1.0, surplus: 0 };
}

// =============================================================
//  MAIN: buildForecastDemand
// =============================================================
function buildForecastDemand() {
  var ui = SpreadsheetApp.getUi();

  var mulLookup;
  try {
    mulLookup = buildMulLookup_();
  } catch(e) {
    ui.alert("❌ " + e.message);
    return;
  }

  if (Object.keys(mulLookup).length === 0) {
    ui.alert("⚠️ ไม่พบข้อมูลใน " + SHEET_RESOLVED_P3 + " (row " + P3_DATA_START_ROW + "+)");
    return;
  }

  var shBase;
  try { shBase = getSheet_(SHEET_BASE_DEMAND); }
  catch(e) { ui.alert("❌ " + e.message); return; }

  var bdLastRow = shBase.getLastRow();
  var bdLastCol = shBase.getLastColumn();

  if (bdLastRow < BD_DATA_START_ROW || bdLastCol < BD_COL_DATE_START) {
    ui.alert("❌ Base Demand sheet ไม่มีข้อมูลเพียงพอ");
    return;
  }

  var numDateCols = bdLastCol - BD_COL_DATE_START + 1;

  var dateHeaderVals = shBase
    .getRange(BD_DATE_HEADER_ROW, BD_COL_DATE_START, 1, numDateCols)
    .getValues()[0];
  var dateHeaderMs = dateHeaderVals.map(function(v) { return toMs_(v); });

  var numDataRows = bdLastRow - BD_DATA_START_ROW + 1;
  var bdData      = shBase
    .getRange(BD_DATA_START_ROW, 1, numDataRows, bdLastCol)
    .getValues();

  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var shFc = ss.getSheetByName(SHEET_FORECAST_P5);
  if (!shFc) {
    shFc = ss.insertSheet(SHEET_FORECAST_P5);
  } else {
    shFc.clear();
  }

  shFc.getRange(1, 1).setValue("Forecast Demand")
      .setFontWeight("bold").setFontSize(16).setFontColor("#1F3864");

  // 🟢 อัปเดตคำอธิบายว่ามีการบวก Surplus Demand เข้าไปแล้ว
  shFc.getRange(2, 1).setValue("Lasted Update: " + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MMM-yyyy HH:mm:ss") + " (Adjusted = [Base Demand × Final Multiplier col K] + Surplus col L)")
      .setFontStyle("italic").setFontColor("#555555");

  shFc.getRange(3, 1).setValue("► Applied Forecast Data — Branch × Product × Day")
      .setFontWeight("bold");

  // ── สร้าง Header (เพิ่ม 3 คอลัมน์ท้าย) ──────────────────────────────
  var headers = ["Branch", "Product"].concat(dateHeaderVals).concat(["Quarter Total", "Avg/Day", "SD"]);
  var totalCols = headers.length;
  
  shFc.getRange(4, 1, 1, totalCols).setValues([headers])
      .setBackground("#1F3864").setFontColor("#FFFFFF").setFontWeight("bold")
      .setHorizontalAlignment("center");
      
  // 🌟 ปรับวันที่ให้เป็น dd-mm 
  shFc.getRange(4, 3, 1, numDateCols).setNumberFormat("dd-mm");

  var outputRows    = [];
  var bgColors      = [];
  var fontColors    = [];
  var fontWeights   = [];
  var adjustedCount = 0;

  var startDateColLetter = columnToLetter_(3); 
  var endDateColLetter   = columnToLetter_(2 + numDateCols - 3); 

  bdData.forEach(function(row, rIdx) {
    var branch  = String(row[BD_COL_BRANCH  - 1]).trim().toUpperCase();
    var product = String(row[BD_COL_PRODUCT - 1]).trim().toUpperCase();

    if (!branch || !product) return;

    var newRow = [branch, product];

    // 🌟 จัดการแถวที่ 5 (รหัส D61, D62...) ให้เป็นสีน้ำเงินเหมือนแถวที่ 4
    if (rIdx === 0) {
      for (var c = 0; c < numDateCols; c++) {
        newRow.push(row[BD_COL_DATE_START - 1 + c]);
      }
      newRow.push("-", "-", "-"); // เว้นช่องสูตรไว้

      outputRows.push(newRow);
      bgColors.push(Array(newRow.length).fill("#1F3864"));
      fontColors.push(Array(newRow.length).fill("#FFFFFF"));
      fontWeights.push(Array(newRow.length).fill("bold"));
      return; 
    }

    var key      = branch + "|" + product;
    var segments = mulLookup[key] || [];
    
    var baseBg = (rIdx % 2 !== 0) ? "#FFFFFF" : "#F4F7FC"; 
    
    var bgRow = [baseBg, baseBg];
    var fcRow = ["#000000", "#000000"];
    var fwRow = ["bold", "bold"];

    for (var c = 0; c < numDateCols; c++) {
      var baseDemand = row[BD_COL_DATE_START - 1 + c];
      var dateMs     = dateHeaderMs[c];
      
      // 🟢 ดึงค่าตัวคูณ และ ค่าบวกเพิ่ม
      var adj        = getAdjustment_(segments, dateMs);
      var mul        = adj.mul;
      var surplus    = adj.surplus;

      var adjusted;
      // 🟢 เงื่อนไขเข้าสูตรคำนวณคือ Multiplier ไม่เท่ากับ 1.0 หรือมีค่า Surplus
      if (typeof baseDemand === "number" && (mul !== 1.0 || surplus !== 0)) {
        // 🌟 ปัดเศษขึ้นเสมอ (Round Up) ด้วย Math.ceil ของการคูณ แล้วนำไปบวก Surplus Demand ต่อ
        adjusted = Math.ceil(baseDemand * mul) + surplus;
        adjustedCount++;
        bgRow.push("#FFF2CC");
        fcRow.push("#9C0006");
        fwRow.push("bold");
      } else {
        adjusted = baseDemand;
        bgRow.push(baseBg);
        fcRow.push("#000000");
        fwRow.push("normal");
      }
      newRow.push(adjusted);
    }

    // 🌟 ฝังสูตร SUM, AVERAGE, STDEV.S
    var sheetRow = rIdx + 5; 
    var rangeStr = startDateColLetter + sheetRow + ":" + endDateColLetter + sheetRow;

    newRow.push("=SUM(" + (rangeStr) + ")");
    newRow.push("=IFERROR(AVERAGE(" + (rangeStr) + "), 0)");
    newRow.push("=IFERROR(STDEV.S(" + (rangeStr) + "), 0)");

    bgRow.push("#E9EFF7", "#E9EFF7", "#E9EFF7");
    fcRow.push("#1F3864", "#1F3864", "#1F3864");
    fwRow.push("bold", "bold", "bold");

    outputRows.push(newRow);
    bgColors.push(bgRow);
    fontColors.push(fcRow);
    fontWeights.push(fwRow);
  });

  // ── เทข้อมูลและลงสีรวดเดียว (Batch Write) ─────────────────────────
  var targetRange = shFc.getRange(5, 1, outputRows.length, totalCols);
  
  targetRange.setValues(outputRows)
             .setBackgrounds(bgColors)
             .setFontColors(fontColors)
             .setFontWeights(fontWeights)
             .setBorder(true, true, true, true, true, true, "#D9E1F2", SpreadsheetApp.BorderStyle.THIN);

  // 🌟 จัดฟอนต์ Calibri และกึ่งกลางแนวตั้ง (Vertical Middle) ทั้งหมด
  shFc.getDataRange().setFontFamily("Calibri").setVerticalAlignment("middle");
  shFc.getRange(5, 3, outputRows.length, totalCols - 2).setHorizontalAlignment("center");
  shFc.getRange(5, 1, outputRows.length, 2).setHorizontalAlignment("center");

  // Format ตัวเลข
  shFc.getRange(6, 3, outputRows.length - 1, numDateCols).setNumberFormat("#,##0"); 
  shFc.getRange(6, totalCols - 2, outputRows.length - 1, 1).setNumberFormat("#,##0"); 
  shFc.getRange(6, totalCols - 1, outputRows.length - 1, 2).setNumberFormat("#,##0.00"); 

  // ปรับความกว้างคอลัมน์
  shFc.setColumnWidth(1, 80); 
  shFc.setColumnWidth(2, 80); 
  if (numDateCols > 0) shFc.setColumnWidths(3, numDateCols, 60); 
  shFc.setColumnWidth(totalCols - 2, 100); 
  shFc.setColumnWidth(totalCols - 1, 90);  
  shFc.setColumnWidth(totalCols, 90);      

  // 🌟 ตรึงแถวที่ 5 และคอลัมน์ที่ 2
  shFc.setFrozenRows(5);
  shFc.setFrozenColumns(2);

  ui.alert(
    "✅ สร้าง Forecast Demand สำเร็จ!\n\n"
  );
}

// =============================================================
//  MENU
// =============================================================
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("📋 Campaign Tools")
    .addItem("📊 Build Forecast Demand (หน้า 5)", "buildForecastDemand")
    .addToUi();
}
