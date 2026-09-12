import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fal } from '@fal-ai/client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json({ limit:'2mb' }));
app.use(express.static(path.join(__dirname,'public')));

const modules=[
 {id:'video',name:'AI Відео',icon:'▶',desc:'Сценарій → сцени → відео',badge:'9:16'},
 {id:'image',name:'AI Зображення',icon:'✦',desc:'Генерація та редагування',badge:'AI'},
 {id:'music',name:'Музика',icon:'♫',desc:'Фон, настрій, BPM, трек',badge:'AUDIO'},
 {id:'voice',name:'Голос',icon:'◉',desc:'Різні голоси та озвучення',badge:'TTS'},
 {id:'subtitles',name:'Субтитри',icon:'T',desc:'Авто + стилі + анімації',badge:'AUTO'},
 {id:'editor',name:'AI Редактор',icon:'✂',desc:'Монтаж, ефекти, переходи',badge:'EDIT'},
 {id:'avatar',name:'AI Аватар',icon:'◎',desc:'Ведучий та presenter',badge:'AI'},
 {id:'social',name:'Соцмережі',icon:'↗',desc:'TikTok, Reels, Facebook, YouTube',badge:'SOCIAL'}
];
const providerCatalog=[
 {id:'openai',name:'OpenAI',env:'OPENAI_API_KEY',modules:['image','voice','subtitles','social']},
 {id:'replicate',name:'Replicate',env:'REPLICATE_API_TOKEN',modules:['video','image','music','avatar']},
 {id:'fal',name:'fal.ai',env:'FAL_KEY',modules:['video','image','music']},
 {id:'elevenlabs',name:'ElevenLabs',env:'ELEVENLABS_API_KEY',modules:['voice','avatar']}
];

app.get('/api/health',(_req,res)=>res.json({ok:true,name:'Dima AI Studio',version:'0.4.0'}));
app.get('/api/modules',(_req,res)=>res.json(modules));
app.get('/api/providers',(_req,res)=>res.json(providerCatalog.map(p=>({id:p.id,name:p.name,configured:Boolean(process.env[p.env]),modules:p.modules}))));
app.get('/api/projects',(_req,res)=>res.json([]));
app.post('/api/projects',(req,res)=>res.status(201).json({id:Date.now().toString(),name:req.body?.name||'Новий проєкт',status:'draft'}));

async function generateOpenAIImage(prompt,size='1024x1024'){
 const response=await fetch('https://api.openai.com/v1/images/generations',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${process.env.OPENAI_API_KEY}`},body:JSON.stringify({model:'gpt-image-2',prompt,size})});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(data?.error?.message||`OpenAI HTTP ${response.status}`);
 const item=data?.data?.[0]; if(!item)throw new Error('OpenAI не повернув зображення.');
 if(item.url)return {url:item.url}; if(item.b64_json)return {dataUrl:`data:image/png;base64,${item.b64_json}`};
 throw new Error('OpenAI повернув невідомий формат зображення.');
}

async function generateFalVideo(input){
 if(!process.env.FAL_KEY)throw new Error('FAL_KEY не налаштований у Railway.');
 fal.config({credentials:process.env.FAL_KEY});
 const format=String(input.format||'');
 const aspect_ratio=format.startsWith('16:9')?'16:9':format.startsWith('1:1')?'1:1':'9:16';
 const duration=String(input.duration||'5').startsWith('10')?'10':'5';
 const prompt=String(input.prompt||'A cinematic realistic flying vehicle moving continuously through a bright modern city, natural daylight, dynamic camera, realistic physics, premium film look');
 const result=await fal.subscribe('fal-ai/kling-video/v3/standard/text-to-video',{input:{prompt,aspect_ratio,duration,generate_audio:false},logs:true});
 const video=result?.data?.video;
 if(!video?.url)throw new Error('fal.ai не повернув відеофайл.');
 return {url:video.url,requestId:result.requestId||null,provider:'fal',model:'kling-video-v3-standard'};
}

app.post('/api/generate',async(req,res)=>{
 const input=req.body||{};
 const requested=input.module||'video';
 const providers=providerCatalog.filter(p=>p.modules.includes(requested));
 const configured=providers.find(p=>process.env[p.env]);
 if(!configured)return res.status(503).json({ok:false,status:'provider_required',module:requested,message:`Для «${modules.find(m=>m.id===requested)?.name||requested}» ще не підключено AI-провайдер.`});
 try{
  if(requested==='video'&&configured.id==='fal'){
   const video=await generateFalVideo(input);
   return res.json({ok:true,status:'completed',module:'video',message:'Відео успішно створено.',...video});
  }
  if(requested==='image'&&configured.id==='openai'){
   const size=String(input.format||'').startsWith('9:16')?'1024x1536':String(input.format||'').startsWith('16:9')?'1536x1024':'1024x1024';
   const image=await generateOpenAIImage(String(input.prompt||'Створи якісне AI-зображення'),size);
   return res.json({ok:true,status:'completed',provider:'openai',module:'image',message:'Зображення успішно створено.',...image});
  }
  return res.status(202).json({ok:true,status:'queued',provider:configured.id,message:`Провайдер ${configured.name} підключений. Цей модуль готується до реальної генерації.`,input});
 }catch(error){
  console.error(error);
  return res.status(502).json({ok:false,status:'provider_error',provider:configured.id,message:error?.message||'Помилка AI-провайдера.'});
 }
});

app.use((_req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
app.listen(PORT,'0.0.0.0',()=>console.log(`Dima AI Studio 0.4.0 listening on ${PORT}`));
