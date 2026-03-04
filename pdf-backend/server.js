const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;

// Carpeta donde se guardarán los PDFs
const uploadDir = path.join(__dirname, 'uploads');

// Crear carpeta si no existe
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.use(cors());
app.use(express.json());

// Configuración de multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const fileId = uuidv4();
    const extension = path.extname(file.originalname) || '.pdf';
    cb(null, `${fileId}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
  fileFilter: (req, file, cb) => {
    const isPdf =
      file.mimetype === 'application/pdf' ||
      path.extname(file.originalname).toLowerCase() === '.pdf';

    if (!isPdf) {
      return cb(new Error('Solo se permiten archivos PDF.'));
    }

    cb(null, true);
  },
});

// Subir PDF
app.post('/upload-pdf', upload.single('pdf'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió ningún archivo.' });
    }

    const fileId = path.parse(req.file.filename).name;

    return res.json({
      ok: true,
      fileId,
      originalName: req.file.originalname,
      storedName: req.file.filename,
    });
  } catch (error) {
    console.error('Error subiendo PDF:', error);
    return res.status(500).json({ error: 'Error interno al subir el PDF.' });
  }
});

// Ver / descargar PDF
app.get('/pdf/:id', (req, res) => {
  try {
    const { id } = req.params;

    const files = fs.readdirSync(uploadDir);
    const matchedFile = files.find((file) => path.parse(file).name === id);

    if (!matchedFile) {
      return res.status(404).json({ error: 'Archivo no encontrado.' });
    }

    const fullPath = path.join(uploadDir, matchedFile);
    return res.sendFile(fullPath);
  } catch (error) {
    console.error('Error obteniendo PDF:', error);
    return res.status(500).json({ error: 'Error interno al obtener el PDF.' });
  }
});

// Eliminar PDF por fileId
app.delete('/pdf/:id', (req, res) => {
  try {
    const { id } = req.params;

    const files = fs.readdirSync(uploadDir);
    const matchedFile = files.find((file) => path.parse(file).name === id);

    if (!matchedFile) {
      return res.status(404).json({ error: 'Archivo no encontrado.' });
    }

    const fullPath = path.join(uploadDir, matchedFile);
    fs.unlinkSync(fullPath);

    return res.json({
      ok: true,
      message: 'Archivo eliminado correctamente.',
      fileId: id,
    });
  } catch (error) {
    console.error('Error eliminando PDF:', error);
    return res.status(500).json({ error: 'Error interno al eliminar el PDF.' });
  }
});

app.listen(PORT,'0.0.0.0',()=>{
console.log(`Servidor de PDFs corriendo en puerto ${PORT}`);
}
);