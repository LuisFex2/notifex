/**
 * SISTEMA OFICIAL DE NOTIFICACIONES PUSH ONESIGNAL PARA TASKER (Notifex)
 */
const NOMBRE_HOJA = "Notificaciones";
const ONESIGNAL_APP_ID = "3a3a6c44-ad86-4ce0-b474-ede5f6c1c1d7";
const ONESIGNAL_API_KEY = "TU_ONESIGNAL_API_KEY_AQUI";

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("🔔 Notifex (OneSignal)")
    .addItem("🚀 Procesar Notificaciones PENDIENTES", "procesarPendientes")
    .addToUi();
}

/**
 * Busca filas PENDIENTES, extrae el monto a la Col D,
 * y envía el Push vía OneSignal (Título = Col B, Mensaje = Col C)
 */
function procesarPendientes() {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = libro.getSheetByName(NOMBRE_HOJA) || libro.getActiveSheet();
  const ultimaFila = hoja.getLastRow();

  if (ultimaFila < 2) return;

  const datos = hoja.getRange(2, 1, ultimaFila - 1, 8).getValues();
  let procesadas = 0;

  for (let i = 0; i < datos.length; i++) {
    const filaNum = i + 2;
    const app = datos[i][1];          // Columna B: Aplicación (será el Título)
    const contenido = datos[i][2];    // Columna C: Contenido (será el Cuerpo)
    const estado = datos[i][4];       // Columna E: Estado

    if (estado && estado.toString().trim().toUpperCase() === "PENDIENTE") {
      
      // 1. Extraer el monto de la Columna C a la Columna D
      const montoExtraido = extraerMonto(contenido);
      if (montoExtraido) {
        hoja.getRange(filaNum, 4).setValue(montoExtraido); // Columna D: Monto
      }

      // 2. Enviar el Push con OneSignal
      const exito = enviarPushOneSignal(hoja, filaNum, app, contenido);
      if (exito) {
        procesadas++;
        Utilities.sleep(500); // Pausa breve entre envíos
      }
    }
  }

  if (procesadas > 0) {
    libro.toast(`✅ Se enviaron ${procesadas} notificaciones a tu celular.`, "Notifex");
  }
}

/**
 * Extrae únicamente el dinero (S/ o S/.) ignorando el código de seguridad
 */
function extraerMonto(texto) {
  if (!texto) return "";
  const str = texto.toString();
  const regex = /(?:S\/\.?|S\/\s*)\s*([0-9]+(?:\.[0-9]+)?)/i;
  const match = str.match(regex);
  return (match && match[1]) ? parseFloat(match[1]) : "";
}

/**
 * Envía el Push a OneSignal:
 * - Título: Únicamente la Columna B (ej: "Yape", "Interbank")
 * - Contenido: El texto de la Columna C
 * - web_push_topic: Único por cada fila para que se ACUMULEN y no se sobreescriban
 */
function enviarPushOneSignal(hoja, filaNum, app, contenido) {
  // Título: Solo el nombre de la app (Columna B)
  const titulo = (app && app.toString().trim()) ? app.toString().trim() : "Notifex";
  
  // Contenido: El mensaje completo capturado por Tasker (Columna C)
  const textoMensaje = contenido ? contenido.toString().trim() : "Pago registrado";

  // Identificador único para que Chrome/Android NO sobreescriba la notificación anterior
  const topicoUnico = "pago_" + filaNum + "_" + new Date().getTime();

  const payload = {
    app_id: ONESIGNAL_APP_ID,
    included_segments: ["Total Subscriptions"],
    target_channel: "push",
    headings: { es: titulo, en: titulo },
    contents: { es: textoMensaje, en: textoMensaje },
    web_push_topic: topicoUnico // <- ¡Hace que se apilen y se vean todas las notificaciones juntas!
  };

  const opciones = {
    method: "post",
    contentType: "application/json",
    headers: {
      "Authorization": "Key " + ONESIGNAL_API_KEY
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const respuesta = UrlFetchApp.fetch("https://api.onesignal.com/notifications", opciones);
    const codigo = respuesta.getResponseCode();
    const cuerpo = respuesta.getContentText();
    const data = JSON.parse(cuerpo);

    if (codigo === 200) {
      const fechaEnvio = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
      const idNotif = data.id || "OK";

      hoja.getRange(filaNum, 5).setValue("ENVIADO");     // Columna E: Estado
      hoja.getRange(filaNum, 6).setValue(fechaEnvio);    // Columna F: Fecha envío
      hoja.getRange(filaNum, 7).setValue(idNotif);       // Columna G: ID Notificación
      hoja.getRange(filaNum, 8).setValue("");            // Columna H: limpia error
      return true;
    } else {
      const err = data.errors ? JSON.stringify(data.errors) : cuerpo;
      hoja.getRange(filaNum, 8).setValue("OneSignal Error: " + err);
      return false;
    }
  } catch (error) {
    hoja.getRange(filaNum, 8).setValue("Excepción: " + error.message);
    return false;
  }
}
