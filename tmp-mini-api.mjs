import express from 'express';
const app = express();
app.get('/hello', (_req,res)=>res.json({hi:true}));
app.listen(4001, ()=>console.log('mini up'));
setTimeout(()=>{}, 1000000);
