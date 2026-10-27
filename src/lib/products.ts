export type Product = {
  id: number;
  name: string;
  subtitle: string;
  price: number | null;
  tag: string;
  image: string;
  description: string;
};

// Product 7 intentionally remains unpriced until Fashionyapa confirms it.
export const products: Product[] = [
  { id: 1, name: '8-in-1 Beauty Makeup Combo', subtitle: 'MARS, Lakmé & Insight essentials', price: 1300, tag: 'BEAUTY FAVOURITE', image: '/images/combos/combo-1/image-1.webp', description: 'A curated mix of makeup favourites for creating versatile everyday and occasion looks.' },
  { id: 2, name: 'Everyday Beauty Combo', subtitle: 'Everyday skincare and makeup essentials', price: 1162, tag: 'EVERYDAY GLOW', image: '/images/combos/combo-2/image-1.webp', description: 'Everyday beauty essentials brought together in one convenient combo.' },
  { id: 3, name: 'Insight Complete Makeup Combo', subtitle: 'A complete collection of Insight makeup', price: 2063, tag: 'MAKEUP ESSENTIALS', image: '/images/combos/combo-3/image-1.webp', description: 'A coordinated selection of Insight makeup essentials for your beauty routine.' },
  { id: 4, name: 'MARS Makeup Essentials Combo', subtitle: 'Face, eye, lip and nail essentials', price: 2300, tag: 'TRENDING COMBO', image: '/images/combos/combo-4/image-1.webp', description: 'A multi-category makeup set covering face, eyes, lips and nails.' },
  { id: 5, name: 'Swiss Beauty Complete Makeup Combo', subtitle: 'A versatile collection of makeup favourites', price: 3380, tag: 'COMPLETE COLLECTION', image: '/images/combos/combo-5/image-1.webp', description: 'A broad collection of makeup favourites to build out your beauty kit.' },
  { id: 6, name: 'Complete Body Care Combo', subtitle: 'Everyday cleansing and body-care essentials', price: 1620, tag: 'SELF-CARE FAVOURITE', image: '/images/combos/combo-6/image-1.webp', description: 'Body-care essentials grouped for a simple everyday self-care routine.' },
  { id: 7, name: 'Lazy Girl Makeup Combo', subtitle: 'Five essentials for a quick everyday look', price: null, tag: 'EASY EVERYDAY LOOK', image: '/images/combos/combo-7/image-1.webp', description: 'Five beauty essentials for a quick everyday look. Final selling price is awaiting confirmation.' },
  { id: 8, name: 'Lip Care Combo', subtitle: 'A curated collection of lip-care and lip-colour essentials', price: null, tag: 'LIP CARE FAVOURITE', image: '/images/combo-gallery/combo-8/01.jpg', description: 'A curated lip-care combo. Confirm the final included products, variants and selling price before accepting orders.' },
];

export const CART_STORAGE_KEY = 'fashionyapa-cart-v1';
