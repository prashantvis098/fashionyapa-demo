import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'node:fs';
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
initializeApp({credential:cert(serviceAccount)});const db=getFirestore();const products=[
{id:1,name:'8-in-1 Beauty Makeup Combo',subtitle:'MARS, Lakmé & Insight essentials',price:1300,tag:'BEAUTY FAVOURITE',image_url:'/images/combos/combo-1.png',description:'A curated mix of makeup favourites for versatile everyday and occasion looks.',category:'Viral Combos',stock:0},
{id:2,name:'Everyday Beauty Combo',subtitle:'Everyday skincare and makeup essentials',price:1162,tag:'EVERYDAY GLOW',image_url:'/images/combos/combo-2.png',description:'Everyday beauty essentials in one convenient combo.',category:'Viral Combos',stock:0},
{id:3,name:'Insight Complete Makeup Combo',subtitle:'A complete collection of Insight makeup',price:2063,tag:'MAKEUP ESSENTIALS',image_url:'/images/combos/combo-3.png',description:'A coordinated selection of Insight makeup essentials.',category:'Viral Combos',stock:0},
{id:4,name:'MARS Makeup Essentials Combo',subtitle:'Face, eye, lip and nail essentials',price:2300,tag:'TRENDING COMBO',image_url:'/images/combos/combo-4.png',description:'A multi-category makeup set covering face, eyes, lips and nails.',category:'Viral Combos',stock:0},
{id:5,name:'Swiss Beauty Complete Makeup Combo',subtitle:'A versatile collection of makeup favourites',price:3380,tag:'COMPLETE COLLECTION',image_url:'/images/combos/combo-5.png',description:'A broad collection of makeup favourites.',category:'Viral Combos',stock:0},
{id:6,name:'Complete Body Care Combo',subtitle:'Everyday cleansing and body-care essentials',price:1620,tag:'SELF-CARE FAVOURITE',image_url:'/images/combos/combo-6.png',description:'Body-care essentials for a simple everyday routine.',category:'Viral Combos',stock:0},
{id:7,name:'Lazy Girl Makeup Combo',subtitle:'Five essentials for a quick everyday look',price:null,tag:'EASY EVERYDAY LOOK',image_url:'/images/combos/combo-7.png',description:'Final selling price awaiting confirmation.',category:'Viral Combos',stock:0,is_active:true}];
for(const p of products){const {id,...data}=p;await db.collection('products').doc(String(id)).set({...data,storefront_id:id,is_active:p.is_active??true,compare_at_price:null,created_at:new Date().toISOString(),updated_at:new Date().toISOString()},{merge:true});}console.log('Seeded 7 initial combos. Combo 7 remains hidden and unpriced until client confirms.');process.exit(0);
