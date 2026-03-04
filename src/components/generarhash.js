const bcrypt = require('bcryptjs');

// Contraseña inicial
const password = '1234';

// Generar hash bcrypt
const saltRounds = 10;
const hash = bcrypt.hashSync(password, saltRounds);

// Imprimir el hash generado
console.log('Hash generado para "1234":', hash);