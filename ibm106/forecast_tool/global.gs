// =============================================================================
// ⚙️ GLOBAL CONSTANTS
// =============================================================================
const SH_GROUP_MASTER    = "1-Group_Master";
const SH_CAMPAIGN_MASTER = "2-Campaign_Master"; 
const SH_RESOLVED        = "3-Resolved Review";
const SH_FORECAST        = "4-Detailed Forecast Demand";
const SH_BASE_DEMAND     = "Base Demand";
const SH_ASSIGN_DATA     = "AssignmentData";

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("📋 Campaign Tools")
    .addItem("➕ Add Assignment",       "addAssignment")
    .addItem("➖ Remove Assignment",    "removeAssignment")
    .addSeparator()
    .addItem("🔄 Update Resolved Data", "updateResolvedData")
    .addItem("🧹 Clear Resolved Table", "clearResolvedTable")
    .addSeparator()
    .addItem("📊 Build Forecast Demand", "buildForecast")
    .addSeparator()
    .addItem("✨ Setup Gantt Chart",    "setupGanttSheet")
    .addToUi();
}

function getSheetSafe_(name) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) {
    SpreadsheetApp.getUi().alert(`❌ ไม่พบ Sheet ชื่อ "${name}"\nกรุณาตรวจสอบชื่อ Tab ให้ตรงกับในโค้ด`);
    return null;
  }
  return sh;
}
