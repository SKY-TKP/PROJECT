// =============================================================================
// Sheet 1: "1-Group Master"
// =============================================================================

function saveGroup() {
  var ws = getSheetSafe_(SH_GROUP_MASTER);
  if(!ws) return;
  var ui = SpreadsheetApp.getUi();
  SpreadsheetApp.flush();

  // 1. อ่านค่าจากตำแหน่งเป๊ะๆ (B5, B6, B7)
  var groupType = ws.getRange("B5").getDisplayValue().trim();
  var groupName = ws.getRange("B6").getDisplayValue().trim();
  var branchRaw = ws.getRange("B7").getDisplayValue().trim();

  // 2. Validate Group Type
  if (groupType.toLowerCase() === "preset") groupType = "Preset";
  else if (groupType.toLowerCase() === "custom") groupType = "Custom";
  else { 
    ui.alert("❌ Group Type ต้องเป็น Preset หรือ Custom\n\n(ค่าที่ระบบอ่านได้จาก B5 คือ: '" + groupType + "')"); 
    return; 
  }

  // 3. Validate ชื่อและสาขา
  if (!groupName) { ui.alert("❌ กรุณากรอก Group Name ในช่อง B6"); return; }
  if (!branchRaw) { ui.alert("❌ กรุณาเลือก Selected Branches ในช่อง B7"); return; }

  // 4. จัดการ Selected Branch (แยกด้วย comma, ตัดช่องว่าง, ตัดซ้ำ)
  var seen = {}, clean = [], dupes = [];
  var parts = branchRaw.split(","); // Split สาขาจาก Dropdown
  
  for (var i = 0; i < parts.length; i++) {
    var b = parts[i].trim(); // ตัดช่องว่างหน้า-หลัง
    if (!b) continue;
    if (seen[b.toUpperCase()]) {
      if (dupes.indexOf(b) === -1) dupes.push(b);
    } else {
      seen[b.toUpperCase()] = true;
      clean.push(b.toUpperCase()); // แนะนำให้แปลงเป็นพิมพ์ใหญ่ทั้งหมด (toUpperCase) เพื่อความเรียบร้อย
    }
  }

  if (dupes.length > 0) {
    var resp = ui.alert(
      "⚠️ พบ Branch ซ้ำในการเลือก",
      "Branch ที่ซ้ำ: " + dupes.join(", ") + "\n\nกด 'ใช่' เพื่อให้ระบบตัดซ้ำให้อัตโนมัติและบันทึกต่อ",
      ui.ButtonSet.YES_NO
    );
    if (resp !== ui.Button.YES) return;
  }

  // 🌟 เพิ่มคำสั่ง .sort() ตรงนี้ก่อนทำการ join ครับ
  clean.sort();
  
  var branchStr = clean.join(", ");

  if (dupes.length > 0) {
    var resp = ui.alert(
      "⚠️ พบ Branch ซ้ำในการเลือก",
      "Branch ที่ซ้ำ: " + dupes.join(", ") + "\n\nกด 'ใช่' เพื่อให้ระบบตัดซ้ำให้อัตโนมัติและบันทึกต่อ",
      ui.ButtonSet.YES_NO
    );
    if (resp !== ui.Button.YES) return;
  }

  var branchStr = clean.join(", ");
  
  // 5. หาบรรทัดสุดท้ายของตารางเก็บข้อมูล (เริ่มที่แถว 12)
  var startRow = 12;
  var lastRow = startRow - 1;
  var colA = ws.getRange("A" + startRow + ":A" + ws.getMaxRows()).getValues();
  for (var i = 0; i < colA.length; i++) {
    if (colA[i][0] !== "" && colA[i][0] !== null) lastRow = startRow + i;
  }

  // 6. ตรวจสอบชื่อ Group Name ซ้ำในตาราง
  if (lastRow >= startRow) {
    var names = ws.getRange(startRow, 3, lastRow - startRow + 1, 1).getValues();
    var stats = ws.getRange(startRow, 6, lastRow - startRow + 1, 1).getValues();
    for (var i = 0; i < names.length; i++) {
      if (String(names[i][0]).trim().toLowerCase() === groupName.toLowerCase() && String(stats[i][0]).trim() === "Active") {
        ui.alert("❌ ชื่อ '" + groupName + "' มีอยู่แล้วในระบบ (บรรทัดที่ " + (startRow + i) + ")"); 
        return;
      }
    }
  }

  // 7. รันเลข Group ID ใหม่
  var prefix = (groupType === "Preset") ? "G_PRE_" : "G_CUS_";
  var maxNum = 0;
  if (lastRow >= startRow) {
    var ids = ws.getRange(startRow, 1, lastRow - startRow + 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      var id = String(ids[i][0]);
      if (id.toUpperCase().indexOf(prefix.toUpperCase()) === 0) {
        var n = parseInt(id.substring(prefix.length));
        if (n > maxNum) maxNum = n;
      }
    }
  }
  var newId = prefix + ("0" + (maxNum + 1)).slice(-2);

  // 8. เขียนข้อมูลลงตารางใหม่
  var r = lastRow + 1;
  ws.getRange(r, 1).setValue(newId);
  ws.getRange(r, 2).setValue(groupType);
  ws.getRange(r, 3).setValue(groupName);
  ws.getRange(r, 4).setValue(branchStr);
  // สูตรนับจำนวนสาขา โดยนับจำนวนคอมม่าแล้วบวก 1
  ws.getRange(r, 5).setFormula('=IF(D' + r + '="","",LEN(D' + r + ')-LEN(SUBSTITUTE(D' + r + ',"",""))+1)'); 
  ws.getRange(r, 6).setValue("Active");
  ws.getRange(r, 1, 1, 6).setFontColor("#000000").setFontLine("none").setBackground(null);

  // 9. ล้างข้อมูลช่องกรอก (B5, B6, B7)
  ws.getRange("B5").clearContent();
  ws.getRange("B6").clearContent();
  ws.getRange("B7").clearContent();

  ui.alert("✅ บันทึก '" + groupName + "' (ID: " + newId + ") เรียบร้อย");
}

