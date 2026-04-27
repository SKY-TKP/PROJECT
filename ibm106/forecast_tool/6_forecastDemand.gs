// =============================================================================
// Sheet 5: "5-Applied Marketing" (Detailed Forecast Demand - MVC)
// =============================================================================

const SH_APPLIED = "5-Applied Marketing";
const SH_FORECAST_DB = "Forecast_DB";

// =============================================================================
// 🧠 BACKEND: คำนวณยอด Baseline ปะทะ Applied (คูณแคมเปญ)
// =============================================================================
function updateForecastDB() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let shDB = ss.getSheetByName(SH_FORECAST_DB);
  if (!shDB) {
    shDB = ss.insertSheet(SH_FORECAST_DB);
    shDB.hideSheet(); // ซ่อนไว้เป็นหลังบ้าน
  }

  const shBase = ss.getSheetByName("Base Demand");
  const shGroup = ss.getSheetByName("1-Group_Master");
  const shResolved = ss.getSheetByName("3-Resolved Review");

  if (!shBase) {
    SpreadsheetApp.getUi().alert("🚨 ไม่พบชีต 'Base Demand'");
    return;
  }

  // 🌟 1. ดึงข้อมูล Group Tags (ว่าสาขาไหนอยู่กลุ่มไหนบ้าง)
  const branchGroups = {};
  if (shGroup && shGroup.getLastRow() >= 12) {
    const grpData = shGroup.getRange(12, 3, shGroup.getLastRow() - 11, 2).getValues();
    grpData.forEach(r => {
      let gName = String(r[0]).trim();
      let branches = String(r[1]).split(',').map(b => b.trim().toUpperCase()).filter(Boolean);
      branches.forEach(b => {
        if (!branchGroups[b]) branchGroups[b] = [];
        branchGroups[b].push(gName);
      });
    });
  }

  // 🌟 2. ดึง Multiplier จาก 3-Resolved Review มาทำ Dictionary
  const branchMap = {};
  if (shResolved && shResolved.getLastRow() >= 16) {
    const resData = shResolved.getRange(16, 1, shResolved.getLastRow() - 15, 11).getValues();
    resData.forEach(r => {
       let b = String(r[0]).trim().toUpperCase();
       let p = String(r[1]).trim().toUpperCase();
       if (b && p && !b.includes("ไม่มีข้อมูล")) {
         let sMs = parseDateToMsLocal_(r[2]);
         let eMs = parseDateToMsLocal_(r[3]);
         let m = parseFloat(r[10]) || 1.0;
         if(sMs && eMs) {
           if(!branchMap[b]) branchMap[b] = {};
           if(!branchMap[b][p]) branchMap[b][p] = {};
           // แตกเวลาเป็นรายวัน
           for(let t = sMs; t <= eMs; t += 86400000) {
             branchMap[b][p][t] = m;
           }
         }
       }
    });
  }

  // 🌟 3. อ่าน Base Demand และสกัดวันที่
  const baseData = shBase.getDataRange().getValues();
  
  // หา "ปี" จากข้อความเซลล์ A2 (Lasted Update: 29-Mar-2026)
  let yearMatch = String(baseData[1][0]).match(/\d{4}/);
  let startYear = yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear();

  // หัวตารางวันที่อยู่แถวที่ 4 (Index 3), คอลัมน์เริ่มที่ C (Index 2)
  const dateHeaders = baseData[3].slice(2);
  const dateMsArray = [];
  let prevMonth = -1;
  let currentYear = startYear;

  const cleanHeaders = ["Key", "Branch", "Product", "Group Tags", "Scenario", "Total", "Avg / Day"];

  dateHeaders.forEach(dh => {
    let s = String(dh).trim();
    if (!s) return;
    let parts = s.split('-'); // แปลง "30-03" 
    if (parts.length === 2) {
      let d = parseInt(parts[0]);
      let m = parseInt(parts[1]) - 1; // JS Month 0-11
      
      // ถ้าเดือนลดลง (เช่น ข้ามจาก 12 ไป 01) ให้บวกปีเพิ่ม
      if (prevMonth !== -1 && m < prevMonth) currentYear++; 
      prevMonth = m;
      
      let ms = new Date(currentYear, m, d).getTime();
      dateMsArray.push(ms);
      cleanHeaders.push(s); // เก็บ Header 原ฉบับไว้โชว์
    }
  });

  const output = [cleanHeaders];

  // 🌟 4. เริ่มคำนวณ (ข้อมูลเริ่มแถว 6 -> Index 5)
  for (let i = 5; i < baseData.length; i++) {
    let b = String(baseData[i][0]).trim().toUpperCase();
    let p = String(baseData[i][1]).trim().toUpperCase();
    if (!b || !p) continue;

    // จัด Group Tags ให้สวยงาม
    let gTags = branchGroups[b] ? branchGroups[b].join(", ") : "-";

    // เตรียมแถวสำหรับ 2 Scenario
    let baseRow = [`${b}|${p}|Base`, b, p, gTags, "Baseline", 0, 0];
    let appRow =  [`${b}|${p}|App`, b, p, gTags, "Applied", 0, 0];

    let sumBase = 0, sumApp = 0, count = 0;

    for (let j = 0; j < dateMsArray.length; j++) {
       let baseVal = parseFloat(baseData[i][2 + j]) || 0;
       let ms = dateMsArray[j];
       
       let mult = 1.0;
       // ถ้ามีแคมเปญตรงกับ Branch + Product + วันที่เป๊ะๆ ก็เอามาคูณ
       if (branchMap[b] && branchMap[b][p] && branchMap[b][p][ms]) {
         mult = branchMap[b][p][ms];
       }

       let appVal = baseVal * mult;

       baseRow.push(baseVal);
       appRow.push(appVal);

       sumBase += baseVal;
       sumApp += appVal;
       count++;
    }

    baseRow[5] = sumBase; baseRow[6] = count > 0 ? sumBase / count : 0;
    appRow[5] = sumApp;   appRow[6] = count > 0 ? sumApp / count : 0;

    output.push(baseRow);
    output.push(appRow);
  }

  // 🌟 5. บันทึกลง Database
  shDB.clear();
  if (output.length > 1) {
    if (shDB.getMaxColumns() < cleanHeaders.length) {
      shDB.insertColumnsAfter(shDB.getMaxColumns(), cleanHeaders.length - shDB.getMaxColumns() + 5);
    }
    shDB.getRange(1, 1, output.length, cleanHeaders.length).setValues(output);
  }

  // อัปเดตเวลาบนหน้า 5
  const shApp = ss.getSheetByName(SH_APPLIED);
  if (shApp) {
    const tz = Session.getScriptTimeZone();
    const now = Utilities.formatDate(new Date(), tz, "dd/MM/yyyy HH:mm:ss");
    shApp.getRange("K1").setValue(`Last Updated: ${now}`)
         .setFontSize(9).setFontStyle("italic").setFontColor("#555555").setHorizontalAlignment("left");
  }
}

