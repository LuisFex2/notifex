/**
 * PROYECTO: Enviar Notificaciones PUSH a celulares desde Google Sheets con OneSignal
 * 
 * Columnas recomendadas en tu hoja de cálculo (Hoja 1):
 * [Columna A]: Título (ej: "🔥 50% de Descuento hoy")
 * [Columna B]: Mensaje (ej: "Aprovecha nuestras ofertas relámpago antes de medianoche.")
 * [Columna C]: URL de destino (Opcional, ej: "https://mitienda.com/oferta")
 * [Columna D]: Estado del envío (Se autocompleta con fecha y resultado)
 */

// ⚠️ REEMPLAZA CON TU ONE SIGNAL APP ID (El mismo usado en index.html)
const APP_ID = "REEMPLAZA_CON_TU_ONESIGNAL_APP_ID";

/**
 * Agrega un menú interactivo en Google Sheets al abrir el documento.
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("🔔 Notificaciones Push")
    .addItem("🚀 Enviar Notificación (Fila Seleccionada)", "enviarFilaSeleccionada")
    .addItem("📨 Enviar Notificación (Última Fila)", "enviarUltimaFila")
    .addSeparator()
    .addItem("🔑 Configurar API Key de OneSignal", "configurarApiKey")
    .addToUi();
}

/**
 * Permite guardar la REST API Key de forma segura en las Propiedades del Script
 * sin tener que exponerla en el código.
 */
function configurarApiKey() {
  const ui = SpreadsheetApp.getUi();
  const respuesta = ui.prompt(
    "Configuración de OneSignal",
    "Ingresa tu OneSignal REST API Key (la obtienes en OneSignal > Settings > Keys & IDs):",
    ui.ButtonSet.OK_CANCEL
  );

  if (respuesta.getSelectedButton() === ui.Button.OK) {
    const key = respuesta.getResponseText().trim();
    if (key) {
      PropertiesService.getScriptProperties().setProperty("ONESIGNAL_API_KEY", key);
      ui.alert("✅ API Key guardada con éxito.");
    } else {
      ui.alert("⚠️ La clave no puede estar vacía.");
    }
  }
}

/**
 * Envía la notificación con los datos de la fila actualmente activa/seleccionada.
 */
function enviarFilaSeleccionada() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const fila = sheet.getActiveCell().getRow();
  
  if (fila <= 1) {
    SpreadsheetApp.getUi().alert("⚠️ Por favor selecciona una fila de datos (fila 2 en adelante).");
    return;
  }
  
  procesarEnvioFila(sheet, fila);
}

/**
 * Envía la notificación con los datos de la última fila con contenido.
 */
function enviarUltimaFila() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const fila = sheet.getLastRow();
  
  if (fila <= 1) {
    SpreadsheetApp.getUi().alert("⚠️ No hay datos para enviar.");
    return;
  }
  
  procesarEnvioFila(sheet, fila);
}

/**
 * Procesa el envío llamando a la API de OneSignal y actualiza el estado.
 */
function procesarEnvioFila(sheet, fila) {
  const ui = SpreadsheetApp.getUi();
  
  const titulo = sheet.getRange(fila, 1).getValue().toString().trim();
  const mensaje = sheet.getRange(fila, 2).getValue().toString().trim();
  const urlDestino = sheet.getRange(fila, 3).getValue().toString().trim();
  
  if (!titulo || !mensaje) {
    ui.alert("⚠️ La fila " + fila + " debe tener al menos un Título (Columna A) y un Mensaje (Columna B).");
    return;
  }

  // Confirmación previa
  const confirm = ui.alert(
    "Confirmar Envío Push",
    "¿Deseas enviar la notificación a todos los suscriptores?\n\n" +
    "📌 Título: " + titulo + "\n" +
    "💬 Mensaje: " + mensaje,
    ui.ButtonSet.YES_NO
  );

  if (confirm !== ui.Button.YES) {
    return;
  }

  // Obtener API Key guardada
  const apiKey = PropertiesService.getScriptProperties().getProperty("ONESIGNAL_API_KEY");

  if (!apiKey) {
    throw new Error("Falta configurar ONESIGNAL_API_KEY. Usa el menú 'Notificaciones Push > Configurar API Key'.");
  }

  if (!APP_ID || APP_ID.startsWith("REEMPLAZA")) {
    throw new Error("Falta configurar la constante APP_ID en el archivo de Apps Script.");
  }

  // Estructura del Payload según la API de OneSignal v16
  const payload = {
    app_id: APP_ID,
    included_segments: ["Total Subscriptions"],
    target_channel: "push",
    headings: { en: titulo, es: titulo },
    contents: { en: mensaje, es: mensaje }
  };

  // Si se proporcionó una URL, se añade al payload
  if (urlDestino && urlDestino.startsWith("http")) {
    payload.url = urlDestino;
  }

  try {
    const response = UrlFetchApp.fetch(
      "https://api.onesignal.com/notifications",
      {
        method: "post",
        contentType: "application/json",
        headers: { "Authorization": "Key " + apiKey },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      }
    );

    const statusCode = response.getResponseCode();
    const responseText = response.getContentText();
    const data = JSON.parse(responseText);

    if (statusCode === 200 && data.id) {
      const fecha = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
      const receptores = data.recipients || 0;
      sheet.getRange(fila, 4).setValue(`✅ Enviado (${fecha}) - Destinatarios: ${receptores}`);
      ui.alert(`🎉 ¡Notificación enviada con éxito!\n\nID: ${data.id}\nDestinatarios alcanzados: ${receptores}`);
    } else {
      const errores = data.errors ? JSON.stringify(data.errors) : responseText;
      sheet.getRange(fila, 4).setValue(`❌ Error: ${errores}`);
      ui.alert(`❌ Error al enviar notificación:\n${errores}`);
    }
  } catch (err) {
    sheet.getRange(fila, 4).setValue(`❌ Error de conexión: ${err.message}`);
    ui.alert(`❌ Ocurrió una excepción:\n${err.message}`);
  }
}
