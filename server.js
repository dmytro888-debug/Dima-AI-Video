import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const modules = [
  { id:'video', name:'AI Відео', icon:'▶', desc:'Сценарій → сцени → відео', badge:'9:16' },
  { id:'image', name:'AI Зображення', icon:'✦', desc:'Генерація та редагування', badge:'AI' },
  { id:'music', name:'Музика', icon:'♫', desc:'Фон, настрій, BPM, трек', badge:'AUDIO' },
  { id:'voice', name:'Голос', icon:'◉', desc:'Різні голоси та озвучення', badge:'TTS' },
  { id:'subtitles', name:'Субтитри', icon:'T', desc:'Авто + стилі + анімації', badge:'AUTO' },
  { id:'editor', name:'AI Редактор', icon:'✂', desc:'Монтаж, ефекти, переходи', badge:'EDIT' },
  { id:'avatar', name:'AI Аватар', icon:'◎', desc:'Ведучий та presenter', badge:'AI' },
  { id:'social', name:'Соцмережі', icon:'↗', desc:'TikTok, Reels, Facebook, YouTube', badge:'SOCIAL' }
];

app.get('/api/health', (_req,res)=>res.json({ok:true,name:'Dima AI Studio',version:'0.1.0'}));
app.get('/api/modules', (_req,res)=>res.json(modules));
app.post('/api/projects', (req,res)=>res.status(201).json({id:Date.now().toString(), name:req.body?.name || 'Новий проєкт', status:'draft'}));
app.post('/api/generate', (req,res)=>res.status(202).json({ok:true,status:'queued',message:'Задачу додано в чергу. Підключіть AI provider keys у Railway для реальної генерації.',input:req.body || {}}));

app.get('*', (_req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
app.listen(PORT,'0.0.0.0',()=>console.log(`Dima AI Studio listening on ${PORT}`));
