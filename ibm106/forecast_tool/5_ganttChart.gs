// =============================================================================
// Sheet 4: "4-Gantt View" (MVC Architecture: Clean UI & Custom Date Format)
// =============================================================================

const SH_GANTT = "4-Gantt View"; 
const SH_GANTT_DB = "Gantt_DB"; 

const AREA_MAP = {
  "Area 1 (North)": ["C05", "C17", "C20", "C24", "CX1"],
  "Area 2 (South)": ["C06", "C13", "C14", "C21", "C27", "CX2"],
  "Area 3 (Center)": ["C08", "C09", "C10", "C12", "C15", "C19"],
  "Area 4 (North / East)": ["C03", "C16", "C11", "C22", "C25", "C26"],
  "Area 5 (West)": ["C01", "C02", "C04", "C07", "C23"],
  "Tier 4": ["C03", "C06", "C13", "C14", "C16", "C22", "C24", "C25", "C26", "C27", "CX1", "CX2"],
  "Tier 3": ["C05", "C11", "C17", "C20", "C21"],
  "Tier 2": ["C02", "C07", "C10", "C12", "C19"],
  "Tier 1": ["C01", "C04", "C08", "C09", "C15", "C23"]
};

// =============================================================================
// 🧠 BACKEND: คำนวณและสร้างฐานข้อมูล
// =============================================================================
function updateGanttDB() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let shDB = ss.getSheetByName(SH_GANTT_DB);
  if (!shDB) {
    shDB = ss.insertSheet(SH_GANTT_DB);
    shDB.hideSheet(); 
  }

  const shResolved = ss.getSheetByName("3-Resolved Review");
  if (!shResolved || shResolved.getLastRow() < 16) {
    shDB.clear();
    shDB.getRange(1, 1, 1, 5).setValues([["Key", "Target", "Product", "Mean", "SD"]]);
    updateLastSyncTimestamp_(); 
    return;
  }

  const rawData = shResolved.getRange(16, 1, shResolved.getLastRow() - 15, 11).getValues();
  let minMs = Infinity;
  let maxMs = -Infinity;
  const branchMap = {}; 
  const allProds = ["A", "B", "C", "D"]; 

  rawData.forEach(r => {
    let b = String(r[0]).trim().toUpperCase();
    let p = String(r[1]).trim().toUpperCase();
    if (b && !b.includes("ไม่มีข้อมูล") && p) {
       let sMs = parseDateToMs_(r[2]);
       let eMs = parseDateToMs_(r[3]);
       let m = parseFloat(r[10]) || 1.0;
       if (sMs && eMs) {
         minMs = Math.min(minMs, sMs);
         maxMs = Math.max(maxMs, eMs);
         if (!branchMap[b]) branchMap[b] = {};
         if (!branchMap[b][p]) branchMap[b][p] = {};
         for(let t = sMs; t <= eMs; t += 86400000) {
           branchMap[b][p][t] = m;
         }
       }
    }
  });

  shDB.clear();
  if (minMs === Infinity) {
    shDB.getRange(1, 1, 1, 5).setValues([["Key", "Target", "Product", "Mean", "SD"]]);
    updateLastSyncTimestamp_();
    return;
  }

  const datesMs = [];
  const headers = ["Key", "Target", "Product", "Mean", "SD"];
  const tz = Session.getScriptTimeZone();
  
  for(let t = minMs; t <= maxMs; t += 86400000) {
    datesMs.push(t);
    // ส่งวันที่แบบเต็มๆ (YYYY-MM-DD) ไปเก็บใน DB เพื่อความแม่นยำ
    headers.push(Utilities.formatDate(new Date(t), tz, "yyyy-MM-dd"));
  }

  if (shDB.getMaxColumns() < headers.length) {
    shDB.insertColumnsAfter(shDB.getMaxColumns(), headers.length - shDB.getMaxColumns() + 5);
  }

  const output = [headers];
  const allBranches = Object.keys(branchMap);
  const allTargets = [...allBranches, ...Object.keys(AREA_MAP)];

  allTargets.forEach(target => {
    let isArea = !!AREA_MAP[target];
    let branchesInTarget = isArea ? AREA_MAP[target] : [target];

    allProds.forEach(prod => {
      let numArr = [];
      let strArr = [];

      datesMs.forEach(t => {
        let sum = 0;
        let count = 0;
        branchesInTarget.forEach(b => {
           count++;
           if (branchMap[b] && branchMap[b][prod] && branchMap[b][prod][t]) {
             sum += branchMap[b][prod][t];
           } else {
             sum += 1.0;
           }
        });
        let avg = count > 0 ? (sum / count) : 1.0;
        numArr.push(avg);
        strArr.push(avg === 1.0 ? 1 : avg); 
      });

      let mean = 1.0; let sd = 0.0;
      if (numArr.length > 0) {
        mean = numArr.reduce((a,b) => a+b, 0) / numArr.length;
        let variance = numArr.reduce((a,b) => a + Math.pow(b - mean, 2), 0) / numArr.length;
        sd = Math.sqrt(variance);
      }

      output.push([`${target}|${prod}`, target, prod, mean, sd, ...strArr]);
    });
  });

  shDB.getRange(1, 1, output.length, headers.length).setValues(output);
  updateLastSyncTimestamp_(); 
}

