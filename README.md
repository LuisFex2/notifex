# 🔔 PromoPush: Notificaciones PUSH a Android e iPhone desde Google Sheets

Proyecto completo para enviar notificaciones Push a teléfonos móviles Android e iOS (iPhone) directamente desde una hoja de cálculo de Google Sheets utilizando **Google Apps Script**, **OneSignal** y una **PWA (Progressive Web App)** alojada en la nube (AWS S3/CloudFront, AWS Amplify o GitHub Pages/Vercel).

---

## 📁 Estructura del Proyecto

```text
pwa-push-rapida/
├── index.html                   # Interfaz PWA con suscripción OneSignal v16
├── manifest.webmanifest         # Manifiesto de la aplicación web instalable
├── OneSignalSDKWorker.js        # Service Worker oficial de OneSignal
├── icon-192.png                 # Icono 192x192 para celulares
├── icon-512.png                 # Icono 512x512 para celulares y splash
├── create_icons.py              # Script generador de iconos
└── google-apps-script/
    └── Codigo.js                # Código para el editor de Google Apps Script
```

---

## 🚀 Guía Paso a Paso

### 1. Configurar tu cuenta en OneSignal

1. Entra a [onesignal.com](https://onesignal.com/) y crea una cuenta gratuita.
2. Haz clic en **New App/Website**:
   - Nombre: `PromoPush`
   - Plataforma: selecciona **Web Push**.
3. En la configuración de Web Push:
   - Selecciona **Typical Site**.
   - **Site Name**: `PromoPush`
   - **Site URL**: Ingresa la URL HTTPS donde alojarás la PWA (por ejemplo tu dominio AWS CloudFront, Amplify o Vercel). Para pruebas locales puedes activar el interruptor *"Localhost Testing"*.
4. Descarga los archivos del SDK si te lo solicita (ya los incluimos en esta carpeta: `OneSignalSDKWorker.js`).
5. Ve a **Settings > Keys & IDs** en OneSignal y copia:
   - **OneSignal App ID**: Lo usarás en `index.html` y en `Codigo.js`.
   - **Rest API Key**: Lo usarás en Google Sheets.

---

### 2. Configurar los Archivos de la PWA

1. Abre `index.html`:
   - Busca la línea:
     ```javascript
     const APP_ID = 'REEMPLAZA_CON_TU_ONESIGNAL_APP_ID';
     ```
   - Pega tu **OneSignal App ID**.

---

### 3. Subir la PWA a la Nube (AWS o Hosting HTTPS)

> **⚠️ Requisito obligatorio:** Las notificaciones Push y los Service Workers requieren conexión segura **HTTPS** y que los archivos estén en la raíz (`/`).

#### Opción A: AWS (S3 + CloudFront o AWS Amplify)
- **AWS Amplify Hosting:** Conecta tu repositorio o sube la carpeta `pwa-push-rapida`. AWS te dará una URL HTTPS automática con certificado SSL listo.
- **AWS S3 + CloudFront:** Sube los archivos a un bucket S3 configurado como sitio estático y apunta una distribución de CloudFront con HTTPS.

#### Opción B: Vercel / Netlify / GitHub Pages (100% Gratis y en 1 minuto)
- Puedes arrastrar la carpeta `pwa-push-rapida` a **Netlify Drop** o desplegar en **Vercel** para tener tu URL HTTPS instantáneamente.

---

### 4. Configurar Google Sheets y Apps Script

1. Abre una nueva hoja en [Google Sheets](https://sheets.new).
2. En la primera fila (encabezados), escribe:
   - **Columna A:** `Título`
   - **Columna B:** `Mensaje`
   - **Columna C:** `URL de Destino`
   - **Columna D:** `Estado del Envío`
3. Escribe un ejemplo en la fila 2:
   - A2: `🔥 ¡Oferta Relámpago!`
   - B2: `Aprovecha 50% de descuento en todos los productos hoy.`
   - C2: `https://tusitio.com/oferta`
4. En el menú superior de Google Sheets, ve a **Extensiones > Apps Script**.
5. Borra el código existente y pega todo el contenido de [`google-apps-script/Codigo.js`](./google-apps-script/Codigo.js).
6. En la parte superior de `Codigo.js`, reemplaza:
   ```javascript
   const APP_ID = "TU_ONESIGNAL_APP_ID";
   ```
7. Haz clic en **Guardar** (icono de disquete).
8. Vuelve a tu hoja de cálculo y recárgala (**F5**). Verás aparecer un nuevo menú:
   - **🔔 Notificaciones Push**
9. Haz clic en **🔔 Notificaciones Push > 🔑 Configurar API Key de OneSignal** y pega tu **REST API Key**.
10. ¡Listo! Para enviar, selecciona la fila que quieres notificar y haz clic en **🚀 Enviar Notificación (Fila Seleccionada)**.

---

### 5. Cómo Instalar y Probar en Android e iPhone

#### En Android:
1. Abre la URL en Chrome.
2. Pulsa en **Activar notificaciones** y acepta el permiso del navegador.
3. Puedes además pulsar los 3 puntos de Chrome > **"Instalar aplicación"** / **"Añadir a pantalla principal"**.

#### En iPhone (iOS 16.4 o superior):
> 💡 **Apple exige que la web esté añadida a la pantalla de inicio para poder recibir Push.**
1. Abre la URL en **Safari**.
2. Toca el botón **Compartir** (icono del cuadrado con flecha hacia arriba).
3. Selecciona **"Añadir a pantalla de inicio"** (Add to Home Screen).
4. Abre la aplicación desde el icono nuevo en la pantalla de inicio.
5. Pulsa en **Activar notificaciones** y autoriza las alertas en el diálogo del sistema.

---

### 6. Probar en Local (opcional)

Si deseas probar la interfaz antes de subirla a internet:
```powershell
cd c:\Users\Asus\Downloads\Tasker\pwa-push-rapida
npx serve
```
Y abre `http://localhost:3000` en tu navegador.
