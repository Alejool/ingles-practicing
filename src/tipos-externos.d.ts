/**
 * nodemailer no trae tipos propios y solo se usa en un import perezoso dentro
 * de _mail.mts. Declararlo aquí evita el aviso sin instalar un paquete de
 * tipos que en producción no hace ninguna falta.
 */
declare module "nodemailer";