function updateLastSyncTimestamp_() {
  const shGantt = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SH_GANTT);
  if (shGantt) {
    const tz = Session.getScriptTimeZone();
    const now = Utilities.formatDate(new Date(), tz, "dd/MM/yyyy HH:mm:ss");
    // 🌟 เปลี่ยนให้ K1 ชิดซ้ายตาม Requirement
    shGantt.getRange("K1").setValue(`Last Updated: ${now}`)
           .setFontSize(9).setFontStyle("italic").setFontColor("#555555")
           .setHorizontalAlignment("left");
  }
}

// =============================================================================
// 🎨 FRONTEND: สร้างหน้า Dashboard สไตล์ Modern
// =============================================================================
function setupGanttSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let shGantt = ss.getSheetByName(SH_GANTT);
  
  if (!shGantt) {
    shGantt = ss.insertSheet(SH_GANTT);
  }

  shGantt.clear();
  shGantt.clearConditionalFormatRules();
  updateGanttDB(); 

  if (shGantt.getMaxColumns() < 105) {
    shGantt.insertColumnsAfter(shGantt.getMaxColumns(), 105 - shGantt.getMaxColumns());
  }
  
  shGantt.setColumnWidth(1, 20); 
  shGantt.setColumnWidth(2, 150); 
  shGantt.setColumnWidth(3, 60);  
  shGantt.setColumnWidth(4, 80);  
  shGantt.setColumnWidth(5, 60);  
  shGantt.setColumnWidth(6, 80);  
  shGantt.setColumnWidth(7, 60);  
  shGantt.setColumnWidth(8, 90);  
  shGantt.setColumnWidth(9, 120); 
  
  const maxCols = shGantt.getMaxColumns();
  if (maxCols > 9) {
    shGantt.setColumnWidths(10, maxCols - 9, 60); 
  }

  shGantt.getDataRange().setFontFamily("Calibri").setVerticalAlignment("middle");

  shGantt.getRange("B1:I2").merge().setValue("Gantt Chart for MKT Multiplier Overview")
         .setBackground("#d6e4f0").setFontColor("#1f4e79").setFontSize(18).setFontWeight("bold")
         .setHorizontalAlignment("center").setVerticalAlignment("middle")
         .setBorder(true, true, true, true, false, false, "#1f4e79", SpreadsheetApp.BorderStyle.SOLID_MEDIUM);

  // 🌟 แปะ Note บอก Format วันที่ตรงเซลล์ B3
  shGantt.getRange("B3").setValue("* Format Date: dd-mm (e.g., 01-03 = 1-Mar)")
         .setFontStyle("italic").setFontColor("#555555").setFontSize(9).setHorizontalAlignment("left");

  shGantt.getRange("B4").setValue("Branch 1:").setFontWeight("bold").setHorizontalAlignment("right");
  shGantt.getRange("D4").setValue("Branch 2:").setFontWeight("bold").setHorizontalAlignment("right");
  shGantt.getRange("F4").setValue("Branch 3:").setFontWeight("bold").setHorizontalAlignment("right");
  shGantt.getRange("H4").setValue("Area / Tier:").setFontWeight("bold").setHorizontalAlignment("right");

  const ddCells = ["C4", "E4", "G4", "I4"];
  ddCells.forEach(cell => {
    shGantt.getRange(cell).setBackground("#FFF2CC")
           .setBorder(true, true, true, true, false, false, "#000000", SpreadsheetApp.BorderStyle.SOLID)
           .setHorizontalAlignment("center").setVerticalAlignment("middle").setFontWeight("bold");
  });

  const shResolved = ss.getSheetByName("3-Resolved Review");
  let branchSet = new Set();
  if (shResolved && shResolved.getLastRow() >= 16) {
    const data = shResolved.getRange(16, 1, shResolved.getLastRow() - 15, 1).getValues();
    data.forEach(r => {
      let b = String(r[0]).trim().toUpperCase();
      if (b && !b.includes("ไม่มีข้อมูล")) branchSet.add(b);
    });
  }
  const branchArray = Array.from(branchSet).sort();
  if (branchArray.length > 0) {
    const branchRule = SpreadsheetApp.newDataValidation().requireValueInList(branchArray, true).build();
    shGantt.getRange("C4").setDataValidation(branchRule);
    shGantt.getRange("E4").setDataValidation(branchRule);
    shGantt.getRange("G4").setDataValidation(branchRule);
  }

  const areaRule = SpreadsheetApp.newDataValidation().requireValueInList(Object.keys(AREA_MAP), true).build();
  shGantt.getRange("I4").setDataValidation(areaRule);

  const shDB = ss.getSheetByName(SH_GANTT_DB);
  const dbCols = shDB ? Math.max(shDB.getLastColumn() - 2, 5) : 30;

  function buildTableBlock(startRow, dropdownCol, titlePrefix) {
    const dropdownCell = `$${dropdownCol}$4`; 

    shGantt.getRange(startRow, 2).setFormula(`=IF(${dropdownCell}="", "", "📊 ${titlePrefix}: " & ${dropdownCell})`)
           .setFontColor("#1f4e79").setFontWeight("bold").setFontSize(12);
    
    shGantt.getRange(startRow + 1, 2, 1, 3).setValues([["Product", "Mean", "SD"]])
           .setBackground("#1f4e79").setFontColor("#ffffff").setFontWeight("bold").setHorizontalAlignment("center");
           
    shGantt.getRange(startRow + 1, 5).setFormula(`=IF(${dropdownCell}="", "", IFERROR(FILTER('Gantt_DB'!$F$1:$ZZ$1, 'Gantt_DB'!$F$1:$ZZ$1<>""), ""))`)
           .setBackground("#1f4e79").setFontColor("#ffffff").setFontWeight("bold").setHorizontalAlignment("center");

    // 🌟 เปลี่ยน Number Format เป็น dd-mm ตาม Requirement
    shGantt.getRange(startRow + 1, 5, 1, dbCols).setNumberFormat("dd-mm");

    shGantt.getRange(startRow + 2, 2, 4, 1).setValues([["A"], ["B"], ["C"], ["D"]])
           .setBackground("#d6e4f0").setFontWeight("bold").setFontColor("#1f4e79").setHorizontalAlignment("center");

    const lookupFormula = `=IF(${dropdownCell}="", "", ARRAYFORMULA(IF($B${startRow+2}:$B${startRow+5}="", "", IFERROR(VLOOKUP(${dropdownCell} & "|" & $B${startRow+2}:$B${startRow+5}, 'Gantt_DB'!$A:$ZZ, SEQUENCE(1, MAX(1, COUNTA('Gantt_DB'!$A$1:$ZZ$1)-3), 4), FALSE), 1))))`;
    
    shGantt.getRange(startRow + 2, 3).setFormula(lookupFormula)
           .setHorizontalAlignment("center").setVerticalAlignment("middle");

    shGantt.getRange(startRow + 1, 2, 5, dbCols).setBorder(true, true, true, true, true, true, "#CCCCCC", SpreadsheetApp.BorderStyle.THIN);
    shGantt.getRange(startRow + 2, 3, 4, dbCols - 1).setNumberFormat("0.000"); 
  }

  buildTableBlock(6, "C", "Branch");
  buildTableBlock(14, "E", "Branch");
  buildTableBlock(22, "G", "Branch");
  buildTableBlock(30, "I", "Area / Tier");

  // 4. ผูก Conditional Formatting
  const rangesToColor = [
    shGantt.getRange("E8:ZZ11"),
    shGantt.getRange("E16:ZZ19"),
    shGantt.getRange("E24:ZZ27"),
    shGantt.getRange("E32:ZZ35")
  ];

  const headerDateRanges = [
    shGantt.getRange("E7:ZZ7"),
    shGantt.getRange("E15:ZZ15"),
    shGantt.getRange("E23:ZZ23"),
    shGantt.getRange("E31:ZZ31")
  ];

  let rules = [];

  // 🌟 กฎที่ 1: สีเตือนภัย (Warning >= 1.5 หรือ <= 0.85) -> เปลี่ยน "เฉพาะสีตัวหนังสือ" เป็นสีแดงเข้ม พื้นหลังสีขาว
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND(ISNUMBER(E8), OR(E8>=1.5, E8<=0.85))')
    .setBackground("#FFFFFF").setFontColor("#9C0006").setBold(true) // สีแดงเข้ม ตัวหนา
    .setRanges(rangesToColor).build());

  // 🌟 สีประจำวัน 7 วัน (สำหรับ Header วันที่)
  const colorMap = [
    { dayNum: 1, bg: "#E63946", fg: "#FFFFFF" }, // อา (แดง)
    { dayNum: 2, bg: "#FFD966", fg: "#000000" }, // จ (เหลือง)
    { dayNum: 3, bg: "#F4B183", fg: "#000000" }, // อ (ชมพู)
    { dayNum: 4, bg: "#A9D18E", fg: "#000000" }, // พ (เขียว)
    { dayNum: 5, bg: "#F4B183", fg: "#000000" }, // พฤ (ส้ม)
    { dayNum: 6, bg: "#9BC2E6", fg: "#000000" }, // ศ (ฟ้า)
    { dayNum: 7, bg: "#B4A7D6", fg: "#000000" }  // ส (ม่วง)
  ];

  colorMap.forEach(col => {
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied(`=AND(E$7<>"", WEEKDAY(E$7)=${col.dayNum})`)
      .setBackground(col.bg).setFontColor(col.fg)
      .setRanges(headerDateRanges).build());
  });

  shGantt.setConditionalFormatRules(rules);

  SpreadsheetApp.getUi().alert("✨ Setup Gantt Chart (Clean UI) เรียบร้อยแล้ว!");
}

// Helper 
function parseDateToMs_(dateStr) {
  if (!dateStr) return null;
  let s = String(dateStr).trim();
  let parts = s.split(/[\/\-]/); 
  if (parts.length === 3) {
    let d = parseInt(parts[0]); let m = parseInt(parts[1]) - 1; let y = parseInt(parts[2]);
    return new Date(y, m, d).getTime();
  }
  let d = new Date(s);
  if (!isNaN(d.getTime())) return d.getTime();
  return null;
}
