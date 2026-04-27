// =============================================================
//  APP SCRIPT — หน้า 5: Summary Demand
// =============================================================

function buildSummaryDemand() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. ค้นหาชีตที่เกี่ยวข้อง
  var forecastSheetName = ["4-Forecast Demand", "5-Forecast Demand", "Forecast Demand"].find(function(name) {
    return ss.getSheetByName(name) !== null;
  });

  var shBase = ss.getSheetByName("Base Demand");
  var shFc = forecastSheetName ? ss.getSheetByName(forecastSheetName) : null;
  
  if (!shBase || !shFc) {
    ui.alert("❌ ไม่พบชีต 'Base Demand' หรือ 'Forecast Demand'\nกรุณารันให้เสร็จสมบูรณ์ก่อนครับ");
    return;
  }

  // 2. ดึงวันที่จาก Base Demand เพื่อคำนวณ 3 กลุ่ม (Months)
  var bdLastCol = shBase.getLastColumn();
  var dateHeaderVals = shBase.getRange(4, 3, 1, bdLastCol - 2).getDisplayValues()[0];
  var totalDays = dateHeaderVals.length;
  
  if (totalDays < 3) {
    ui.alert("❌ จำนวนวันที่ใน Base Demand น้อยเกินไป");
    return;
  }

  var groupSize = Math.floor(totalDays / 3);
  var groups = [
    { start: 0, end: groupSize - 1 },
    { start: groupSize, end: (groupSize * 2) - 1 },
    { start: groupSize * 2, end: totalDays - 1 }
  ];

  groups.forEach(function(g) {
    g.label = dateHeaderVals[g.start] + " ถึง " + dateHeaderVals[g.end];
    g.startCol = columnToLetter_(3 + g.start); // Col C คือ 3
    g.endCol = columnToLetter_(3 + g.end);
  });

  // 3. เตรียม Data ภูมิภาค (Area Map) & จัด Tier
  var AREA_MAP = {
    "Area 1 (North)": ["C05", "C17", "C20", "C24", "CX1"],
    "Area 2 (South)": ["C06", "C13", "C14", "C21", "C27", "CX2"],
    "Area 3 (Center)": ["C08", "C09", "C10", "C12", "C15", "C19"],
    "Area 4 (North / East)": ["C03", "C16", "C11", "C22", "C25", "C26"],
    "Area 5 (West)": ["C01", "C02", "C04", "C07", "C23"]
  };

  // Helper สำหรับหา Tier
  function getTier(branch) {
    var b = branch.toUpperCase();
    if (["C01", "C04", "C08", "C09", "C15", "C23"].indexOf(b) > -1) return "Tier 1";
    if (["C02", "C07", "C10", "C12", "C19"].indexOf(b) > -1) return "Tier 2";
    if (["C05", "C11", "C17", "C20", "C21"].indexOf(b) > -1) return "Tier 3";
    return "Tier 4"; // สาขาที่เหลือ
  }

  var branchList = [];
  Object.keys(AREA_MAP).forEach(function(area) {
    AREA_MAP[area].forEach(function(branch) {
      branchList.push({ area: area, branch: branch, tier: getTier(branch) });
    });
  });

  // 4. สร้างหรือเคลียร์หน้า Summary
  var SH_SUMMARY = "5-Summary Demand";
  var shSum = ss.getSheetByName(SH_SUMMARY);
  if (!shSum) {
    shSum = ss.insertSheet(SH_SUMMARY);
  } else {
    shSum.clear();
    shSum.clearConditionalFormatRules();
  }

  var prods = ["A", "B", "C", "D"];
  var metrics = ["Base", "Applied", "Diff", "%Diff"];
  var totalOutputCols = 3 + (3 * 4 * 4); // 3 (Area, Branch, Tier) + 48 Data = 51 Columns

  if (shSum.getMaxColumns() < totalOutputCols) {
    shSum.insertColumnsAfter(shSum.getMaxColumns(), totalOutputCols - shSum.getMaxColumns() + 2);
  }

  // 5. สร้าง Headers (แถว 1 ถึง 4)
  shSum.getRange(1, 1).setValue("Summary Forecast Demand (Monthly Uplift Analysis)")
       .setFontSize(18).setFontWeight("bold").setFontColor("#1F3864");

  var row2 = ["AREA", "BRANCH", "TIER"];
  var row3 = ["", "", ""];
  var row4 = ["", "", ""];

  groups.forEach(function(g, i) {
    row2.push("Month " + (i + 1) + " : " + g.label);
    for (var j = 0; j < 15; j++) row2.push(""); // เติมว่างเผื่อ Merge 16 คอลัมน์

    prods.forEach(function(p) {
      row3.push("Product " + p);
      for (var k = 0; k < 3; k++) row3.push(""); // เติมว่างเผื่อ Merge 4 คอลัมน์

      metrics.forEach(function(m) {
        row4.push(m);
      });
    });
  });

  shSum.getRange(2, 1, 1, row2.length).setValues([row2]).setBackground("#4472C4").setFontColor("#FFFFFF").setFontWeight("bold").setHorizontalAlignment("center");
  shSum.getRange(3, 1, 1, row3.length).setValues([row3]).setBackground("#D9E1F2").setFontColor("#1F3864").setFontWeight("bold").setHorizontalAlignment("center");
  shSum.getRange(4, 1, 1, row4.length).setValues([row4]).setBackground("#1F3864").setFontColor("#FFFFFF").setFontWeight("bold").setHorizontalAlignment("center");

  // Merge Headers ด้านบน (ขยับจุดเริ่มต้นไปที่คอลัมน์ 4 หรือ D)
  for (var i = 0; i < 3; i++) {
    var startC = 4 + (i * 16); 
    shSum.getRange(2, startC, 1, 16).merge();
    for (var j = 0; j < 4; j++) {
      var pStart = startC + (j * 4);
      shSum.getRange(3, pStart, 1, 4).merge();
    }
  }

  // 6. แยกการสร้างข้อมูล Text และ Formulas
  var textValues = [];
  var formulaValues = [];
  var bgColors = [];
  var rowIdx = 5;

  branchList.forEach(function(item) {
    // โซน Text (พ่นข้อความ Area, Branch, Tier)
    textValues.push([item.area, item.branch, item.tier]);

    // โซน Formula
    var fRow = [];
    groups.forEach(function(g) {
      prods.forEach(function(p) {
        // อิง Branch จากคอลัมน์ B ($B)
        var cBase = columnToLetter_(fRow.length + 4);
        var cApp  = columnToLetter_(fRow.length + 5);
        var cDiff = columnToLetter_(fRow.length + 6);

        var fBase = "=IFERROR(SUM(FILTER('Base Demand'!$" + g.startCol + "$5:$" + g.endCol + ", 'Base Demand'!$A$5:$A=$B" + rowIdx + ", 'Base Demand'!$B$5:$B=\"" + p + "\")), 0)";
        var fApp  = "=IFERROR(SUM(FILTER('" + forecastSheetName + "'!$" + g.startCol + "$5:$" + g.endCol + ", '" + forecastSheetName + "'!$A$5:$A=$B" + rowIdx + ", '" + forecastSheetName + "'!$B$5:$B=\"" + p + "\")), 0)";
        var fDiff = "=" + cApp + rowIdx + " - " + cBase + rowIdx;
        var fPct  = "=IFERROR(" + cDiff + rowIdx + " / " + cBase + rowIdx + ", 0)";

        fRow.push(fBase, fApp, fDiff, fPct);
      });
    });
    formulaValues.push(fRow);

    // สีพื้นหลังแบบขาวล้วน สะอาดตา
    var rowBg = Array(totalOutputCols).fill("#FFFFFF");
    bgColors.push(rowBg);

    rowIdx++;
  });

  // เท Text ลง 3 คอลัมน์แรก (A, B, C)
  shSum.getRange(5, 1, textValues.length, 3).setValues(textValues);
  
  // เท Formulas ลงคอลัมน์ D เป็นต้นไป (48 คอลัมน์)
  shSum.getRange(5, 4, formulaValues.length, 48).setFormulas(formulaValues);
  
  // เทสีและตีกรอบแบบบางทั้งตาราง
  var dataRange = shSum.getRange(5, 1, textValues.length, totalOutputCols);
  dataRange.setBackgrounds(bgColors)
           .setBorder(true, true, true, true, true, true, "#E2E2E2", SpreadsheetApp.BorderStyle.THIN);

  // 7. 🌟 ไฮไลต์: ตีกรอบหนาและ Merge Area
  var areaStartRow = 5;
  var currentArea = textValues[0][0];

  for (var i = 0; i < textValues.length; i++) {
    var rNum = i + 5;
    // ตรวจสอบว่าเปลี่ยน Area ใหม่ หรือถึงบรรทัดสุดท้ายแล้ว
    if (i === textValues.length - 1 || textValues[i+1][0] !== currentArea) {
      
      // 1) Merge เซลล์ Area ในคอลัมน์ A
      var numRowsToMerge = rNum - areaStartRow + 1;
      if (numRowsToMerge > 1) {
        shSum.getRange(areaStartRow, 1, numRowsToMerge, 1).merge();
      }
      
      // 2) ตีเส้นขอบล่างแบบหนา เพื่อกั้น Area ให้สวยงาม
      shSum.getRange(rNum, 1, 1, totalOutputCols).setBorder(null, null, true, null, null, null, "#000000", SpreadsheetApp.BorderStyle.SOLID_MEDIUM);

      if (i < textValues.length - 1) {
        currentArea = textValues[i+1][0];
        areaStartRow = rNum + 1;
      }
    }
  }

  // 8. ตกแต่งและตั้งค่า Format
  shSum.getDataRange().setFontFamily("Calibri").setVerticalAlignment("middle");
  shSum.getRange(5, 4, textValues.length, 48).setHorizontalAlignment("center");
  shSum.getRange(5, 1, textValues.length, 3).setHorizontalAlignment("center").setFontWeight("bold");

  // Format ตัวเลข
  for (var c = 4; c <= totalOutputCols; c++) {
    var headerStr = row4[c - 1];
    var colRange = shSum.getRange(5, c, textValues.length, 1);
    if (headerStr === "Base" || headerStr === "Applied") colRange.setNumberFormat("#,##0");
    else if (headerStr === "Diff") colRange.setNumberFormat("+ #,##0; - #,##0; \"-\"");
    else if (headerStr === "%Diff") colRange.setNumberFormat("+ 0.0%; - 0.0%; \"-\"");
  }

  // 9. Conditional Formatting (สีเขียวบวก/สีแดงลบ อิงคอลัมน์ D)
  var rules = [];
  var colorRange = shSum.getRange(5, 4, textValues.length, 48);

  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND(OR(D$4="Diff", D$4="%Diff"), D5>0)')
    .setBackground("#C6EFCE").setFontColor("#006100").setBold(true)
    .setRanges([colorRange]).build());

  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND(OR(D$4="Diff", D$4="%Diff"), D5<0)')
    .setBackground("#FFC7CE").setFontColor("#9C0006").setBold(true)
    .setRanges([colorRange]).build());

  shSum.setConditionalFormatRules(rules);

  // 10. ปรับขนาดคอลัมน์และตรึงแนว
  shSum.setColumnWidth(1, 150); // Area (ใหญ่หน่อยเพราะ Merge)
  shSum.setColumnWidth(2, 80);  // Branch
  shSum.setColumnWidth(3, 80);  // Tier
  shSum.setColumnWidths(4, 48, 75); // Data cols

  // ตรึงแถวที่ 4 (Header) และตรึง 3 คอลัมน์แรก (Area, Branch, Tier)
  shSum.setFrozenRows(4);
  shSum.setFrozenColumns(3);

  ui.alert("✅ สร้างหน้า 5-Summary Demand สำเร็จ");
}

// Helper Function
function columnToLetter_(column) {
  var temp, letter = '';
  while (column > 0) {
    temp = (column - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    column = (column - temp - 1) / 26;
  }
  return letter;
}
