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

const providerCatalog = [
  { id:'openai', name:'OpenAI', env:'OPENAI_API_KEY', modules:['image','voice','subtitles','social'] },
  { id:'replicate', name:'Replicate', env:'REPLICATE_API_TOKEN', modules:['video','image','music','avatar'] },
  { id:'fal', name:'fal.ai', env:'FAL_KEY', modules:['video','image','music'] },
  { id:'elevenlabs', name:'ElevenLabs', env:'ELEVENLABS_API_KEY', modules:['voice','avatar'] }
];

app.get('/api/health', (_req,res)=>res.json({ok:true,name:'Dima AI Studio',version:'0.2.0'}));
app.get('/api/modules', (_req,res)=>res.json(modules));
app.get('/api/providers', (_req,res)=>res.json(providerCatalog.map(p=>({id:p.id,name:p.name,configured:Boolean(process.env[p.env]),modules:p.modules}))));
app.get('/api/projects', (_req,res)=>res.json([]));
app.post('/api/projects', (req,res)=>res.status(201).json({id:Date.now().toString(), name:req.body?.name || 'Новий проєкт', status:'draft'}));

app.post('/api/generate', (req,res)=>{
  const input=req.body || {};
  const requested=input.module || 'video';
  const providers=providerCatalog.filter(p=>p.modules.includes(requested));
  const configured=providers.find(p=>process.env[p.env]);
  if(!configured){
    return res.status(503).json({ok:false,status:'provider_required',module:requested,message:`Для «${modules.find(m=>m.id===requested)?.name || requested}» ще не підключено AI-провайдер. Відкрий Налаштування та додай API-ключ відповідного сервісу.`});
  }
  return res.status(202).json({ok:true,status:'queued',provider:configured.id,message:`Задачу прийнято в чергу через ${configured.name}. Наступний крок — виконання генерації.`,input});
});

app.use((_req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
app.listen(PORT,'0.0.0.0',()=>console.log(`Dima AI Studio 0.2.0 listening on ${PORT}`));
