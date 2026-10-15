/**
 * SISTEMA OFICIAL DE NOTIFICACIONES PUSH Y CONTROL DE CAJA EN TIEMPO REAL (Notifex)
 */
const NOMBRE_HOJA_NOTIF = "Notificaciones";
const NOMBRE_HOJA_ACCESOS = "Accesos";
const ONESIGNAL_APP_ID = "3a3a6c44-ad86-4ce0-b474-ede5f6c1c1d7";
const ONESIGNAL_API_KEY = "TU_ONESIGNAL_API_KEY_AQUI";

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("🔔 Notifex (OneSignal)")
    .addItem("🚀 Procesar Notificaciones PENDIENTES", "procesarPendientes")
    .addToUi();
}

/**
 * API WEB ULTRA RÁPIDA: Valida el PIN en la hoja "Accesos" y entrega solo los pagos de HOY.
 */
function doGet(e) {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  const pinIngresado = (e && e.parameter && e.parameter.pin) ? e.parameter.pin.toString().trim() : "";

  if (!pinIngresado) {
    return ContentService.createTextOutput(JSON.stringify({
      autorizado: false,
      error: "PIN requerido."
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // 1. Validar PIN directamente en la hoja "Accesos"
  const hojaAccesos = libro.getSheetByName(NOMBRE_HOJA_ACCESOS) || libro.getSheetByName("Accesos");
  let usuarioValido = null;

  if (hojaAccesos) {
    const ultFilaAccesos = hojaAccesos.getLastRow();
    if (ultFilaAccesos >= 2) {
      const filas = hojaAccesos.getRange(2, 1, ultFilaAccesos - 1, 5).getValues();
      for (let i = 0; i < filas.length; i++) {
        const nombre = filas[i][0] ? filas[i][0].toString().trim() : "";
        const pin = filas[i][1] ? filas[i][1].toString().trim() : "";
        const rol = filas[i][3] ? filas[i][3].toString().trim() : "Vendedor";
        const estado = filas[i][4] ? filas[i][4].toString().trim().toUpperCase() : "";

        if (pin === pinIngresado && estado === "ACTIVO") {
          usuarioValido = { nombre: nombre, rol: rol };
          break;
        }
      }
    }
  }

  // Si el PIN no existe o el vendedor está INACTIVO
  if (!usuarioValido) {
    return ContentService.createTextOutput(JSON.stringify({
      autorizado: false,
      error: "PIN incorrecto o acceso revocado por el dueño."
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // 2. Extraer pagos de HOY de forma ultra rápida
  const hojaNotif = libro.getSheetByName(NOMBRE_HOJA_NOTIF) || libro.getSheetByName("Notificaciones");
  const ultFilaNotif = hojaNotif ? hojaNotif.getLastRow() : 0;
  const fechaHoyStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy");

  const pagosHoy = [];
  let sumaTotal = 0;

  if (ultFilaNotif >= 2) {
    // Optimización de velocidad: Como los pagos se agregan al final, solo leemos las filas recientes (hasta 200 filas)
    const cantFilasLeer = Math.min(ultFilaNotif - 1, 200);
    const filaInicio = ultFilaNotif - cantFilasLeer + 1;
    const datos = hojaNotif.getRange(filaInicio, 1, cantFilasLeer, 6).getValues();

    for (let i = datos.length - 1; i >= 0; i--) {
      const fechaOp = datos[i][0] ? datos[i][0].toString() : "";
      const app = datos[i][1] ? datos[i][1].toString() : "Pago";
      const contenido = datos[i][2] ? datos[i][2].toString() : "";
      const monto = parseFloat(datos[i][3]) || 0;
      const fechaEnvio = datos[i][5] ? datos[i][5].toString() : "";

      if (fechaOp.includes(fechaHoyStr) || fechaEnvio.includes(fechaHoyStr)) {
        sumaTotal += monto;
        pagosHoy.push({
          app: app,
          contenido: contenido,
          monto: monto.toFixed(2),
          fecha: fechaOp || fechaEnvio
        });
      }
    }
  }

  return ContentService.createTextOutput(JSON.stringify({
    autorizado: true,
    usuario: usuarioValido,
    fecha: fechaHoyStr,
    operaciones: pagosHoy.length,
    totalMonto: sumaTotal.toFixed(2),
    pagos: pagosHoy
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Busca filas PENDIENTES, extrae el monto a la Col D,
 * y envía el Push vía OneSignal (Título = Col B, Mensaje = Col C)
 */
function procesarPendientes() {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = libro.getSheetByName(NOMBRE_HOJA_NOTIF) || libro.getActiveSheet();
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
  const titulo = (app && app.toString().trim()) ? app.toString().trim() : "Notifex";
  const textoMensaje = contenido ? contenido.toString().trim() : "Pago registrado";
  const topicoUnico = "pago_" + filaNum + "_" + new Date().getTime();

  const payload = {
    app_id: ONESIGNAL_APP_ID,
    included_segments: ["Total Subscriptions"],
    target_channel: "push",
    headings: { es: titulo, en: titulo },
    contents: { es: textoMensaje, en: titulo + ": " + textoMensaje },
    priority: 10,
    web_push_topic: topicoUnico
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
