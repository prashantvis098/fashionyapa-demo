
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CART_STORAGE_KEY } from '@/lib/products';
import {
  ArrowRight,
  Heart,
  Menu,
  Search,
  ShoppingBag,
  Truck,
  Gift,
  ShieldCheck,
  Headset,
  X,
  Sparkles,
  Check,
  Instagram,
  Youtube,
  MapPin,
  Mail,
  Phone,
  MessageCircle,
  Star,
  Send,
  ExternalLink,
} from 'lucide-react';

const instagramUrl = 'https://www.instagram.com/fashionyapa/';
const reviewsInstagramUrl = 'https://www.instagram.com/realvibereviews/';
const youtubeUrl = 'https://youtube.com/@fashionyapa4401';

type Product = {
  id: number;
  name: string;
  subtitle: string;
  mrp: number | null;
  price: number | null;
  tag: string;
  image: string;
};

const initialProducts: Product[] = [
  {
    id: 1,
    name: '8-in-1 Beauty Makeup Combo',
    subtitle: 'MARS, Lakmé & Insight essentials',
    mrp: null,
    price: 1300,
    tag: 'BEAUTY FAVOURITE',
    image: '/images/combos/combo-1/image-5.webp',
  },
  {
    id: 2,
    name: 'Everyday Beauty Combo',
    subtitle: 'Everyday skincare and makeup essentials',
    mrp: null,
    price: 1162,
    tag: 'EVERYDAY GLOW',
    image: '/images/combos/combo-2/image-5.webp',
  },
  {
    id: 3,
    name: 'Insight Complete Makeup Combo',
    subtitle: 'A complete collection of Insight makeup',
    mrp: null,
    price: 2063,
    tag: 'MAKEUP ESSENTIALS',
    image: '/images/combos/combo-3/image-3.webp',
  },
  {
    id: 4,
    name: 'MARS Makeup Essentials Combo',
    subtitle: 'Face, eye, lip and nail essentials',
    mrp: null,
    price: 2300,
    tag: 'TRENDING COMBO',
    image: '/images/combos/combo-4/image-5.webp',
  },
  {
    id: 5,
    name: 'Swiss Beauty Complete Makeup Combo',
    subtitle: 'A versatile collection of makeup favourites',
    mrp: null,
    price: 3380,
    tag: 'COMPLETE COLLECTION',
    image: '/images/combos/combo-5/image-5.webp',
  },
  {
    id: 6,
    name: 'Complete Body Care Combo',
    subtitle: 'Everyday cleansing and body-care essentials',
    mrp: null,
    price: 2300,
    tag: 'SELF-CARE FAVOURITE',
    image: '/images/combos/combo-6/image-6.webp',
  },
  {
    id: 7,
    name: 'Lazy Girl Makeup Combo',
    subtitle: 'Five essentials for a quick everyday look',
    mrp: null,
    price: 1575,
    tag: 'EASY EVERYDAY LOOK',
    image: '/images/combos/combo-7/image-6.webp',
  },
  { id: 8, name: 'Lip Care Combo', subtitle: 'A curated collection of lip-care and lip-colour essentials', mrp: null, price: null, tag: 'LIP CARE FAVOURITE', image: '/images/combos/combo-8/image-3.webp' },
];

