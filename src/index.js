// downloader/src/index.js
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');
const scraper = require('btch-downloader');
const express = require('express');
const puppeteer = require('puppeteer');
const path = require('path');
const morgan = require('morgan');

const axios = require('axios');
const stream = require('stream');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, '../public')));
// Middleware para logging
app.use(morgan('combined'));

// Middleware para analizar cuerpos de solicitudes
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware para límite de tasa
const limiter = rateLimit({
  windowMs: 55 * 1000, // 55 segundos
  max: 100, // Limitar a 100 solicitudes por ventana
  message: {
    ok: false,
    error: {
      code: 429,
      message: 'Rate limit exceeded. See "Retry-After"'
    }
  },
  headers: true
});
app.use(limiter);

// Ruta para obtener el .mp4 del Reel de Facebook
app.get('/api/facebook', async (req, res) => {
  const reelUrl = req.query.url;
  if (!reelUrl) return res.status(400).json({ error: 'Falta la URL' });

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
    );

    const mp4Links = [];

    page.on('response', async (response) => {
      const contentType = response.headers()['content-type'] || '';
      if (contentType.includes('video/mp4')) {
        mp4Links.push({
          url: response.url(),
          size: parseInt(response.headers()['content-length'] || '0'),
        });
      }
    });

    await page.goto(reelUrl, { waitUntil: 'networkidle2', timeout: 0 });
    await new Promise((r) => setTimeout(r, 8000));

    await browser.close();

    if (mp4Links.length === 0) {
      return res.status(404).json({ error: 'No se encontró ningún .mp4 en la red.' });
    }

    mp4Links.sort((a, b) => b.size - a.size);
    const best = mp4Links[0];

    return res.json({ video: best.url, size: best.size });
  } catch (err) {
    console.error('Error al scrapear:', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
});
// 📦 PROXY para evitar CORS
app.get('/proxy/video', async (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) return res.status(400).send('Falta la URL del video');

  try {
    const response = await axios({
      method: 'get',
      url: videoUrl,
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0', // puede ser más realista si hace falta
      },
    });

    res.setHeader('Content-Type', 'video/mp4');
    response.data.pipe(res);
  } catch (err) {
    console.error('Error al proxiar el video:', err.message);
    res.status(500).send('No se pudo cargar el video 😢');
  }
});

// 🧠 Scrapear Reel y obtener .mp4
app.get('/api/instagram', async (req, res) => {
  const reelUrl = req.query.url;
  if (!reelUrl) return res.status(400).json({ error: 'Falta la URL' });

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
    );

    const mp4Links = [];

    page.on('response', async (response) => {
      const contentType = response.headers()['content-type'] || '';
      if (contentType.includes('video/mp4')) {
        mp4Links.push({
          url: response.url(),
          size: parseInt(response.headers()['content-length'] || '0'),
        });
      }
    });

    await page.goto(reelUrl, { waitUntil: 'networkidle2', timeout: 0 });
    await new Promise((r) => setTimeout(r, 8000));

    await browser.close();

    if (mp4Links.length === 0) {
      return res.status(404).json({ error: 'No se encontró ningún .mp4 en la red.' });
    }

    mp4Links.sort((a, b) => b.size - a.size);
    const best = mp4Links[0];

    return res.json({ video: best.url, size: best.size });
  } catch (err) {
    console.error('Error al scrapear:', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// Ruta para TikTok
app.get('/tiktok/api.php', async (req, res) => {
  try {
    const urls = req.query.url;
    const result = await scraper.ttdl(urls);
    const { audio, video } = result;
    res.json({ audio, video });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
app.listen(PORT, () => {
  console.log(`✅ Downloader corriendo en http://localhost:${PORT}`);
});
