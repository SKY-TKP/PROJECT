// =============================================================================
// Sheet: "2-Campaign_Master"
// =============================================================================

function registerCampaign() {
  var ws = getSheetSafe_(SH_CAMPAIGN_MASTER);
  if(!ws) return;
  var ui = SpreadsheetApp.getUi();

  // 1. อ่านข้อมูลฟอร์มรวดเดียว
  var formValues = ws.getRange(1, 1, 35, 3).getDisplayValues();
  var nameRow = -1, campMulRow = -1, adderRow = -1; // 🌟 เพิ่มตัวแปร adderRow
  for (var r = 0; r < 35; r++) {
    var label = formValues[r][0].trim().toLowerCase();
    if (label.indexOf("campaign name") >= 0) nameRow = r + 1;
    if (label.indexOf("camp multiplier") >= 0 || label.indexOf("proxytotalm") >= 0) campMulRow = r + 1;
    if (label.indexOf("adderdemand") >= 0) adderRow = r + 1; // 🌟 ดักจับหาแถวของ AdderDemand
  }
  if (nameRow === -1 || campMulRow === -1) {
    ui.alert("❌ ไม่พบฟอร์ม (Campaign Name / Camp Multiplier)"); return;
  }

  var campName = formValues[nameRow - 1][1].trim() || formValues[nameRow - 1][2].trim();
  if (!campName) { ui.alert("❌ กรุณากรอก Campaign Name"); return; }

  // 🌟 อ่าน Product และนำมา Sort (A, B, C, D)
  var productRaw = formValues[nameRow][1].trim() || formValues[nameRow][2].trim();
  if (!productRaw) { ui.alert("❌ กรุณาเลือก Product"); return; }
  
  var prodArr = productRaw.split(",")
    .map(function(p) { return p.trim().toUpperCase(); })
    .filter(function(p) { return p !== ""; });
  prodArr.sort();
  var product = prodArr.join(", ");

  // 🌟 อ่านค่า AdderDemand จากฟอร์ม (ถ้าว่างให้ Default เป็น 1)
  var adderDemandVal = 0;                                         //แก้ Alpha Defult ควรเท่ากับ 0 เพราะเป็นค่า + ไม่ใช่ *
  if (adderRow !== -1) {
    var rawAdder = formValues[adderRow - 1][1].trim() || formValues[adderRow - 1][2].trim();
    adderDemandVal = rawAdder === "" ? 0 : Number(rawAdder);      //แก้ Alpha Defult ควรเท่ากับ 0 เพราะเป็นค่า + ไม่ใช่ *
  }

  var factorLabels = [];
  var factorValues = [];
  var productRow = nameRow + 1; // สมมติว่า Product อยู่ใต้ Campaign Name
  
  for (var r = productRow + 1; r < campMulRow; r++) {
    var label = formValues[r - 1][0].trim();
    if (!label) continue;
    
    var raw = formValues[r - 1][1].trim() || formValues[r - 1][2].trim();
    var num = raw === "" ? 0 : Number(raw);
    
    // 🌟 บังคับค่า Default = 1 ให้ AdditionalMul และ Seasonality ถ้าไม่ได้กรอก
    var lblLow = label.toLowerCase();
    if (raw === "" && (lblLow.indexOf("additional") >= 0 || lblLow.indexOf("season") >= 0)) {
      num = 1;
    }
    
    factorLabels.push(label);
    factorValues.push(num);
  }

  // 2. ค้นหาหัวตารางและ Map คอลัมน์
  var hRow = findTableHeader_(ws);
  if (hRow === -1) { ui.alert("❌ ไม่พบ 'Campaign ID' ในตาราง"); return; }

  var lastCol = ws.getLastColumn();
  var headers = ws.getRange(hRow, 1, 1, lastCol).getDisplayValues()[0];
  var campMulCol = -1, statusCol = -1, adderCol = -1; // 🌟 เพิ่ม adderCol
  var headerMap = {};

  for (var c = 0; c < headers.length; c++) {
    var h = headers[c].trim();
    headerMap[h.toLowerCase()] = c + 1;
    if (h.toLowerCase().indexOf("camp multi") >= 0 || h.toLowerCase().indexOf("proxytotalm") >= 0) campMulCol = c + 1;
    if (h.toLowerCase() === "status") statusCol = c + 1;
    if (h.toLowerCase().indexOf("adderdemand") >= 0) adderCol = c + 1; // 🌟 หาตำแหน่งคอลัมน์ AdderDemand (คอลัมน์ K)
  }

  if (campMulCol === -1) { ui.alert("❌ ไม่พบ 'Camp Multiplier' ในตาราง"); return; }
  if (statusCol === -1) statusCol = campMulCol + 1;

  // 3. ตรวจสอบข้อมูลในตาราง (อ่านก้อนเดียวเช็คได้ทั้ง ID และชื่อซ้ำ)
  var dataStart = hRow + 1; // 🌟 ขยับบรรทัดเริ่มต้นให้เป็น Row 24 (แทน hRow + 1 ที่เป็น Row 23)
  var lastRow = findLastInCol2_(ws, 1, dataStart); // ใช้ฟังก์ชันแบบเร็ว
  var maxNum = 0;
  
  if (lastRow >= dataStart) {
    // ดึง ID และ Name มารวดเดียวเพื่อเช็ค
    var tableData = ws.getRange(dataStart, 1, lastRow - dataStart + 1, 2).getValues();
    for (var i = 0; i < tableData.length; i++) {
      var id = String(tableData[i][0]);
      var name = String(tableData[i][1]).trim().toLowerCase();
      
      if (name === campName.toLowerCase()) {
        ui.alert("❌ ชื่อ '" + campName + "' ซ้ำกับที่มีอยู่"); return;
      }
      
      var m = id.match(/^CAM(\d+)$/i); // เพิ่ม /i เผื่อตัวพิมพ์เล็ก-ใหญ่
      if (m && parseInt(m[1]) > maxNum) maxNum = parseInt(m[1]);
    }
  }
  
  var newId = "CAM" + ("00" + (maxNum + 1)).slice(-3);
  var newRow = lastRow + 1;

  // Copy Format จากบรรทัดก่อนหน้า (ถ้ามี)
  if (lastRow >= dataStart) {
    ws.getRange(lastRow, 1, 1, statusCol).copyTo(ws.getRange(newRow, 1, 1, statusCol), SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
  }

  // 4. เขียนข้อมูลแถวใหม่ (เขียนครั้งเดียวจบ)
  var newRowData = new Array(statusCol).fill("");
  newRowData[0] = newId; 
  newRowData[1] = campName; 
  var prodCol = headerMap["product"] || 3;
  newRowData[prodCol - 1] = product;

  for (var f = 0; f < factorLabels.length; f++) {
    var col = headerMap[factorLabels[f].toLowerCase()];
    if (col) newRowData[col - 1] = factorValues[f];
  }
  
  // 🌟 บันทึกค่า AdderDemand ลงใน Array แถวใหม่
  if (adderCol !== -1) {
    newRowData[adderCol - 1] = adderDemandVal;
  }
  
  newRowData[statusCol - 1] = "Active";

  ws.getRange(newRow, 1, 1, statusCol).setValues([newRowData]);

  // 🌟 สร้างสูตร (รองรับ AdditionalMul)
  var trafficCol = headerMap["%traffic"] || headerMap["trafficmul"] || headerMap["%trafficmul"];
  var cvrCol = headerMap["%cvr"] || headerMap["cvr"];
  var basketCol = headerMap["basketmul"] || headerMap["freqmul"];
  var onlineCol = headerMap["%online lift"] || headerMap["repeatmul"];
  var seasonCol = headerMap["calendar seasonality"] || headerMap["seasonalmul"];
  var addCol = headerMap["additionalmul"];

  if (trafficCol && cvrCol && basketCol && onlineCol && seasonCol) {
    var tL = cl_(trafficCol), cL = cl_(cvrCol), bL = cl_(basketCol), oL = cl_(onlineCol), sL = cl_(seasonCol);
    var formula = "=(" + tL + newRow + "*" + cL + newRow + "*" + bL + newRow + "+" + oL + newRow + ")*" + sL + newRow;
    
    if (addCol) {
      var aL = cl_(addCol);
      formula += "*" + aL + newRow; // นำไปคูณต่อท้าย
    }
    ws.getRange(newRow, campMulCol).setFormula(formula);
  }

  // 🌟 5. ล้างฟอร์มและตั้งค่า Default = 1 สำหรับการกรอกครั้งต่อไป
  ws.getRange(nameRow, 2, 2, 2).clearContent(); // ล้าง Campaign Name & Product (ล้างทั้งคอลัมน์ B และ C เผื่อไว้)
  
  var resetData = [];
  for (var r = productRow + 1; r < campMulRow; r++) {
    var lbl = formValues[r - 1][0].trim().toLowerCase();
    if (!lbl) {
       resetData.push(["", ""]);
       continue;
    }
    // ตั้งค่า Default เป็น 1 สำหรับ Seasonality และ AdditionalMul
    var def = (lbl.indexOf("season") >= 0 || lbl.indexOf("additional") >= 0) ? 1 : 0;
    resetData.push([def, ""]); // ใส่ค่าในคอลัมน์ B, คอลัมน์ C ว่างไว้
  }
  
  if (resetData.length > 0) {
    ws.getRange(productRow + 1, 2, resetData.length, 2).setValues(resetData);
  }
  
  // 🌟 รีเซ็ตค่า AdderDemand ให้กลับเป็น 1 เพื่อพร้อมกรอกแคมเปญถัดไป
  if (adderRow !== -1) {
    ws.getRange(adderRow, 2).setValue(0);
  }

  ui.alert("✅ บันทึก '" + campName + "' (ID: " + newId + ") เรียบร้อย\nProduct: " + product);
}

function deleteCampaign() {
  var ws = getSheetSafe_(SH_CAMPAIGN_MASTER);
  if(!ws) return;
  var ui = SpreadsheetApp.getUi();

  var resp = ui.prompt("🗑️ ลบ Campaign", "ใส่ชื่อ Campaign Name หรือ Campaign ID ที่ต้องการลบ:", ui.ButtonSet.OK_CANCEL);
  if (resp.getSelectedButton() === ui.Button.CANCEL) return;
  var input = resp.getResponseText().trim().toLowerCase();
  if (!input) { ui.alert("❌ กรุณาใส่ชื่อหรือ ID"); return; }

  var hRow = findTableHeader_(ws);
  if (hRow === -1) { ui.alert("❌ ไม่พบตารางข้อมูล"); return; }

  var dataStart = hRow + 1;
  var lastRow = ws.getLastRow();
  if(lastRow < dataStart) { ui.alert("❌ ไม่มีข้อมูล Campaign ให้ลบ"); return; }

  var data = ws.getRange(dataStart, 1, lastRow - dataStart + 1, 2).getValues();
  var foundRow = -1, foundName = "";

  for (var i = 0; i < data.length; i++) {
    var id = String(data[i][0]).trim().toLowerCase();
    var name = String(data[i][1]).trim().toLowerCase();
    if (id === input || name === input) {
      foundRow = dataStart + i; foundName = String(data[i][1]); break;
    }
  }

  if (foundRow !== -1) {
    var ok = ui.alert("⚠️ ยืนยันการลบ", "ต้องการลบ Campaign: " + foundName + " ใช่หรือไม่?", ui.ButtonSet.YES_NO);
    if(ok === ui.Button.YES) { ws.deleteRow(foundRow); ui.alert("✅ ลบ Campaign '" + foundName + "' เรียบร้อยแล้ว"); }
  } else { ui.alert("❌ ไม่พบ Campaign ที่ชื่อหรือ ID: " + input); }
}

// -----------------------------------------------------------------------------
// การจัดการ Factor (รวดเร็วขึ้น ไม่เขียนทีละช่อง)
// -----------------------------------------------------------------------------

function addFactor() {
  var ws = getSheetSafe_(SH_CAMPAIGN_MASTER);
  if(!ws) return;
  var ui = SpreadsheetApp.getUi();
  var resp = ui.prompt("➕ เพิ่ม Factor ใหม่", "ใส่ชื่อ Factor (คอลัมน์ใหม่จะแทรกก่อน Camp Multiplier):", ui.ButtonSet.OK_CANCEL);
  if (resp.getSelectedButton() === ui.Button.CANCEL) return;
  var name = resp.getResponseText().trim();
  if (!name) return;

  var hRow = findTableHeader_(ws);
  var lastCol = ws.getLastColumn();
  var campMulCol = -1;
  for (var c = 1; c <= lastCol; c++) {
    if (ws.getRange(hRow, c).getDisplayValue().trim().toLowerCase().indexOf("camp multi") >= 0 || ws.getRange(hRow, c).getDisplayValue().trim().toLowerCase().indexOf("proxytotalm") >= 0) { campMulCol = c; break; }
  }
  if (campMulCol === -1) { ui.alert("❌ หาคอลัมน์ Camp Multiplier (หรือ ProxyTotalM) ไม่เจอครับ"); return; }

  // 1. แทรกคอลัมน์ในตาราง
  ws.insertColumnBefore(campMulCol);
  ws.getRange(hRow, campMulCol - 1).copyTo(ws.getRange(hRow, campMulCol), SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
  ws.getRange(hRow, campMulCol).setValue(name);

  // เติมเลข 0 ลงในข้อมูลที่มีอยู่แล้วแบบรวดเดียว (Batch)
  var lastRow = findLastInCol2_(ws, 1, hRow + 1);
  if (lastRow > hRow) {
    var numRows = lastRow - hRow;
    var zeroArray = new Array(numRows).fill([0]); 
    ws.getRange(hRow + 1, campMulCol, numRows, 1).setValues(zeroArray);
  }

  // 2. แทรกแถวใน Form ด้านบน
  var campMulFormRow = -1;
  var formLabels = ws.getRange(1, 1, 35, 1).getDisplayValues();
  for (var r = 0; r < 35; r++) {
    if (formLabels[r][0].trim().toLowerCase().indexOf("camp multiplier") >= 0 || formLabels[r][0].trim().toLowerCase().indexOf("proxytotalm") >= 0) { campMulFormRow = r + 1; break; }
  }
  
  if (campMulFormRow > 0) {
    ws.insertRowBefore(campMulFormRow);
    ws.getRange(campMulFormRow - 1, 1, 1, 2).copyTo(ws.getRange(campMulFormRow, 1, 1, 2), SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
    ws.getRange(campMulFormRow, 1).setValue(name);
    ws.getRange(campMulFormRow, 2).setValue(0); // Set default 0
  }

  ui.alert("✅ เพิ่ม Factor เรียบร้อย\n\n💡 โค้ดจะดึงข้อมูลนี้เข้าสู่ตารางอัตโนมัติในการสร้างครั้งถัดไป แต่คุณต้องอัปเดต 'สูตร' ของช่อง Camp Multiplier เดิมด้วยตัวเองครับ");
}

function deleteFactor() {
  var ws = getSheetSafe_(SH_CAMPAIGN_MASTER);
  if(!ws) return;
  var ui = SpreadsheetApp.getUi();

  var hRow = findTableHeader_(ws);
  var lastCol = ws.getLastColumn();
  var prodCol = -1, campMulCol = -1;
  var headers = ws.getRange(hRow, 1, 1, lastCol).getDisplayValues()[0];
  
  for (var c = 0; c < headers.length; c++) {
    var h = headers[c].trim().toLowerCase();
    if (h === "product" || h === "price") prodCol = c + 1; // รองรับหัวตารางเปลี่ยนชื่อ
    if (h.indexOf("camp multi") >= 0 || h.indexOf("proxytotalm") >= 0) campMulCol = c + 1;
  }

  var factors = [];
  for (var c = prodCol + 1; c < campMulCol; c++) {
    var fName = headers[c - 1].trim();
    if(fName) factors.push({ name: fName, col: c });
  }
  if (factors.length === 0) { ui.alert("❌ ไม่มี Factor ระหว่าง Product กับ Camp Multiplier ให้ลบครับ"); return; }

  var list = "";
  for (var i = 0; i < factors.length; i++) { list += (i + 1) + ") " + factors[i].name + "\n"; }
  var resp = ui.prompt("🗑️ ลบ Factor", "เลือก Factor ที่จะลบ:\n" + list + "\nใส่ตัวเลข ลำดับ หรือ พิมพ์ชื่อ:", ui.ButtonSet.OK_CANCEL);
  if (resp.getSelectedButton() === ui.Button.CANCEL) return;

  var input = resp.getResponseText().trim();
  var target = null;
  var idx = parseInt(input);
  if (!isNaN(idx) && idx >= 1 && idx <= factors.length) target = factors[idx - 1];
  else target = factors.find(f => f.name.toLowerCase() === input.toLowerCase());

  if (!target) { ui.alert("❌ ไม่พบ '" + input + "'"); return; }

  // 1. ลบคอลัมน์
  ws.deleteColumn(target.col);
  
  // 2. ลบแถวในฟอร์ม (ค้นหาแบบเร็ว)
  var formLabels = ws.getRange(1, 1, 35, 1).getDisplayValues();
  for (var r = 0; r < 35; r++) {
    if (formLabels[r][0].trim().toLowerCase() === target.name.toLowerCase()) { 
      ws.deleteRow(r + 1); 
      break; 
    }
  }
  ui.alert("✅ ลบ Factor '" + target.name + "' เรียบร้อย\n\n⚠️ ตรวจสอบสูตร Camp Multiplier ด้วยนะครับว่าพังไหมถ้า Factor หายไป");
}

// -----------------------------------------------------------------------------
// Helper Functions (เคล็ดลับความเร็วอยู่ที่ฟังก์ชันเหล่านี้)
// -----------------------------------------------------------------------------

function findTableHeader_(ws) {
  var vals = ws.getRange(10, 1, 26, 1).getDisplayValues();
  for (var i = 0; i < vals.length; i++) { 
    if (vals[i][0].trim() === "Campaign ID") return i + 10; 
  }
  return -1;
}

// ฟังก์ชันหาบรรทัดสุดท้ายแบบ Array (เร็วปานสายฟ้า ไม่โหลดทีละบรรทัด)
function findLastInCol2_(ws, col, startRow) {
  var last = ws.getLastRow();
  if (last < startRow) return startRow - 1;
  var vals = ws.getRange(startRow, col, last - startRow + 1, 1).getValues();
  for (var i = vals.length - 1; i >= 0; i--) { 
    if (vals[i][0] !== "" && vals[i][0] !== null) return startRow + i; 
  }
  return startRow - 1;
}

function cl_(c) {
  var s = "";
  while (c > 0) { c--; s = String.fromCharCode(65 + (c % 26)) + s; c = Math.floor(c / 26); }
  return s;
}
