import './loadEnv'
import app from './app'

const PORT = Number(process.env.PORT) || 4000;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`\x1b[32m%s\x1b[0m`, `🚀 [AnimeVerse API] Server started!`);
  console.log(`\x1b[36m%s\x1b[0m`, `📡 Listening on http://${HOST}:${PORT}`);
  console.log(`\x1b[36m%s\x1b[0m`, `📡 Also available at http://localhost:${PORT}`);
  console.log(`\x1b[2m%s\x1b[0m`, `---------------------------------------------------`);
});
