'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check } from 'lucide-react';
import { CART_STORAGE_KEY } from '@/lib/products';

export default function AddToCartButton({ productId, disabled }: { productId: number; disabled: boolean }) {
  const [added, setAdded] = useState(false);
  const router = useRouter();
  function add() {
    if (disabled) return;
    let cart: number[] = [];
    try { cart = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || '[]'); } catch { cart = []; }
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify([...cart, productId]));
    setAdded(true);
    window.setTimeout(() => router.push('/checkout'), 350);
  }
  return <button className="detail-add-button" onClick={add} disabled={disabled}>{disabled ? 'Price Pending' : added ? <>Added <Check size={17} /></> : <>Add to Bag <ArrowRight size={17} /></>}</button>;
}