function deleteGroup() {
  var ws = getSheetSafe_(SH_GROUP_MASTER);
  if(!ws) return;
  var ui = SpreadsheetApp.getUi();

  var resp = ui.prompt("🗑️ ลบ Group", "ใส่ชื่อ Group Name หรือ Group ID ที่ต้องการลบ:", ui.ButtonSet.OK_CANCEL);
  if (resp.getSelectedButton() === ui.Button.CANCEL) return;
  var input = resp.getResponseText().trim().toLowerCase();
  
  if (!input) { ui.alert("❌ กรุณาใส่ชื่อหรือ ID"); return; }

  var startRow = 12;
  var lastRow = ws.getLastRow();
  if(lastRow < startRow) { ui.alert("❌ ไม่มีข้อมูล Group ให้ลบ"); return; }

  var data = ws.getRange(startRow, 1, lastRow - startRow + 1, 3).getValues();
  var foundRow = -1;
  var foundName = "";

  for (var i = 0; i < data.length; i++) {
    var id = String(data[i][0]).trim().toLowerCase();
    var name = String(data[i][2]).trim().toLowerCase();
    if (id === input || name === input) {
      foundRow = startRow + i;
      foundName = String(data[i][2]);
      break;
    }
  }

  if (foundRow !== -1) {
    var ok = ui.alert("⚠️ ยืนยันการลบ", "ต้องการลบ Group: " + foundName + " ใช่หรือไม่?", ui.ButtonSet.YES_NO);
    if(ok === ui.Button.YES) {
      ws.deleteRow(foundRow);
      ui.alert("✅ ลบ Group '" + foundName + "' เรียบร้อยแล้ว");
    }
  } else {
    ui.alert("❌ ไม่พบ Group ที่ชื่อหรือ ID: " + input);
  }
}
