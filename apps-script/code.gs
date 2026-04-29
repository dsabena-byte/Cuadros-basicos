/**
 * Trigger de Apps Script para refrescar el dashboard de Vercel cuando hay
 * cambios en la carpeta de Drive "Tablero CB".
 *
 * Setup:
 *   1. Abrí https://script.google.com → "New project".
 *   2. Pegá este archivo como Code.gs.
 *   3. En Project Settings → Script properties, agregá:
 *        VERCEL_REFRESH_URL = https://<tu-app>.vercel.app/api/refresh
 *        REFRESH_SECRET     = <el mismo valor que en Vercel>
 *        DRIVE_FOLDER_ID    = 1J7NORR3iwnjbKrIAbjB79N7h5klGFYR3
 *   4. Ejecutá installTrigger() una vez (autorizá permisos cuando pida).
 *   5. Listo: cada cambio en la carpeta dispara refreshDashboard.
 */

function installTrigger() {
  // Eliminamos triggers anteriores de este proyecto para evitar duplicados.
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'refreshDashboard') {
      ScriptApp.deleteTrigger(t);
    }
  });

  // Trigger temporal cada 5 minutos: chequea si la carpeta cambió.
  ScriptApp.newTrigger('refreshDashboard')
    .timeBased()
    .everyMinutes(5)
    .create();
}

function refreshDashboard() {
  var props = PropertiesService.getScriptProperties();
  var folderId = props.getProperty('DRIVE_FOLDER_ID');
  var url = props.getProperty('VERCEL_REFRESH_URL');
  var secret = props.getProperty('REFRESH_SECRET');

  if (!folderId || !url || !secret) {
    Logger.log('Faltan script properties: DRIVE_FOLDER_ID / VERCEL_REFRESH_URL / REFRESH_SECRET');
    return;
  }

  var folder = DriveApp.getFolderById(folderId);
  var lastSeen = props.getProperty('LAST_SEEN_MODIFIED') || '';
  var maxModified = lastSeen;

  var iter = folder.getFiles();
  while (iter.hasNext()) {
    var file = iter.next();
    var modified = file.getLastUpdated().toISOString();
    if (modified > maxModified) {
      maxModified = modified;
    }
  }

  if (maxModified === lastSeen) {
    Logger.log('Sin cambios en la carpeta.');
    return;
  }

  var resp = UrlFetchApp.fetch(url, {
    method: 'post',
    headers: { 'x-refresh-secret': secret },
    muteHttpExceptions: true,
  });

  Logger.log('Refresh status: ' + resp.getResponseCode() + ' / ' + resp.getContentText());
  if (resp.getResponseCode() === 200) {
    props.setProperty('LAST_SEEN_MODIFIED', maxModified);
  }
}

function refreshNow() {
  // Helper manual para ejecutar el refresh ignorando el cache de modifiedTime.
  PropertiesService.getScriptProperties().deleteProperty('LAST_SEEN_MODIFIED');
  refreshDashboard();
}
