// functions/notificar.js
const { Client } = require('pg');
const twilio = require('twilio');

exports.handler = async function (event, context) {
    const mensaje = 'Se ha registrado un nuevo evento con más de 10 decesos';
    console.log(mensaje);

    // Configuración de Twilio
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

    const twilioClient = twilio(accountSid, authToken);

    // Configuración de PostgreSQL
    const pgClient = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false,
        },
    });

    try {
        await pgClient.connect();

        // Escuchar la notificación
        await pgClient.query('LISTEN decesos_alerta');

        // Manejar la notificación
        const notification = await pgClient.query('SELECT * FROM pg_notify()');
        console.log('Notificación recibida:', notification);

        // Verificar si el evento es una notificación de decesos_alerta
        if (notification.payload === '{"mensaje": "Nuevo registro con más de 10 decesos"}') {
            // Enviar SMS
            await twilioClient.messages.create({
                to: '+1234567890', // Reemplazar con el número de teléfono de destino
                from: twilioPhoneNumber,
                body: mensaje,
            });

            console.log(`SMS enviado a +1234567890`); // Actualizar con el número de teléfono de destino
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Procesado exitosamente' }),
        };
    } catch (error) {
        console.error('Error al manejar la notificación:', error);
        throw new Error('Error interno del servidor');
    } finally {
        await pgClient.end();
    }
};
