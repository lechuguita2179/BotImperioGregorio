const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const { Boom } = require('@hapi/boom')
const qrcode = require('qrcode-terminal')

async function iniciarBot() {
    // 1. Configuración de la sesión
    const { state, saveCreds } = await useMultiFileAuthState('sesion_auth')
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true, // Esto intenta imprimirlo solo
        browser: ["Moderador", "Chrome", "1.0.0"]
    })

    // Guardar credenciales cuando se vincula
    sock.ev.on('creds.update', saveCreds)

    // 2. Control de conexión y Generación de QR
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update

        // SI SALE EL QR, lo forzamos a mostrarse con qrcode-terminal
        if (qr) {
            console.log("\n--- ESCANEA EL CÓDIGO QR ABAJO ---")
            qrcode.generate(qr, { small: true })
        }

        if (connection === 'close') {
            const debeReconectar = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut
            if (debeReconectar) {
                console.log("Reconectando...")
                iniciarBot()
            }
        } else if (connection === 'open') {
            console.log('\n--- ¡BOT CONECTADO CON ÉXITO! ---')
        }
    })

    // 3. Lógica Anti-Links
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0]
        if (!m.message || m.key.fromMe) return

        const texto = m.message.conversation || m.message.extendedTextMessage?.text || ""
        const esGrupo = m.key.remoteJid.endsWith('@g.us')

        // Detectar links de grupos o links externos
        if (esGrupo && (texto.includes('chat.whatsapp.com') || texto.includes('https://'))) {
            console.log("¡Link detectado! Procediendo a expulsar...")
            
            await sock.groupParticipantsUpdate(m.key.remoteJid, [m.key.participant], "remove")
                .catch(() => console.log("No pude expulsar al usuario. ¿Tengo permisos de Admin?"))
        }
    })
}

iniciarBot()