// =============================================================================
// 🎨 FRONTEND: สร้างหน้า Dashboard (เรียกใช้แค่ตอน Setup)
// =============================================================================
function setupAppliedMarketingSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let shApp = ss.getSheetByName(SH_APPLIED);
  
  if (!shApp) {
    shApp = ss.insertSheet(SH_APPLIED);
  }

  shApp.clear();
  updateForecastDB(); // รัน Backend ก่อนเพื่อเอาข้อมูลมาปู

  // จัดความกว้างคอลัมน์
  shApp.setColumnWidth(1, 20); 
  shApp.setColumnWidth(2, 80);  // Branch
  shApp.setColumnWidth(3, 80);  // Product
  shApp.setColumnWidth(4, 250); // Group Tags (ยาวหน่อย)
  shApp.setColumnWidth(5, 90);  // Scenario
  shApp.setColumnWidth(6, 90);  // Total
  shApp.setColumnWidth(7, 90);  // Avg/Day

  const shDB = ss.getSheetByName(SH_FORECAST_DB);
  const dbCols = shDB ? Math.max(shDB.getLastColumn(), 8) : 50;

  if (shApp.getMaxColumns() < dbCols) {
    shApp.insertColumnsAfter(shApp.getMaxColumns(), dbCols - shApp.getMaxColumns() + 5);
  }
  shApp.setColumnWidths(8, Math.max(dbCols - 7, 1), 60); // คอลัมน์วันที่

  shApp.getDataRange().setFontFamily("Calibri").setVerticalAlignment("middle");

  // 1. Header ใหญ่
  shApp.getRange("B1:I2").merge().setValue("Applied Marketing (Detailed Forecast Demand)")
       .setBackground("#1f4e79").setFontColor("#ffffff").setFontSize(18).setFontWeight("bold")
       .setHorizontalAlignment("center").setVerticalAlignment("middle");

  // 2. โซน Dropdown Filter
  shApp.getRange("B4").setValue("Scenario:").setFontWeight("bold").setHorizontalAlignment("right");
  shApp.getRange("D4").setValue("Branch:").setFontWeight("bold").setHorizontalAlignment("right");
  shApp.getRange("F4").setValue("Product:").setFontWeight("bold").setHorizontalAlignment("right");

  const ddCells = ["C4", "E4", "G4"];
  ddCells.forEach(cell => {
    shApp.getRange(cell).setBackground("#FFF2CC")
         .setBorder(true, true, true, true, false, false, "#000000", SpreadsheetApp.BorderStyle.SOLID)
         .setHorizontalAlignment("center").setVerticalAlignment("middle").setFontWeight("bold");
  });

  // สร้าง List ให้ Dropdown
  const scRule = SpreadsheetApp.newDataValidation().requireValueInList(["Applied", "Baseline"], true).build();
  shApp.getRange("C4").setDataValidation(scRule).setValue("Applied");

  const bRule = SpreadsheetApp.newDataValidation().requireValueInList(["All", "C01", "C02", "C03", "C04", "C05", "C06", "C07", "C08", "C09", "C10", "C11", "C12", "C13", "C14", "C15", "C16", "C17", "C19", "C20", "C21", "C22", "C23", "C24", "C25", "C26", "C27", "CX1", "CX2"], true).build();
  shApp.getRange("E4").setDataValidation(bRule).setValue("All");

  const pRule = SpreadsheetApp.newDataValidation().requireValueInList(["All", "A", "B", "C", "D"], true).build();
  shApp.getRange("G4").setDataValidation(pRule).setValue("All");

  // 3. ผูกสูตร Array ยิง Header และ Data ทะลุออกมาจาก DB
  // 3.1 หัวตาราง
  shApp.getRange(6, 2).setFormula(`=IFERROR('Forecast_DB'!B1:1, "")`)
       .setBackground("#d6e4f0").setFontColor("#1f4e79").setFontWeight("bold")
       .setHorizontalAlignment("center");
  
  shApp.getRange(6, 2, 1, dbCols - 1).setBorder(true, true, true, true, true, true, "#1f4e79", SpreadsheetApp.BorderStyle.SOLID);

  // 3.2 ข้อมูลดิบ (พระเอกของเรา)
  const filterFormula = `=IFERROR(FILTER('Forecast_DB'!B2:ZZ, ('Forecast_DB'!E2:E=C4) * IF(E4="All", 1, 'Forecast_DB'!B2:B=E4) * IF(G4="All", 1, 'Forecast_DB'!C2:C=G4)), "— ไม่มีข้อมูล —")`;
  shApp.getRange(7, 2).setFormula(filterFormula).setHorizontalAlignment("center");

  // ตั้งค่า Format ตัวเลข (คอมม่า และ ทศนิยม)
  shApp.getRange(7, 6, 1000, 1).setNumberFormat("#,##0"); // Total ไม่มีทศนิยม
  shApp.getRange(7, 7, 1000, dbCols - 6).setNumberFormat("#,##0.0"); // Avg/Day และ รายวัน ทศนิยม 1 ตำแหน่ง

  // ฟรีซแถวบนและคอลัมน์ซ้าย (ล็อกแกน x, y ไว้ให้เลื่อนดูได้)
  shApp.setFrozenRows(6);
  shApp.setFrozenColumns(5);

  SpreadsheetApp.getUi().alert("✨ Setup 5-Applied Marketing เรียบร้อยแล้ว!\n\nดึง Group Tags และเปรียบเทียบ Baseline vs Applied ให้เรียบร้อย ลองเลือก Dropdown กรองข้อมูลดูได้เลยครับ!");
}

// Helper ป้องกันชื่อชนกับไฟล์อื่น
function parseDateToMsLocal_(dateStr) {
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
