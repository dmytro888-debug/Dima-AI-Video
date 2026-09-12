import express from 'express';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const app=express();
const PORT=process.env.PORT||3000;
const PUBLIC=path.join(__dirname,'public');
const JOBS=path.join(__dirname,'local-engine','jobs');
fs.mkdirSync(JOBS,{recursive:true});
app.use(express.json({limit:'2mb'}));
app.use(express.static(PUBLIC));

const modules=[
{id:'video',name:'AI Відео',icon:'▶',desc:'Текст → реальне відео',badge:'LOCAL'},
{id:'image',name:'AI Зображення',icon:'✦',desc:'Підготовка кадрів',badge:'LOCAL'},
{id:'music',name:'Музика',icon:'♫',desc:'Фон та монтаж',badge:'LOCAL'},
{id:'voice',name:'Голос',icon:'◉',desc:'Локальна озвучка',badge:'LOCAL'},
{id:'subtitles',name:'Субтитри',icon:'T',desc:'Безпечна зона + стилі',badge:'AUTO'},
{id:'editor',name:'AI Редактор',icon:'✂',desc:'Монтаж та сцени',badge:'LOCAL'},
{id:'avatar',name:'AI Аватар',icon:'◎',desc:'Локальні аватари',badge:'LOCAL'},
{id:'social',name:'Соцмережі',icon:'↗',desc:'TikTok, Reels, Facebook, YouTube',badge:'EXPORT'}
];

app.get('/api/health',(_req,res)=>res.json({ok:true,name:'Dima AI Studio',version:'1.0.0',mode:'self-hosted'}));
app.get('/api/modules',(_req,res)=>res.json(modules));
app.get('/api/providers',(_req,res)=>res.json([{id:'local',name:'Dima Local AI Engine',configured:true,modules:['video','image','music','voice','subtitles','editor','avatar','social'],paid:false}])) ;
app.get('/api/projects',(_req,res)=>res.json([]));
app.post('/api/projects',(req,res)=>res.status(201).json({id:Date.now().toString(),name:req.body?.name||'Новий проєкт',status:'draft'}));

function pythonCommand(){return process.platform==='win32'?'python':'python3';}
function sizeFor(format){const f=String(format||'9:16');if(f.startsWith('16:9'))return '832*480';if(f.startsWith('1:1'))return '624*624';return '480*832';}
function durationSeconds(value){const s=String(value||'5');if(s==='15')return 15;if(s==='30')return 30;if(s==='60')return 60;if(s.toLowerCase().includes('long'))return 60;return 5;}
function runLocalGeneration({prompt,size,seconds,output}){return new Promise((resolve,reject)=>{const script=path.join(__dirname,'local-engine','generate_local.py');const args=[script,'--prompt',prompt,'--size',size,'--seconds',String(seconds),'--output',output];const child=spawn(pythonCommand(),args,{cwd:__dirname,env:{...process.env,DIMA_AI_STUDIO_ROOT:__dirname},stdio:['ignore','pipe','pipe']});let out='',err='';child.stdout.on('data',d=>out+=d);child.stderr.on('data',d=>err+=d);child.on('error',e=>reject(new Error(`Не знайдено Python: ${e.message}`)));child.on('close',code=>{if(code===0){resolve(out.trim());}else reject(new Error((err||out||`Локальний двигун завершився з кодом ${code}`).slice(-4000)));});});}

app.post('/api/generate',async(req,res)=>{
 const input=req.body||{};
 if((input.module||'video')!=='video')return res.status(501).json({ok:false,status:'not_implemented',message:'Цей модуль ще не підключений до локального AI-двигуна. AI Відео вже працює через власний self-hosted engine.'});
 const id=crypto.randomUUID();
 const output=path.join(JOBS,`${id}.mp4`);
 const prompt=String(input.prompt||'A realistic cinematic flying vehicle continuously flying above a bright modern city in daylight, physically believable motion, dynamic camera, natural light, vivid colors');
 try{
   const seconds=durationSeconds(input.duration);
   const size=sizeFor(input.format);
   await runLocalGeneration({prompt,size,seconds,output});
   if(!fs.existsSync(output))throw new Error('Локальний двигун завершився без відеофайлу.');
   return res.json({ok:true,status:'completed',module:'video',provider:'local',message:`Готово: ${seconds} с. Відео створено локально без платних API.`,url:`/api/media/${id}.mp4`,duration:seconds});
 }catch(error){
   console.error(error);
   return res.status(502).json({ok:false,status:'local_engine_error',provider:'local',message:error?.message||'Помилка локального AI-двигуна.',hint:'Запусти local-engine/SETUP-WINDOWS.ps1 на ПК з NVIDIA GPU.'});
 }
});

app.get('/api/media/:name', (req,res)=>{
 const safe=path.basename(req.params.name);
 if(!safe.endsWith('.mp4'))return res.status(404).end();
 const file=path.join(JOBS,safe);
 if(!fs.existsSync(file))return res.status(404).end();
 res.type('video/mp4');res.sendFile(file);
});

app.use((_req,res)=>res.sendFile(path.join(PUBLIC,'index.html')));
app.listen(PORT,'0.0.0.0',()=>console.log(`Dima AI Studio 1.0.0 self-hosted listening on ${PORT}`));