export default function Home() {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [cart, setCart] = useState<number[]>([]);
  const [liked, setLiked] = useState<number[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [cartLoaded, setCartLoaded] = useState(false);
  const [feedbackName, setFeedbackName] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');

  useEffect(() => {
    try { setCart(JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || '[]')); } catch { setCart([]); }
    setCartLoaded(true);
  }, []);

  useEffect(() => {
    let active = true;
    fetch('/api/products', { cache: 'no-store' }).then(r => r.json()).then(data => {
      if (!active || !Array.isArray(data.products) || !data.products.length) return;
      const mapped: Product[] = data.products.map((p: Record<string, unknown>) => ({ id: Number(p.storefront_id ?? p.id), name: String(p.name || ''), subtitle: String(p.subtitle || p.description || ''), mrp: p.compare_at_price == null ? null : Number(p.compare_at_price), price: p.price == null ? null : Number(p.price), tag: String(p.tag || 'VIRAL COMBO'), image: String(p.image_url || p.image || initialProducts.find((fallback) => fallback.id === Number(p.storefront_id ?? p.id))?.image || '') }));
      setProducts(mapped.some((item) => item.id === 8) ? mapped : [...mapped, initialProducts.find((item) => item.id === 8)!]);
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (cartLoaded) localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart, cartLoaded]);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2500);
  };

  const filtered = useMemo(
    () =>
      products.filter((product) =>
        `${product.name} ${product.subtitle}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [query],
  );

  const cartLines = products
    .map((product) => ({
      ...product,
      quantity: cart.filter((id) => id === product.id).length,
    }))
    .filter((product) => product.quantity > 0);

  const subtotal = cartLines.reduce(
    (sum, product) => sum + (product.price ?? 0) * product.quantity,
    0,
  );

  const shipping = subtotal === 0 || subtotal >= 1999 ? 0 : 49;

  const addToCart = (product: Product) => {
    if (product.price === null) {
      notify('Selling price will be updated once confirmed.');
      return;
    }

    setCart((current) => [...current, product.id]);
    try { const stored = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || '[]'); localStorage.setItem(CART_STORAGE_KEY, JSON.stringify([...stored, product.id])); } catch { localStorage.setItem(CART_STORAGE_KEY, JSON.stringify([product.id])); }
    notify('Added to your bag!');
  };

  const toggleLike = (id: number) => {
    setLiked((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  };

  return (
    <main>
      <div className="promo-bar">
        <span>
          <Gift size={14} /> Free shipping on orders above ₹1,999
        </span>
        <span className="promo-center">
          <Sparkles size={13} /> Viral Beauty Combos <Sparkles size={13} />
        </span>
        <span>
          <Truck size={15} /> COD Available (₹150 Advance)
        </span>
      </div>

      <header className="site-header">
        <div className="header-inner">
          <button
            className="mobile-menu icon-button"
            aria-label="Toggle menu"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X /> : <Menu />}
          </button>

          <a className="brand" href="#home" aria-label="Fashionyapa home">
            <img src="/images/fashionyapa-logo.webp" alt="Fashionyapa logo" />
            <span>FASHIONYAPA</span>
          </a>

          <nav
            className={menuOpen ? 'nav nav-open' : 'nav'}
            aria-label="Main navigation"
          >
            <a className="active" href="#home" onClick={() => setMenuOpen(false)}>
              Home
            </a>
            <a href="#products" onClick={() => setMenuOpen(false)}>
              Viral Combos
            </a>
            <a href="#about" onClick={() => setMenuOpen(false)}>
              Our Story
            </a>
            <a href="#faq" onClick={() => setMenuOpen(false)}>
              Help &amp; Delivery
            </a>
          </nav>

          <div className="header-actions">
            <button
              className="icon-button search-button"
              aria-label="Search combos"
              onClick={() => {
                setSearchOpen(!searchOpen);
                document.getElementById('products')?.scrollIntoView({
                  behavior: 'smooth',
                });
              }}
            >
              <Search />
            </button>

            <button
              className="icon-button wish-header"
              aria-label={`${liked.length} wishlist items`}
              onClick={() =>
                notify(
                  liked.length
                    ? `${liked.length} combos saved to your wishlist`
                    : 'Tap the heart to save your favourite combos',
                )
              }
            >
              <Heart />
              <b>{liked.length}</b>
            </button>

            <button
              type="button"
              className="icon-button bag-header"
              aria-label={`${cart.length} items in bag`}
              onClick={() => setCartOpen(true)}
            >
              <ShoppingBag />
              <b>{cart.length}</b>
            </button>
          </div>
        </div>
      </header>

      <section className="hero" id="home">
        <div className="hero-backdrop" />

        <div className="hero-content">
          <div className="eyebrow">YOUR BEAUTY. YOUR VIBE.</div>

          <h1>
            Your beauty
            <br />
            favourites, <em>together.</em>
          </h1>

          <p>
            Discover handpicked makeup and body-care combos that bring your
            favourite beauty essentials together in one place.
          </p>

          <a className="primary-cta" href="#products">
            Explore Viral Combos <ArrowRight size={17} />
          </a>

          <div className="social-proof">
            <div className="avatar-row" aria-hidden="true">
              <span>♡</span>
              <span>✦</span>
              <span>✿</span>
              <span>♡</span>
            </div>
            <div>
              <strong>Find your next beauty favourite</strong>
              <div className="stars" aria-label="Decorative stars">
                ✦ ✦ ✦ ✦ ✦
              </div>
            </div>
          </div>
        </div>

        <div className="hero-photo">
          <img
            src="/images/fashionyapa.webp"
            alt="Fashionyapa Viral Combos — beauty essentials banner"
          />
        </div>

        <a className="hero-banner-link" href="#products" aria-label="Shop Fashionyapa Viral Combos" />
      </section>

      <section className="benefit-strip" aria-label="Shopping information">
        <div className="benefit">
          <Truck />
          <span>
            <strong>Delivery in 7–10 Days</strong>
            <small>Delivery timeline</small>
          </span>
        </div>
        <i />
        <div className="benefit">
          <Gift />
          <span>
            <strong>Free Shipping</strong>
            <small>On orders above ₹1,999</small>
          </span>
        </div>
        <i />
        <div className="benefit">
          <ShieldCheck />
          <span>
            <strong>COD Available</strong>
            <small>₹150 advance payment</small>
          </span>
        </div>
        <i />
        <div className="benefit">
          <Headset />
          <span>
            <strong>Customer Support</strong>
            <small>Call or WhatsApp</small>
          </span>
        </div>
      </section>

      <section className="featured-section" id="products">
        <div className="section-inner">
          <div className="featured-heading">
            <div>
              <div className="eyebrow">THE BEAUTY EDIT</div>
              <h2>Shop Viral Combos</h2>
            </div>
            <span className="view-all">
              8 Curated Combos <Sparkles size={15} />
            </span>
          </div>

          {searchOpen && (
            <div className="inline-search">
              <Search size={15} />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search the 8 beauty combos..."
              />
              <button
                className="icon-button"
                aria-label="Close search"
                onClick={() => {
                  setSearchOpen(false);
                  setQuery('');
                }}
              >
                <X size={16} />
              </button>
            </div>
          )}

          <div className="product-grid">
            {filtered.map((product) => (
              <article className="product-card" key={product.id}>
                <div className="product-photo blush">
                  <img src={product.image} alt={product.name} onError={(event) => { const image = event.currentTarget; const fallbackImage = initialProducts.find((fallback) => fallback.id === product.id)?.image; if (!image.dataset.fallbackApplied && fallbackImage) { image.dataset.fallbackApplied = "true"; image.src = fallbackImage; } else { image.style.visibility = "hidden"; } }} />

                  <span className="tag">{product.tag}</span>

                  <button
                    className={`heart-button ${
                      liked.includes(product.id) ? 'is-liked' : ''
                    }`}
                    onClick={() => toggleLike(product.id)}
                    aria-label={
                      liked.includes(product.id)
                        ? 'Remove from wishlist'
                        : 'Add to wishlist'
                    }
                  >
                    <Heart
                      size={17}
                      fill={
                        liked.includes(product.id) ? 'currentColor' : 'none'
                      }
                    />
                  </button>
                </div>

                <div className="product-info">
                  <h3><Link href={`/product/${product.id}`}>{product.name}</Link></h3>
                  <Link className="product-detail-link" href={`/product/${product.id}`}>View details <ArrowRight size={13} /></Link>
                  <p className="combo-subtitle">{product.subtitle}</p>

                  <div className="price-row">
                    {product.price !== null ? (
                      <strong className="selling-price">
                        ₹{product.price.toLocaleString('en-IN')}
                      </strong>
                    ) : (
                      <span className="price-pending">Price to be confirmed</span>
                    )}
                  </div>

                  <button
                    className="combo-action"
                    onClick={() => addToCart(product)}
                    disabled={product.price === null}
                  >
                    {product.price === null ? 'Coming Soon' : 'Add to Bag'}
                    <ArrowRight size={15} />
                  </button>
                </div>
              </article>
            ))}
          </div>

          {filtered.length === 0 && (
            <p className="no-results">
              No matching combos found. Try another search.
            </p>
          )}
        </div>
      </section>

      <section className="love-section" id="about">
        <div className="section-inner love-inner">
          <div className="eyebrow">A LITTLE BEAUTY, A LOT OF YOU</div>
          <h2>
            Your everyday routine,
            <br />
            a little more <em>lovely.</em>
          </h2>
          <p className="love-intro">
            Explore eight handpicked makeup and body-care combos from
            Fashionyapa. Find the collection that fits your routine and your
            personal style.
          </p>

          <div className="love-points">
            <div>
              <span>01</span>
              <strong>Curated Combos</strong>
              <small>Beauty essentials thoughtfully brought together.</small>
            </div>
            <div>
              <span>02</span>
              <strong>Clear Delivery Details</strong>
              <small>Delivery in 7–10 days, with shipping details upfront.</small>
            </div>
            <div>
              <span>03</span>
              <strong>Here to Help</strong>
              <small>Contact Fashionyapa if you need help with an order.</small>
            </div>
          </div>

          <div className="social-links">
            <a href={instagramUrl} target="_blank" rel="noreferrer">
              <Instagram size={16} /> Instagram
            </a>
            <a href={youtubeUrl} target="_blank" rel="noreferrer">
              <Youtube size={17} /> YouTube
            </a>
          </div>
        </div>
      </section>

      <section className="faq-section" id="faq">
        <div className="section-inner faq-inner">
          <div>
            <div className="eyebrow">NEED TO KNOW?</div>
            <h2>
              A few little <em>answers.</em>
            </h2>
            <p>Shopping information from Fashionyapa.</p>
          </div>

          <div className="faq-list">
            <details>
              <summary>
                How long does delivery take? <span>+</span>
              </summary>
              <p>Expected delivery time is 7–10 days.</p>
            </details>
            <details>
              <summary>
                Is cash on delivery available? <span>+</span>
              </summary>
              <p>
                COD requires a ₹150 advance payment. The live payment and
                checkout flow still needs to be configured.
              </p>
            </details>
            <details>
              <summary>
                When is shipping free? <span>+</span>
              </summary>
              <p>Free shipping applies to orders of ₹1,999 and above.</p>
            </details>
            <details>
              <summary>
                Can I return or exchange an order? <span>+</span>
              </summary>
              <p>
                Fashionyapa has provided a no-return, no-exchange policy.
                Please review the complete policy before placing an order.
              </p>
            </details>
            <details>
              <summary>
                How can I contact Fashionyapa? <span>+</span>
              </summary>
              <p>
                WhatsApp +91 96307 77096 or email fashionyapa07@gmail.com. Our store address: Sahu Moholla, Basic School Road, Babai, Madhya Pradesh 461661.
              </p>
            </details>
          </div>
        </div>
      </section>

      <section className="reviews-feedback-section" id="reviews">
        <div className="section-inner">
          <div className="reviews-panel reviews-panel-heading">
            <div className="eyebrow">YOUR VOICE MATTERS</div>
            <h2>Reviews</h2>
            <p>Real words from Fashionyapa customers. Thank you for sharing your love with us.</p>
            <a className="review-link" href={reviewsInstagramUrl} target="_blank" rel="noreferrer">
              <Instagram size={17} /> Real Vibe Reviews <ExternalLink size={14} />
            </a>
          </div>


          <div className="real-reviews-marquee" aria-label="Fashionyapa customer reviews">
            <div className="real-reviews-track">
              <article className="real-review-card" key="customer-review-1">
                <img
                  className="real-review-image"
                  src="/images/reviews/customer-review-1.jpeg"
                  alt="Fashionyapa customer review 1"
                  loading="lazy"
                />
              </article>
              <article className="real-review-card" key="customer-review-2">
                <img
                  className="real-review-image"
                  src="/images/reviews/customer-review-2.jpeg"
                  alt="Fashionyapa customer review 2"
                  loading="lazy"
                />
              </article>
              <article className="real-review-card" key="customer-review-3">
                <img
                  className="real-review-image"
                  src="/images/reviews/customer-review-3.jpeg"
                  alt="Fashionyapa customer review 3"
                  loading="lazy"
                />
              </article>
              <article className="real-review-card" key="customer-review-4">
                <img
                  className="real-review-image"
                  src="/images/reviews/customer-review-4.jpeg"
                  alt="Fashionyapa customer review 4"
                  loading="lazy"
                />
              </article>
              <article className="real-review-card" key="customer-review-5">
                <img
                  className="real-review-image"
                  src="/images/reviews/customer-review-5.jpeg"
                  alt="Fashionyapa customer review 5"
                  loading="lazy"
                />
              </article>
              <article className="real-review-card" key="customer-review-6">
                <img
                  className="real-review-image"
                  src="/images/reviews/customer-review-6.jpeg"
                  alt="Fashionyapa customer review 6"
                  loading="lazy"
                />
              </article>
              <article className="real-review-card" key="customer-review-7">
                <img
                  className="real-review-image"
                  src="/images/reviews/customer-review-7.jpeg"
                  alt="Fashionyapa customer review 7"
                  loading="lazy"
                />
              </article>
              <div className="real-reviews-duplicate" aria-hidden="true">
              <article className="real-review-card" key="customer-review-1-duplicate" aria-hidden="true">
                <img
                  className="real-review-image"
                  src="/images/reviews/customer-review-1.jpeg"
                  alt="Fashionyapa customer review 1"
                  loading="lazy"
                />
              </article>
              <article className="real-review-card" key="customer-review-2-duplicate" aria-hidden="true">
                <img
                  className="real-review-image"
                  src="/images/reviews/customer-review-2.jpeg"
                  alt="Fashionyapa customer review 2"
                  loading="lazy"
                />
              </article>
              <article className="real-review-card" key="customer-review-3-duplicate" aria-hidden="true">
                <img
                  className="real-review-image"
                  src="/images/reviews/customer-review-3.jpeg"
                  alt="Fashionyapa customer review 3"
                  loading="lazy"
                />
              </article>
              <article className="real-review-card" key="customer-review-4-duplicate" aria-hidden="true">
                <img
                  className="real-review-image"
                  src="/images/reviews/customer-review-4.jpeg"
                  alt="Fashionyapa customer review 4"
                  loading="lazy"
                />
              </article>
              <article className="real-review-card" key="customer-review-5-duplicate" aria-hidden="true">
                <img
                  className="real-review-image"
                  src="/images/reviews/customer-review-5.jpeg"
                  alt="Fashionyapa customer review 5"
                  loading="lazy"
                />
              </article>
              <article className="real-review-card" key="customer-review-6-duplicate" aria-hidden="true">
                <img
                  className="real-review-image"
                  src="/images/reviews/customer-review-6.jpeg"
                  alt="Fashionyapa customer review 6"
                  loading="lazy"
                />
              </article>
              <article className="real-review-card" key="customer-review-7-duplicate" aria-hidden="true">
                <img
                  className="real-review-image"
                  src="/images/reviews/customer-review-7.jpeg"
                  alt="Fashionyapa customer review 7"
                  loading="lazy"
                />
              </article>
              </div>
            </div>
          </div>

          <form className="feedback-card real-review-feedback" onSubmit={(event) => {
            event.preventDefault();
            const subject = encodeURIComponent('Fashionyapa website feedback');
            const body = encodeURIComponent(`Name: ${feedbackName || 'Not provided'}\\n\\nFeedback: ${feedbackMessage}`);
            window.location.href = `mailto:fashionyapa07@gmail.com?subject=${subject}&body=${body}`;
          }}>
            <div className="eyebrow">A LITTLE NOTE TO US</div>
            <h3>Share your feedback</h3>
            <label>
              Your name <span>(optional)</span>
              <input value={feedbackName} onChange={(event) => setFeedbackName(event.target.value)} placeholder="Enter your name" />
            </label>
            <label>
              Your feedback
              <textarea value={feedbackMessage} onChange={(event) => setFeedbackMessage(event.target.value)} placeholder="Tell us what you think..." rows={4} required />
            </label>
            <button className="feedback-submit" type="submit"><Send size={15} /> Send feedback</button>
            <small>This opens your email app so you can send the feedback to Fashionyapa.</small>
          </form>
        </div>
      </section>

      <section className="about-section">
        <div className="about-mark">FY</div>
        <div>
          <div className="eyebrow">MEET FASHIONYAPA</div>
          <h2>
            Beauty finds.
            <br />
            <em>Your kind of lovely.</em>
          </h2>
          <p>
            Eight beauty and body-care combos, curated for your everyday
            favourites.
          </p>
          <div className="social-links">
            <a href={instagramUrl} target="_blank" rel="noreferrer">
              <Instagram size={16} /> Instagram
            </a>
            <a
              href={reviewsInstagramUrl}
              target="_blank"
              rel="noreferrer"
            >
              <Instagram size={16} /> Reviews
            </a>
            <a href={youtubeUrl} target="_blank" rel="noreferrer">
              <Youtube size={17} /> YouTube
            </a>
          </div>
        </div>
        <a className="primary-cta" href="#products">
          Explore Combos <ArrowRight size={17} />
        </a>
      </section>

      <footer className="footer">
        <div className="footer-main">
          <div className="footer-about">
            <div className="footer-brand">
              <img src="/images/fashionyapa-logo.webp" alt="" />
              <span>FASHIONYAPA</span>
            </div>
            <p>Little beauty finds, picked for your vibe. ♡</p>
            <div className="footer-socials">
              <a href={instagramUrl} target="_blank" rel="noreferrer" aria-label="Fashionyapa Instagram"><Instagram size={18} /></a>
              <a href={youtubeUrl} target="_blank" rel="noreferrer" aria-label="Fashionyapa YouTube"><Youtube size={18} /></a>
              <a href="https://wa.me/919630777096" target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp"><MessageCircle size={18} /></a>
            </div>
          </div>
          <div className="footer-column">
            <h3>Shop &amp; Explore</h3>
            <a href="#products">Viral Combos</a>
            <a href="#about">Our Story</a>
            <a href="#reviews">Reviews &amp; Feedback</a>
            <a href="#faq">FAQs</a>
          </div>
          <div className="footer-column">
            <h3>Customer Care</h3>
            <a href="#faq">Shipping Information</a>
            <a href="#faq">No Return / No Exchange Policy</a>
            <a href="/privacy-policy">Privacy Policy</a>
            <a href="/terms">Terms &amp; Conditions</a>
          </div>
          <div className="footer-column footer-contact">
            <h3>Contact Us</h3>
            <a href="mailto:fashionyapa07@gmail.com"><Mail size={16} /> fashionyapa07@gmail.com</a>
            <a href="tel:+919630777096"><Phone size={16} /> +91 96307 77096</a>
            <a href="https://wa.me/919630777096?text=Hi%20Fashionyapa%2C%20I%20need%20help." target="_blank" rel="noreferrer"><MessageCircle size={16} /> WhatsApp Support</a>
            <a href="https://www.google.com/maps/dir/?api=1&destination=Fashionyapa%2C%20Sahu%20Moholla%2C%20Basic%20School%20Road%2C%20Babai%2C%20Madhya%20Pradesh%20461661" target="_blank" rel="noreferrer"><MapPin size={16} /> Sahu Moholla, Basic School Road, Babai, MP 461661 <ExternalLink size={13} /></a>
          </div>
        </div>
        <div className="footer-policy-note"><ShieldCheck size={15} /> Please review product details and our no-return/no-exchange policy before placing an order.</div>
        <small className="footer-copyright">© 2026 Fashionyapa. All rights reserved.</small>
      </footer>

      <a
        className="whatsapp-float"
        href="https://wa.me/919630777096?text=Hi%20Fashionyapa%2C%20I%20need%20help%20with%20an%20order."
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with Fashionyapa on WhatsApp"
        title="Chat on WhatsApp"
      >
        <svg className="whatsapp-brand-icon" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
          <path fill="currentColor" d="M16.02 3.2A12.68 12.68 0 0 0 5.1 22.33L3.3 28.8l6.63-1.74A12.67 12.67 0 1 0 16.02 3.2Zm0 23.1c-1.98 0-3.92-.53-5.62-1.54l-.4-.24-3.94 1.04 1.05-3.84-.26-.4a10.43 10.43 0 1 1 9.17 4.98Zm5.72-7.82c-.31-.16-1.85-.91-2.14-1.02-.29-.11-.5-.16-.71.16-.21.31-.81 1.02-.99 1.23-.18.21-.36.23-.67.08-.31-.16-1.31-.48-2.5-1.52-.92-.82-1.54-1.83-1.72-2.14-.18-.31-.02-.48.14-.64.14-.14.31-.36.47-.54.16-.18.21-.31.31-.52.1-.21.05-.39-.03-.55-.08-.16-.71-1.71-.97-2.34-.26-.61-.52-.53-.71-.54h-.6c-.21 0-.55.08-.84.39-.29.31-1.1 1.07-1.1 2.61s1.13 3.03 1.29 3.24c.16.21 2.22 3.39 5.38 4.75.75.32 1.33.51 1.78.65.75.24 1.44.21 1.98.13.6-.09 1.85-.76 2.11-1.49.26-.73.26-1.36.18-1.49-.08-.13-.29-.21-.6-.37Z" />
        </svg>
      </a>

      <div className="made-by">
        <span>Thoughtfully crafted with <b>♡</b> by</span>
        <a href="https://upfigure.in/" target="_blank" rel="noreferrer">
          upfigure
        </a>
        <span className="made-by-tag">Digital Growth Partner</span>
      </div>

      {cartOpen && (
        <div
          className="drawer-backdrop"
          onClick={() => setCartOpen(false)}
        >
          <aside
            className="cart-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Shopping bag"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="drawer-heading">
              <div>
                <span className="eyebrow">YOUR BEAUTY PICKS</span>
                <h2>
                  Your Shopping Bag <span>({cart.length})</span>
                </h2>
              </div>
              <button
                className="icon-button"
                onClick={() => setCartOpen(false)}
                aria-label="Close bag"
              >
                <X />
              </button>
            </div>

            {cartLines.length ? (
              <>
                <div className="cart-items">
                  {cartLines.map((product) => (
                    <div className="cart-line" key={product.id}>
                      <img src={product.image} alt={product.name} onError={(event) => { const image = event.currentTarget; const fallbackImage = initialProducts.find((fallback) => fallback.id === product.id)?.image; if (!image.dataset.fallbackApplied && fallbackImage) { image.dataset.fallbackApplied = "true"; image.src = fallbackImage; } else { image.style.visibility = "hidden"; } }} />
                      <div className="cart-line-info">
                        <strong>{product.name}</strong>
                        <span>
                          {product.price === null
                            ? 'Price pending'
                            : `₹${product.price}`}
                        </span>
                        <div className="quantity-control">
                          <button
                            onClick={() =>
                              setCart((current) => {
                                const index = current.indexOf(product.id);
                                return index < 0
                                  ? current
                                  : current.filter((_, i) => i !== index);
                              })
                            }
                            aria-label={`Decrease ${product.name} quantity`}
                          >
                            −
                          </button>
                          <span>{product.quantity}</span>
                          <button
                            onClick={() =>
                              addToCart(product)
                            }
                            aria-label={`Increase ${product.name} quantity`}
                          >
                            +
                          </button>
                          <button
                            className="remove-line"
                            onClick={() =>
                              setCart((current) =>
                                current.filter((id) => id !== product.id),
                              )
                            }
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="shipping-progress">
                  {subtotal >= 1999
                    ? 'You unlocked free shipping ♡'
                    : `Add ₹${1999 - subtotal} more to unlock free shipping`}
                  <div>
                    <span
                      style={{
                        width: `${Math.min(
                          100,
                          (subtotal / 1999) * 100,
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="cart-totals">
                  <p>
                    <span>Subtotal</span>
                    <strong>₹{subtotal}</strong>
                  </p>
                  <p>
                    <span>Shipping</span>
                    <strong>{shipping === 0 ? 'FREE' : `₹${shipping}`}</strong>
                  </p>
                  <p className="grand-total">
                    <span>Estimated total</span>
                    <strong>₹{subtotal + shipping}</strong>
                  </p>
                  <Link className="checkout-button" href="/checkout">Continue to Checkout <ArrowRight size={17} /></Link>
                  <small>
                    Secure payment and order confirmation will be enabled before launch.
                  </small>
                </div>
              </>
            ) : (
              <div className="empty-bag">
                <div>
                  <ShoppingBag size={35} />
                </div>
                <h3>Your bag is waiting for something lovely</h3>
                <p>Explore all eight combos and pick your favourites.</p>
                <button
                  className="primary-cta"
                  onClick={() => {
                    setCartOpen(false);
                    document
                      .getElementById('products')
                      ?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  Explore Combos <ArrowRight size={16} />
                </button>
              </div>
            )}
          </aside>
        </div>
      )}

      {toast && (
        <button className="toast" onClick={() => setToast('')}>
          <Check size={17} />
          {toast}
          <X size={14} />
        </button>
      )}
    </main>
  );
}
