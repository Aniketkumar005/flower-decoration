
import { useState, useMemo, useEffect, useRef } from "react";
import { Routes, Route, Link, useNavigate, useParams, useLocation } from "react-router-dom";

/* =================================================================
   SCROLL TO TOP ON ROUTE CHANGE
   ================================================================= */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

/* =================================================================
   MOBILE MENU (hamburger + dropdown) — used by pages with custom headers
   ================================================================= */
function MobileMenu({ visibleClass, barClass, panelClass }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`${visibleClass} flex-col gap-[5px] bg-transparent border-0 cursor-pointer p-1`}
        aria-label="Menu"
        aria-expanded={open}
      >
        <span className={`block w-6 h-[1.5px] ${barClass}`} />
        <span className={`block w-6 h-[1.5px] ${barClass}`} />
        <span className={`block w-6 h-[1.5px] ${barClass}`} />
      </button>

      {open && (
        <div
          className={`absolute top-full left-0 right-0 z-50 flex flex-col border-b border-[#f0e8e1] shadow-[0_8px_20px_rgba(0,0,0,.08)] ${panelClass}`}
        >
          {navLinks.map((l) => (
            <Link
              key={l.label}
              to={l.href}
              onClick={() => setOpen(false)}
              className={`py-4 px-5 border-b border-[#f0e8e1] text-sm ${pathname === l.href ? "font-semibold" : ""
                }`}
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

/* =================================================================
   AUTO-IMPORT ALL IMAGES from src/images/**
   ================================================================= */
const allImages = import.meta.glob(
  "./images/**/*.{jpg,jpeg,png,webp,gif,svg,JPG,JPEG,PNG,WebP,WEBP}",
  { eager: true, query: "?url", import: "default" },
);

/* Parse "./images/Wedding/wedding_001_25000.jpg"
   → folder, file, price */
function parseImagePath(path) {
  const parts = path.split("/");
  const folder = parts[parts.length - 2];
  const file = parts[parts.length - 1];
  const base = file.replace(/\.[^.]+$/, "");
  const priceMatch = base.match(/_(\d+)$/);
  const price = priceMatch ? parseInt(priceMatch[1], 10) : null;
  return { folder, file, base, price };
}

const imagesByFolder = Object.entries(allImages).reduce((acc, [path, url]) => {
  const { folder, file, price } = parseImagePath(path);
  if (!acc[folder]) acc[folder] = [];
  const seqMatch = file.match(/_(\d{1,4})(?:_\d+)?\.[^.]+$/);
  const seq = seqMatch ? parseInt(seqMatch[1], 10) : 9999;
  acc[folder].push({ url, path, file, price, seq, folder });
  return acc;
}, {});

Object.values(imagesByFolder).forEach((arr) =>
  arr.sort((a, b) => a.seq - b.seq),
);

/* Hero image used on the home page (wedding.png) */
const heroImg = (() => {
  const key = Object.keys(allImages).find((k) =>
    k.toLowerCase().endsWith("wedding.png"),
  );
  return key ? allImages[key] : "";
})();

/* =================================================================
   Hero image used on ALL Service pages
   ================================================================= */
const decorationHero = (() => {
  const key = Object.keys(allImages).find((k) => {
    const lower = k.toLowerCase();
    return /(^|\/)decoration\.(jpg|jpeg|png|webp|gif|svg)$/.test(lower);
  });
  return key ? allImages[key] : "";
})();

/* All images in a folder — used on service page */
function allItemsInFolder(folderKey) {
  return (imagesByFolder[folderKey] || []).map((x) => ({
    url: x.url,
    price: x.price,
    file: x.file,
  }));
}

/* Priced-only images per folder */
function pricedItemsInFolder(folderKey) {
  return (imagesByFolder[folderKey] || [])
    .filter((x) => x.price !== null)
    .map((x) => ({ url: x.url, price: x.price, file: x.file }));
}

function coverImage(folderKey) {
  const arr = imagesByFolder[folderKey] || [];
  const priced = arr.find((x) => x.price !== null);
  return (priced || arr[0])?.url || null;
}

function formatPrice(n) {
  if (n === null || n === undefined) return "";
  return "₹" + n.toLocaleString("en-IN");
}

/* Build a full, public, URL-safe image link (for WhatsApp link preview) */
function toAbsoluteUrl(path) {
  if (!path) return "";
  try {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return new URL(path, origin).href;
  } catch {
    return path;
  }
}

/* Link to a share page (api/share) that carries og:image so WhatsApp shows the picture */
function toShareUrl(path, title, price) {
  const abs = toAbsoluteUrl(path);
  if (!abs) return "";
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const params = new URLSearchParams({
    img: new URL(abs).pathname,
    title: title || "Decor Enquiry",
    v: "2",
  });
  if (price != null) params.set("price", String(price));
  return `${origin}/api/share?${params.toString()}`;
}

/* =================================================================
   WHATSAPP CONFIG
   ================================================================= */
const WHATSAPP_NUMBER = "918439090932";

function buildWhatsAppUrl(item) {
  const priceLine =
    item && item.price != null ? formatPrice(item.price) : "Price on request";
  const titleLine = (item && item.title) || "Decor Enquiry";
  const imageLine =
    item && item.img ? `\n\n🖼️ Design image:\n${toShareUrl(item.img, item.title, item.price)}` : "";

  const message =
    `Hi Shri Shakti Decor! 👋\n\n` +
    `I'm interested in this design:\n` +
    `• ${titleLine}\n` +
    `• Price: ${priceLine}${imageLine}\n\n` +
    `Could you please share more details?`;

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

/* Build the prefilled WhatsApp URL for a SERVICE page pop-card item.
   The item here is { url, price } from the service gallery — it has
   no title/img keys, so we synthesize them from the service + item. */
function buildServiceWhatsAppUrl(service, item) {
  const priceLine =
    item && item.price != null ? formatPrice(item.price) : "Price on request";
  const titleLine = (service && service.title) || "Decor Enquiry";
  const imageLine =
    item && item.url ? `\n\n🖼️ Design image:\n${toShareUrl(item.url, service && service.title, item.price)}` : "";

  const message =
    `Hi Shri Shakti Decor! 👋\n\n` +
    `I'm interested in this design:\n` +
    `• ${titleLine}\n` +
    `• Price: ${priceLine}${imageLine}\n\n` +
    `Could you please share more details?`;

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

/* =================================================================
   FORMSUBMIT CONFIG
   ================================================================= */
const FORMSUBMIT_ENDPOINT = "https://formsubmit.co/ajax/sumitpasi944@gmail.com";
const FORMSUBMIT_SUBJECT = "New Event Enquiry — Shri Shakti Decor";

/* ============ DATA ============ */
const navLinks = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/services" },
  { label: "Gallery", href: "/gallery" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

const serviceCards = [
  {
    slug: "wedding",
    folder: "Wedding",
    icon: "⚭",
    title: "Wedding",
    desc: "Dream setups for your big day",
    tagline: "Timeless wedding decor, crafted around your love story.",
    longDesc:
      "From the first look to the final dance, we design every detail of your wedding day — mandaps, stages, aisles, entrance arches, table settings and more. Every flower, drape and light is chosen to match your palette and tell your story.",
    highlights: [
      "Custom mandap & stage design",
      "Entrance & aisle florals",
      "Reception & table styling",
      "Photo-worthy backdrop installations",
    ],
  },
  {
    slug: "engagement",
    folder: "Engagement",
    icon: "♡",
    title: "Engagement",
    desc: "Elegant decor for your new beginning",
    tagline: "A romantic backdrop for the promise of forever.",
    longDesc:
      "Ring ceremonies deserve a setting as meaningful as the moment itself. We create soft, intimate and elegant engagement stages — florals, drapery and lighting that make your first promise unforgettable.",
    highlights: [
      "Romantic stage & backdrop",
      "Floral arches & pillars",
      "Soft lighting design",
      "Ring ceremony styling",
    ],
  },
  {
    slug: "birthday",
    folder: "Birthday",
    icon: "🎁︎",
    title: "Birthday",
    desc: "Make birthdays extra special",
    tagline: "Vibrant, playful decor for every age.",
    longDesc:
      "Whether it's a first birthday, a sweet sixteen or a milestone celebration, we design colorful, joyful setups with balloon arches, themed backdrops, dessert tables and playful florals tailored to the birthday star.",
    highlights: [
      "Balloon arches & garlands",
      "Themed backdrop design",
      "Dessert & cake table styling",
      "Custom colour palettes",
    ],
  },
  {
    slug: "baby-shower",
    folder: "Baby_shower",
    icon: "☆",
    title: "Baby Shower",
    desc: "A warm welcome to little ones",
    tagline: "Soft, whimsical florals for new beginnings.",
    longDesc:
      "Welcome the newest member of your family with a setup as gentle and beautiful as the occasion. We create pastel floral arrangements, cloud installations, and warm, inviting backdrops perfect for photos and memories.",
    highlights: [
      "Pastel floral arrangements",
      "Cloud & balloon installations",
      "Photo-ready welcome boards",
      "Dessert table & seating decor",
    ],
  },
  {
    slug: "haldi-mehndi",
    folder: "Haldi",
    icon: "❀",
    title: "Haldi & Mehndi",
    desc: "Vibrant setups for colorful celebrations",
    tagline: "Marigold, jasmine and traditional warmth.",
    longDesc:
      "Haldi and Mehndi celebrations are full of colour, laughter and tradition. We bring that energy to life with marigold garlands, jasmine strings, colourful drapes, low seating and traditional props that honour your customs.",
    highlights: [
      "Marigold & jasmine decor",
      "Traditional backdrops",
      "Low seating & floor cushions",
      "Themed props & installations",
    ],
  },
  {
    slug: "anniversary",
    folder: "Anniversary",
    icon: "♡",
    title: "Anniversary",
    desc: "Celebrate love in style",
    tagline: "Timeless arrangements that mark the years.",
    longDesc:
      "Celebrate the milestones of your journey together with refined, romantic decor. From intimate candlelit dinners to grand anniversary parties, we design setups that honour every year shared.",
    highlights: [
      "Romantic table styling",
      "Candle & fairy-light design",
      "Floral centrepieces",
      "Intimate dinner setups",
    ],
  },
  {
    slug: "corporate-events",
    folder: "Corporate_event",
    icon: "▣",
    title: "Corporate Events",
    desc: "Professional decor for your brand",
    tagline: "Refined florals for brand moments.",
    longDesc:
      "From product launches to annual galas, we design sophisticated, on-brand decor that reflects your company's identity. Clean lines, elegant florals and professional installations that impress without overpowering.",
    highlights: [
      "Brand-aligned colour palettes",
      "Stage & podium design",
      "Entrance & registration decor",
      "Table & networking setups",
    ],
  },
  {
    slug: "special-occasions",
    folder: "Special_occasion",
    icon: "☆",
    title: "Special Occasions",
    desc: "Custom decor for every celebration",
    tagline: "Custom decor for every celebration.",
    longDesc:
      "Naming ceremonies, housewarmings, retirement parties, festivals — if it matters to you, it matters to us. Tell us your vision and we'll shape every flower, drape and light around it.",
    highlights: [
      "Fully custom design",
      "Flexible venue styling",
      "Themed florals & props",
      "End-to-end planning support",
    ],
  },
];

const whyItems = [
  {
    icon: "✧",
    title: "Creative Designs",
    desc: "Unique and customized decor concepts",
  },
  {
    icon: "◇",
    title: "Premium Quality",
    desc: "Fresh flowers & high-quality materials",
  },
  {
    icon: "◷",
    title: "On-Time Delivery",
    desc: "We value your time and commitments",
  },
  {
    icon: "☺",
    title: "Experienced Team",
    desc: "Skilled professionals with years of experience",
  },
];

const testimonials = [
  {
    quote:
      "Absolutely beautiful decor! The team understood our vision perfectly and made our wedding day magical.",
    name: "Priya Sharma",
    role: "Wedding Client",
    initials: "PS",
    bg: "#c9a58f",
  },
  {
    quote:
      "Amazing work! The floral arrangements were fresh, elegant and exactly what we wanted. Highly recommended!",
    name: "Rahul Mehta",
    role: "Engagement Client",
    initials: "RM",
    bg: "#6b7a86",
  },
  {
    quote:
      "We hired them for our corporate event and they exceeded our expectations. Professional, creative and on time!",
    name: "Neha Verma",
    role: "Corporate Client",
    initials: "NV",
    bg: "#c9a58f",
  },
  {
    quote:
      "The birthday setup was beyond magical! My daughter's face lit up the moment she saw the balloon arch and themed backdrop. Truly unforgettable.",
    name: "Anjali Kapoor",
    role: "Birthday Client",
    initials: "AK",
    bg: "#8a9a7e",
  },
  {
    quote:
      "Our baby shower was a dream! The pastel florals and cloud installations were picture-perfect. Every guest kept asking who did the decor.",
    name: "Sneha Iyer",
    role: "Baby Shower Client",
    initials: "SI",
    bg: "#c7a468",
  },
  {
    quote:
      "The Haldi and Mehndi setups were vibrant and full of tradition. They honoured our customs beautifully while keeping everything elegant.",
    name: "Kavita Reddy",
    role: "Haldi & Mehndi Client",
    initials: "KR",
    bg: "#c9a58f",
  },
  {
    quote:
      "For our 25th anniversary, they created the most romantic candlelit setup. It felt like our wedding day all over again. Pure magic!",
    name: "Meera Joshi",
    role: "Anniversary Client",
    initials: "MJ",
    bg: "#6b7a86",
  },
  {
    quote:
      "Professional, punctual and incredibly creative. Our product launch looked stunning and on-brand. Will definitely work with them again!",
    name: "Arjun Nair",
    role: "Corporate Client",
    initials: "AN",
    bg: "#8a9a7e",
  },
  {
    quote:
      "They designed our housewarming ceremony beautifully — every flower and drape was thoughtfully placed. Highly recommend their services!",
    name: "Divya Menon",
    role: "Special Occasion Client",
    initials: "DM",
    bg: "#c7a468",
  },
];

const footerQuickLinks = [
  "Home",
  "Services",
  "Gallery",
  "About",
  "Contact",
];
const footerServices = [
  "Wedding",
  "Engagement",
  "Birthday",
  "Baby Shower",
  "Corporate Events",
  "Special Occasions",
];

const featuredImages = (() => {
  const arr = imagesByFolder["Wedding"] || [];
  return arr
    .slice(0, 5)
    .map((x, i) => ({ src: x.url, alt: `Featured decor ${i + 1}` }));
})();

const GALLERY_ITEMS = (() => {
  const heights = [
    252, 181, 181, 181, 180, 180, 218, 142, 176, 176, 135, 140, 188, 182, 182,
    182,
  ];
  const items = [];
  let i = 0;
  const folderOrder = [
    "Wedding",
    "Engagement",
    "Birthday",
    "Baby_shower",
    "Haldi",
    "Anniversary",
    "Corporate_event",
    "Special_occasion",
    "Festival",
  ];
  const catMap = {
    Wedding: "Wedding Decoration",
    Engagement: "Engagement",
    Birthday: "Birthday Party",
    Baby_shower: "Baby Shower",
    Haldi: "Haldi & Mehndi",
    Anniversary: "Anniversary",
    Corporate_event: "Corporate Events",
    Special_occasion: "Special Occasions",
    Festival: "Festival",
  };
  for (const folder of folderOrder) {
    const arr = imagesByFolder[folder] || [];
    for (const img of arr) {
      items.push({
        cat: catMap[folder] || "Other",
        img: img.url,
        price: img.price,
        likes: String(80 + ((i * 37) % 220)),
        views: `${1 + ((i * 7) % 9) / 10}k`,
        h: heights[i % heights.length],
        /* Title now shows ONLY the category name (no "— haldi 006" suffix) */
        title: catMap[folder] || "Decor",
      });
      i++;
    }
  }
  return items;
})();

const GALLERY_CATEGORIES = [
  "All",
  "Wedding Decoration",
  "Birthday Party",
  "Baby Shower",
  "Engagement",
  "Haldi & Mehndi",
  "Festival",
  "Anniversary",
  "Corporate Events",
  "Special Occasions",
];
const GALLERY_DESC =
  "A stunning decor setup crafted with fresh flowers, elegant drapes and premium installations. Perfect for making your special day memorable.";
const GALLERY_TAGS = ["decor", "flowers", "premium setup", "custom design"];
const GALLERY_PAGE = 12;
const GALLERY_GAP = 16;

/* ============ ICONS ============ */
const Icon = {
  Heart: (p) => (
    <svg viewBox="0 0 24 24" {...p}>
      <path
        d="M12 21s-7.5-4.6-9.5-9.3C1.1 8.4 3 5 6.3 5c2 0 3.5 1.1 5.7 3.3C14.2 6.1 15.7 5 17.7 5 21 5 22.9 8.4 21.5 11.7 19.5 16.4 12 21 12 21z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  ),
  HeartFill: (p) => (
    <svg viewBox="0 0 24 24" {...p}>
      <path
        d="M12 21s-7.5-4.6-9.5-9.3C1.1 8.4 3 5 6.3 5c2 0 3.5 1.1 5.7 3.3C14.2 6.1 15.7 5 17.7 5 21 5 22.9 8.4 21.5 11.7 19.5 16.4 12 21 12 21z"
        fill="currentColor"
      />
    </svg>
  ),
  Eye: (p) => (
    <svg viewBox="0 0 24 24" {...p}>
      <path
        d="M1.5 12S5.5 5 12 5s10.5 7 10.5 7-4 7-10.5 7S1.5 12 1.5 12z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle
        cx="12"
        cy="12"
        r="3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  ),
  ChevRight: (p) => (
    <svg viewBox="0 0 24 24" {...p}>
      <path
        d="M9 5l7 7-7 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  ChevLeft: (p) => (
    <svg viewBox="0 0 24 24" {...p}>
      <path
        d="M15 5l-7 7 7 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  X: (p) => (
    <svg viewBox="0 0 24 24" {...p}>
      <path
        d="M6 6l12 12M18 6L6 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  Search: (p) => (
    <svg viewBox="0 0 24 24" {...p}>
      <circle
        cx="11"
        cy="11"
        r="7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M16.5 16.5L21 21"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  ),
  Down: (p) => (
    <svg viewBox="0 0 24 24" {...p}>
      <path
        d="M12 4v15M5 12.5l7 7 7-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  WhatsApp: (p) => (
    <svg viewBox="0 0 24 24" {...p}>
      <path
        d="M12 3a9 9 0 00-7.8 13.5L3 21l4.7-1.2A9 9 0 1012 3z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M8.8 8.3c.2-.4.5-.4.8-.3l.7 1.6c0 .3-.5.8-.6 1 .8 1.5 1.8 2.4 3.2 3.1.2-.2.7-.8 1-.8l1.6.8c.1.3 0 .8-.4 1.2-.9.8-2.3.5-3.7-.2-1.7-.9-3.1-2.4-3.7-4-.3-.9 0-1.8 1.1-2.4z"
        fill="currentColor"
      />
    </svg>
  ),
  Logo: (p) => (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="#2f5d50"
      strokeWidth="1.2"
      strokeLinecap="round"
      {...p}
    >
      <path d="M24 44V22M24 30c-6 0-10-4-10-9 5 0 9 3 10 9zM24 30c6 0 10-4 10-9-5 0-9 3-10 9zM24 22c-4-3-5-8-1-12 4 3 5 8 1 12zM24 38c-5 0-8-3-9-6M24 38c5 0 8-3 9-6M12 14c3 0 5 2 6 5M36 14c-3 0-5 2-6 5" />
    </svg>
  ),
  Play: (p) => (
    <svg viewBox="0 0 24 24" {...p}>
      <path d="M8 5v14l11-7z" fill="currentColor" />
    </svg>
  ),
  ArrowUp: (p) => (
    <svg viewBox="0 0 24 24" {...p}>
      <path
        d="M12 20V4M5 11l7-7 7 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Leaf: (p) => (
    <svg viewBox="0 0 24 24" {...p}>
      <path
        d="M5 20c0-8 6-15 14-15-1 8-6 14-14 15z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Star: (p) => (
    <svg viewBox="0 0 24 24" {...p}>
      <path
        d="M12 3l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.8 6.1 21l1.2-6.5L2.5 9.9 9.1 9 12 3z"
        fill="currentColor"
      />
    </svg>
  ),
  Shield: (p) => (
    <svg viewBox="0 0 24 24" {...p}>
      <path
        d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  ),
  Smile: (p) => (
    <svg viewBox="0 0 24 24" {...p}>
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  ),
  Phone: (p) => (
    <svg viewBox="0 0 24 24" {...p}>
      <path
        d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.37 1.9.72 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0122 16.92z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Mail: (p) => (
    <svg viewBox="0 0 24 24" {...p}>
      <rect
        x="2"
        y="4"
        width="20"
        height="16"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M2 6l10 7 10-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  ),
  Pin: (p) => (
    <svg viewBox="0 0 24 24" {...p}>
      <path
        d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle
        cx="12"
        cy="10"
        r="3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  ),
  Facebook: (p) => (
    <svg viewBox="0 0 24 24" {...p}>
      <path
        d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"
        fill="currentColor"
      />
    </svg>
  ),
  Instagram: (p) => (
    <svg viewBox="0 0 24 24" {...p}>
      <rect
        x="2"
        y="2"
        width="20"
        height="20"
        rx="5"
        ry="5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle
        cx="12"
        cy="12"
        r="4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" />
    </svg>
  ),
  YouTube: (p) => (
    <svg viewBox="0 0 24 24" {...p}>
      <rect
        x="2"
        y="5"
        width="20"
        height="14"
        rx="4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M10 9l5 3-5 3z"
        fill="currentColor"
      />
    </svg>
  ),
  Check: (p) => (
    <svg viewBox="0 0 24 24" {...p}>
      <path
        d="M4 12l5 5L20 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

/* ============ NAV ============ */
function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  return (
    <nav className="bg-b-nav sticky top-0 z-50 border-b border-[#f0e8e1]">
      <div className="relative max-w-[1200px] mx-auto px-10 max-[860px]:px-5 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-[10px]">
          <img
            src="/images/decoration_logos.png"
            alt="Shri Shakti Decor Logo"
            className="w-[110px] h-[110px] object-contain"
          />
          <span>
            <b className="font-newsreader font-normal text-[22px] leading-none block">
              Shri Shakti <i className="text-b-rose not-italic">Decor</i>
            </b>
            <small className="text-[8px] text-b-muted tracking-[.06em]">
              Flowers · Decor · Special Moments
            </small>
          </span>
        </Link>
        <div className="hidden max-[860px]:hidden flex gap-[34px] text-[12px]">
          {navLinks.map((l) => (
            <Link
              key={l.label}
              to={l.href}
              className={
                pathname === l.href ? "border-b border-b-green pb-1" : ""
              }
            >
              {l.label}
            </Link>
          ))}
        </div>
        <Link to="/contact" className="btn btn-dark max-[860px]:hidden">
          Get a Quote &nbsp;→
        </Link>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="hidden max-[860px]:flex flex-col gap-[5px] bg-transparent border-0 cursor-pointer"
          aria-label="Menu"
          aria-expanded={menuOpen}
        >
          <span className="block w-6 h-[1.5px] bg-b-green" />
          <span className="block w-6 h-[1.5px] bg-b-green" />
          <span className="block w-6 h-[1.5px] bg-b-green" />
        </button>

        {menuOpen && (
          <div
            className="hidden max-[860px]:flex flex-col absolute top-16 left-0 right-0 bg-b-nav border-b border-[#f0e8e1] shadow-[0_8px_20px_rgba(0,0,0,.08)] z-50"
          >
            {navLinks.map((l) => (
              <Link
                key={l.label}
                to={l.href}
                onClick={() => setMenuOpen(false)}
                className="py-4 px-5 border-b border-[#f0e8e1] text-sm bg-b-nav"
              >
                {l.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}

/* ============ FOOTER ============ */
function Footer() {
  return (
    <footer className="bg-b-green2 text-white mt-[6px] pt-[26px] pb-0">
      <div className="max-w-[1200px] mx-auto px-10 max-[860px]:px-5">
        <div className="grid grid-cols-[1.5fr_1fr_1fr_1.3fr] max-[860px]:grid-cols-1 gap-[30px] pb-[26px]">
          <div>
            <div className="flex items-center gap-[10px]">
              <img
                src="/images/decoration_logo.png"
                alt="Shri Shakti Decor Logo"
                className="w-[100px] h-[100px] object-contain"
              />
              <span>
                <b className="font-newsreader font-normal text-[20px] block leading-none text-white">
                  Shri Shakti Decor
                </b>
                <small
                  className="text-[8px] tracking-[.06em]"
                  style={{ color: "#cfc8bd" }}
                >
                  Flowers · Decor · Special Moments
                </small>
              </span>
            </div>
            <p
              className="text-[9px] mt-[14px] max-w-[150px]"
              style={{ color: "#e6ddd2" }}
            >
              Creating beautiful moments with fresh flowers and creative decor.
            </p>
            <div className="flex gap-2 mt-3">
              <a
                href="https://www.instagram.com/reel/C0fmi7NvOap/?stkn=N3ByMm96Nzdxb2p1"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-6 h-6 rounded-full grid place-items-center text-white hover:bg-white/20 transition-colors"
                style={{ border: "1px solid #fff6" }}
              >
                <Icon.Instagram className="w-3.5 h-3.5" />
              </a>
              <a
                href="https://www.youtube.com/@SumitPasi.youtube"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
                className="w-6 h-6 rounded-full grid place-items-center text-white hover:bg-white/20 transition-colors"
                style={{ border: "1px solid #fff6" }}
              >
                <Icon.YouTube className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
          <div>
            <h6 className="text-[10px] font-medium mb-3">Quick Links</h6>
            <ul>
              {footerQuickLinks.map((l) => {
                const slug = l.toLowerCase();
                return (
                  <li
                    key={l}
                    className="text-[9px] mb-[7px]"
                    style={{ color: "#e6ddd2" }}
                  >
                    <Link to={slug === "home" ? "/" : `/${slug}`}>{l}</Link>
                  </li>
                );
              })}
            </ul>
          </div>
          <div>
            <h6 className="text-[10px] font-medium mb-3">Our Services</h6>
            <ul>
              {footerServices.map((l) => {
                const slug = l.toLowerCase().replace(/\s+/g, "-");
                return (
                  <li
                    key={l}
                    className="text-[9px] mb-[7px]"
                    style={{ color: "#e6ddd2" }}
                  >
                    <Link to={`/services/${slug}`}>{l}</Link>
                  </li>
                );
              })}
            </ul>
          </div>
          <div>
            <h6 className="text-[10px] font-medium mb-3">Contact Us</h6>
            <ul>
              <li className="text-[9px] mb-[7px]" style={{ color: "#e6ddd2" }}>
                ☎ +91 8439090932
              </li>
              <li className="text-[9px] mb-[7px]" style={{ color: "#e6ddd2" }}>
                ✉ sumitpasi944@gmail.com              </li>
              <li className="text-[9px] mb-[7px]" style={{ color: "#e6ddd2" }}>
                ⌖ Shiv Chowk Kanker Khera,
                <br />
                &nbsp;&nbsp;&nbsp;Meerut Cantt
              </li>
            </ul>
          </div>
        </div>
        <div
          className="flex justify-between flex-wrap gap-2 py-[14px] text-[8px]"
          style={{ borderTop: "1px solid #ffffff1f", color: "#cfc8bd" }}
        >
          <span>© 2025 Shri Shakti Decor. All rights reserved.</span>
          <span>Privacy Policy &nbsp;|&nbsp; Terms &amp; Conditions</span>
        </div>
      </div>
    </footer>
  );
}

/* ============ TESTIMONIALS CAROUSEL ============ */
function TestimonialsCarousel() {
  const scrollRef = useRef(null);
  const [activeDot, setActiveDot] = useState(0);

  const totalCards = testimonials.length;
  const perView = 3;
  const totalDots = Math.ceil(totalCards / perView);

  const scrollToPage = (page) => {
    setActiveDot(page);
    const container = scrollRef.current;
    if (!container) return;
    const cardWidth = container.offsetWidth / perView;
    container.scrollTo({
      left: page * cardWidth * perView,
      behavior: "smooth",
    });
  };

  const handleScroll = () => {
    const container = scrollRef.current;
    if (!container) return;
    const cardWidth = container.offsetWidth / perView;
    const page = Math.round(container.scrollLeft / (cardWidth * perView));
    setActiveDot(page);
  };

  const handlePrev = () => {
    scrollToPage(Math.max(0, activeDot - 1));
  };
  const handleNext = () => {
    scrollToPage(Math.min(totalDots - 1, activeDot + 1));
  };

  return (
    <>
      <div className="flex justify-between items-center">
        <div>
          <div className="eyebrow !text-[8px]">What Our Clients Say</div>
          <h2 className="serif text-[24px] mt-[2px]">Happy Customers</h2>
        </div>
        <span className="hidden max-[860px]:hidden">
          <button
            onClick={handlePrev}
            aria-label="Previous testimonials"
            className="circ-light cursor-pointer bg-transparent border-0"
          >
            ←
          </button>
          <button
            onClick={handleNext}
            aria-label="Next testimonials"
            className="circ-light cursor-pointer bg-transparent border-0"
          >
            →
          </button>
        </span>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-[14px] mt-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {testimonials.map((t) => (
          <div
            key={t.name}
            className="bg-[#fbfaf9] rounded-[8px] p-4 shadow-[0_1px_4px_#0000000d] relative flex-none w-[calc(33.333%-10px)] max-[860px]:w-full snap-start"
          >
            <div className="w-[22px] h-[22px] rounded-full bg-[#f1ebe5] grid place-items-center text-[13px] text-b-rose mb-2">
              “
            </div>
            <span className="text-[#e8923a] text-[10px] tracking-[2px] absolute left-[46px] top-5">
              ★★★★★
            </span>
            <p className="text-[11px] leading-[1.6] mb-[14px]">{t.quote}</p>
            <div className="flex gap-[10px] items-center text-[10px]">
              <span
                className="w-[26px] h-[26px] rounded-full text-white grid place-items-center text-[10px]"
                style={{ background: t.bg }}
              >
                {t.initials}
              </span>
              <span>
                — {t.name}
                <small className="block text-b-muted">{t.role}</small>
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center mt-[14px] text-[8px] tracking-[4px] text-[#d8cdc4]">
        {Array.from({ length: totalDots }).map((_, i) => (
          <button
            key={i}
            onClick={() => scrollToPage(i)}
            aria-label={`Go to testimonial page ${i + 1}`}
            className={`cursor-pointer bg-transparent border-0 text-[10px] tracking-[4px] ${i === activeDot ? "text-b-green font-bold" : "text-[#d8cdc4]"
              }`}
          >
            ●
          </button>
        ))}
      </div>
    </>
  );
}

/* ============ ENQUIRY FORM ============ */
function EnquiryForm({ variant = "home" }) {
  const isContact = variant === "contact";

  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (status === "sending") return;

    const form = e.currentTarget;
    const data = new FormData(form);

    data.append("_subject", FORMSUBMIT_SUBJECT);
    data.append("_template", "table");
    data.append("_captcha", "false");

    setStatus("sending");
    setErrorMsg("");

    try {
      const res = await fetch(FORMSUBMIT_ENDPOINT, {
        method: "POST",
        body: data,
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        throw new Error(`Submission failed (${res.status})`);
      }

      setStatus("success");
      form.reset();

      setTimeout(() => setStatus("idle"), 6000);
    } catch (err) {
      console.error(err);
      setStatus("error");
      setErrorMsg(
        "Something went wrong. Please try again or email us directly at sumitpasi944@gmail.com",
      );
    }
  };

  const inputBase = isContact
    ? "w-full mt-1 border border-[#e6dfd9] rounded-[6px] p-[10px] text-[12px] bg-white font-inter outline-none focus:border-b-green"
    : "w-full mt-1 border border-[#e6dfd9] rounded-[4px] p-[7px] text-[9px] bg-white font-inter";
  const labelBase = isContact
    ? "block text-[10px] font-medium text-b-text"
    : "block text-[8px] font-medium";

  if (status === "success") {
    return (
      <div
        className={
          isContact
            ? "bg-b-card rounded-[14px] p-7 shadow-[0_4px_16px_#0000000d] flex flex-col items-center justify-center text-center min-h-[420px]"
            : "bg-[#f9f8f7] rounded-[8px] p-[20px] text-b-green flex flex-col items-center justify-center text-center min-h-[280px]"
        }
      >
        <div
          className="w-14 h-14 rounded-full grid place-items-center mb-4 text-white"
          style={{ background: "#2f5d50" }}
        >
          <Icon.Check className="w-7 h-7" />
        </div>
        <h3
          className={
            isContact
              ? "font-newsreader font-normal text-[22px] mb-2 text-b-green"
              : "font-newsreader font-normal text-[18px] mb-2"
          }
        >
          Thank you!
        </h3>
        <p
          className={
            isContact
              ? "text-[12px] text-b-muted max-w-[300px] leading-[1.7]"
              : "text-[10px] max-w-[240px] leading-[1.6]"
          }
        >
          Your message has been sent successfully. We'll get back to you within
          24 hours.
        </p>
        <button
          onClick={() => setStatus("idle")}
          className={
            isContact
              ? "mt-5 text-[11px] underline text-b-green hover:no-underline cursor-pointer bg-transparent border-0"
              : "mt-4 text-[9px] underline cursor-pointer bg-transparent border-0"
          }
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={
        isContact
          ? "bg-b-card rounded-[14px] p-7 shadow-[0_4px_16px_#0000000d] grid grid-cols-2 gap-[14px]"
          : "bg-[#f9f8f7] rounded-[8px] p-[14px] grid grid-cols-2 gap-[10px] text-b-green"
      }
    >
      {isContact && (
        <h3 className="col-span-2 font-newsreader font-normal text-[20px] mb-2">
          Send us a message
        </h3>
      )}

      <label className={labelBase}>
        Full Name <i className="text-[#c0392b] not-italic">*</i>
        <input
          type="text"
          name="name"
          required
          placeholder="Your name"
          className={inputBase}
        />
      </label>

      {isContact && (
        <label className={labelBase}>
          Phone Number <i className="text-[#c0392b] not-italic">*</i>
          <input
            type="tel"
            name="phone"
            required
            placeholder="+91 ..."
            className={inputBase}
          />
        </label>
      )}

      <label className={`${labelBase} ${isContact ? "col-span-2" : ""}`}>
        Email Address <i className="text-[#c0392b] not-italic">*</i>
        <input
          type="email"
          name="email"
          required
          placeholder={isContact ? "you@example.com" : "you@company.com"}
          className={inputBase}
        />
      </label>

      <label className={labelBase}>
        Event Type <i className="text-[#c0392b] not-italic">*</i>
        <select
          name="eventType"
          required
          defaultValue=""
          className={inputBase}
        >
          <option value="" disabled>
            Select event type
          </option>
          {serviceCards.map((s) => (
            <option key={s.slug} value={s.title}>
              {s.title}
            </option>
          ))}
        </select>
      </label>

      <label className={labelBase}>
        Event Date{" "}
        {!isContact && <i className="text-[#c0392b] not-italic">*</i>}
        <input
          type="date"
          name="eventDate"
          required={!isContact}
          className={inputBase}
        />
      </label>

      <label
        className={`${labelBase} col-span-2`}
      >
        Message{" "}
        {isContact && <i className="text-[#c0392b] not-italic">*</i>}
        <textarea
          name="message"
          required={isContact}
          placeholder={
            isContact
              ? "Tell us about your event, venue, guest count..."
              : "Tell us about your event..."
          }
          className={`${inputBase} ${isContact ? "h-[120px] resize-none" : "h-[48px] resize-none"
            }`}
        />
      </label>

      {status === "error" && (
        <div
          className={`col-span-2 text-[10px] p-2 rounded ${isContact ? "text-[11px]" : "text-[9px]"
            }`}
          style={{
            background: "#fdecea",
            color: "#c0392b",
            border: "1px solid #f5c6cb",
          }}
        >
          {errorMsg}
        </div>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className={
          isContact
            ? "col-span-2 bg-[#0c2621] text-white border-0 rounded-[6px] p-[12px] text-[12px] cursor-pointer font-inter font-medium hover:bg-b-green transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            : "col-span-2 bg-[#0c2621] text-white border-0 rounded-[4px] p-[9px] text-[10px] cursor-pointer font-inter hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
        }
      >
        {status === "sending" ? "Sending..." : "Send Message \u00A0→"}
      </button>
    </form>
  );
}

/* ============ HOME PAGE ============ */
function HomePage() {
  return (
    <div className="min-h-screen bg-b-cream text-b-text font-inter">
      <Navbar />

      <section
        className="relative min-h-[520px] flex items-center text-white overflow-hidden max-[860px]:bg-[linear-gradient(90deg,rgba(13,24,18,0.93),rgba(13,24,18,0.8))]"
        style={{
          background: `linear-gradient(90deg, #0d1812 0%, #0d1812 38%, transparent 70%), url(${heroImg}) right center / cover no-repeat, #0d1812`,
        }}
      >
        <div className="w-full max-w-[1200px] mx-auto px-10 max-[860px]:px-5 pt-[50px] pb-10 relative z-10">
          <div className="eyebrow" style={{ color: "#e6ddd2" }}>
            Luxury Floral &amp; Event Decor
          </div>
          <h1 className="serif text-[clamp(38px,5vw,56px)] leading-[1.05] mt-[18px] mb-5 max-w-[520px]">
            Turning Your Moments Into{" "}
            <em className="text-b-gold not-italic">Beautiful Memories</em>
          </h1>
          <p className="max-w-[340px] text-[14px] mb-[30px] text-[#f1ebe3]">
            From intimate gatherings to grand celebrations, we create stunning
            floral decorations that bring your vision to life.
          </p>
          <div className="flex flex-wrap gap-[14px]">
            <Link to="/services" className="btn btn-gold">
              Explore Our Services →
            </Link>
            <Link to="/gallery" className="btn btn-ghost">
              ◎ Watch Our Story
            </Link>
          </div>
          <div className="flex gap-[44px] max-[860px]:gap-6 mt-[62px]">
            <div>
              <b className="font-newsreader font-normal text-[26px] block">
                500+
              </b>
              <small className="text-[11px] text-[#e6ddd2]">
                Happy Clients
              </small>
            </div>
            <div>
              <b className="font-newsreader font-normal text-[26px] block">
                8+
              </b>
              <small className="text-[11px] text-[#e6ddd2]">
                Years of Experience
              </small>
            </div>
            <div>
              <b className="font-newsreader font-normal text-[26px] block">
                4.9 <span className="text-b-gold text-[18px]">★</span>
              </b>
              <small className="text-[11px] text-[#e6ddd2]">
                Client Rating
              </small>
            </div>
          </div>
        </div>
      </section>

      <section
        id="services"
        className="relative py-[34px] pb-[50px] bg-[#fdf9f7]"
      >
        <div className="max-w-[1200px] mx-auto px-10 max-[860px]:px-5 relative">
          <div className="hidden max-[860px]:hidden absolute right-[90px] top-[80px] font-allura text-[34px] text-[#cfa98f] -rotate-[8deg] leading-[1.1] text-center">
            Every detail
            <br />
            matters
          </div>
          <div className="eyebrow">Our Services</div>
          <h2 className="serif text-[clamp(30px,4vw,42px)] leading-[1.1] mt-[10px] mb-[14px] max-w-[330px]">
            Decorations for Every Occasion
          </h2>
          <p className="text-b-muted max-w-[330px] mb-[22px] text-[13px]">
            We specialize in creating beautiful and memorable setups for all
            your special moments. Choose from our wide range of decoration
            services tailored to your needs.
          </p>
          <Link to="/services" className="btn btn-out">
            View All Services &nbsp;→
          </Link>
          <div className="grid grid-cols-4 max-[860px]:grid-cols-2 gap-[14px] mt-[30px]">
            {serviceCards.map((c) => {
              const cover = coverImage(c.folder);
              return (
                <Link
                  key={c.slug}
                  to={`/services/${c.slug}`}
                  className="bg-b-card rounded-[10px] overflow-hidden relative pb-[14px] block"
                >
                  <div
                    className="h-[100px] bg-cover bg-center bg-b-line"
                    style={
                      cover
                        ? { backgroundImage: `url(${cover})` }
                        : {
                          background:
                            "linear-gradient(135deg, #c9a58f 0%, #e8d9cc 45%, #8a9a7e 130%)",
                        }
                    }
                  />
                  <span className="absolute left-[14px] top-[80px] w-[34px] h-[34px] rounded-full bg-white grid place-items-center text-b-rose shadow-[0_2px_6px_#0001] text-[14px]">
                    {c.icon}
                  </span>
                  <div className="pt-[26px] px-4 flex justify-between items-start">
                    <div>
                      <h4 className="font-inter font-medium text-[13px]">
                        {c.title}
                      </h4>
                      <p className="text-[10px] text-b-muted mt-[6px] leading-[1.5]">
                        {c.desc}
                      </p>
                    </div>
                    <span className="text-[13px] mt-[14px] text-b-green">
                      →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section
        id="gallery"
        className="bg-b-green rounded-[14px] mx-[22px] text-white px-10 max-[860px]:px-5 py-7 grid grid-cols-[1fr_1.9fr] max-[860px]:grid-cols-1 gap-[30px] items-start overflow-hidden"
        style={{ marginTop: "30px" }}
      >
        <div>
          <div className="eyebrow !text-[#cfc8bd] !text-[8px]">Our Work</div>
          <h2 className="serif text-[32px] mt-[14px] mb-3">Featured Gallery</h2>
          <p className="text-[12px] text-[#e8e0d6] max-w-[210px] mb-[22px]">
            Take a look at some of our recent decorations and get inspired for
            your next event.
          </p>
          <Link
            to="/gallery"
            className="btn"
            style={{ background: "#f8e5cf", color: "#0b1f1a" }}
          >
            View Full Gallery &nbsp;→
          </Link>
        </div>
        <div className="overflow-hidden">
          <div className="grid grid-cols-4 gap-[9px] h-[214px] overflow-hidden">
            <div className="col-span-2 row-span-1 rounded-[8px] overflow-hidden relative">
              {featuredImages[0] ? (
                <img
                  src={featuredImages[0].src}
                  alt={featuredImages[0].alt}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(160deg, #f2d9d2 0%, #c9a58f 40%, #8a9a7e 100%)",
                  }}
                />
              )}
            </div>
            <div className="col-span-2 grid grid-cols-2 gap-[7px]">
              {[1, 2].map((i) => {
                const img = featuredImages[i];
                return (
                  <div
                    key={i}
                    className="rounded-[6px] overflow-hidden relative"
                  >
                    {img ? (
                      <img
                        src={img.src}
                        alt={img.alt}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className="absolute inset-0"
                        style={{
                          background:
                            "linear-gradient(150deg, #8a9a7e 0%, #f1eadc 60%, #c7a468 130%)",
                        }}
                      />
                    )}
                  </div>
                );
              })}
              <div className="col-span-2 rounded-[6px] overflow-hidden relative">
                {featuredImages[3] ? (
                  <img
                    src={featuredImages[3].src}
                    alt={featuredImages[3].alt}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(150deg, #8a9a7e 0%, #f1eadc 60%, #c7a468 130%)",
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-[50px] pb-10">
        <div className="max-w-[1200px] mx-auto px-10 max-[860px]:px-5 grid grid-cols-[1.1fr_3fr] max-[860px]:grid-cols-1 gap-[30px] items-center">
          <div>
            <div className="eyebrow">Why Choose Us</div>
            <h2 className="serif text-[28px] leading-[1.15] mt-[6px]">
              The Shri Shakti Decor difference
            </h2>
          </div>
          <div className="grid grid-cols-4 max-[860px]:grid-cols-2 max-[860px]:gap-y-5">
            {whyItems.map((w, idx) => (
              <div
                key={w.title}
                className={`px-[18px] ${idx === 0 ? "" : "border-l border-b-line"}`}
              >
                <i className="grid place-items-center w-[34px] h-[34px] rounded-full bg-[#f7e1d4] text-b-rose not-italic mb-3 text-[14px]">
                  {w.icon}
                </i>
                <h5 className="text-[12px] font-medium mb-[6px]">{w.title}</h5>
                <p className="text-[10px] text-b-muted leading-[1.5]">
                  {w.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-b-wrap rounded-[12px] pt-5 px-[22px] pb-[18px] mx-[22px] mt-[14px]">
        <TestimonialsCarousel />
      </section>

      <section
        id="quote"
        className="mt-[18px] mx-[14px] rounded-[6px] pt-[34px] px-[50px] pb-[22px] max-[860px]:pt-5 max-[860px]:px-3"
        style={{
          background:
            "linear-gradient(120deg, #f2d9d2, #f8ece6 40%, #ecd0cc, #f6e6e0)",
        }}
      >
        <div className="bg-b-green2 rounded-[10px] text-white p-7 grid grid-cols-[1fr_1.15fr] max-[860px]:grid-cols-1 gap-[30px] max-w-[1000px] mx-auto">
          <div>
            <div className="eyebrow !text-[#cfc8bd] !text-[8px]">
              Let's Create Something Beautiful
            </div>
            <h2 className="serif text-[30px] mt-[10px] mb-[10px]">
              Your vision. Our flowers.
            </h2>
            <p className="text-[12px] text-[#e8e0d6] max-w-[260px] mb-[22px]">
              Tell us about your event and we'll get back to you with a
              customized quote and design plan.
            </p>
            <Link
              to="/contact"
              className="btn"
              style={{ background: "#f8e5cf", color: "#0b1f1a" }}
            >
              Get a Free Quote &nbsp;→
            </Link>
          </div>
          <EnquiryForm variant="home" />
        </div>
      </section>

      <Footer />
    </div>
  );
}

/* ============ SERVICES PAGE ============ */
function ServicesPage() {
  return (
    <div className="min-h-screen bg-b-cream text-b-text font-inter">
      <Navbar />

      <section
        className="relative py-[60px] text-white overflow-hidden"
        style={{
          background: `linear-gradient(90deg, #0d1812 0%, #0d1812 50%, rgba(13,24,18,0.7) 100%), url(${heroImg}) right center / cover no-repeat, #0d1812`,
        }}
      >
        <div className="max-w-[1200px] mx-auto px-10 max-[860px]:px-5 relative z-10">
          <div className="eyebrow" style={{ color: "#e6ddd2" }}>
            What We Offer
          </div>
          <h1 className="serif text-[clamp(32px,4.5vw,48px)] leading-[1.1] mt-[14px] mb-4 max-w-[500px]">
            Our Decoration Services
          </h1>
          <p className="max-w-[420px] text-[13px] text-[#f1ebe3]">
            From intimate gatherings to grand celebrations, we design beautiful
            setups for every occasion.
          </p>
        </div>
      </section>

      <section className="py-[50px]">
        <div className="max-w-[1200px] mx-auto px-10 max-[860px]:px-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[20px]">
            {serviceCards.map((c) => {
              const cover = coverImage(c.folder);
              return (
                <Link
                  key={c.slug}
                  to={`/services/${c.slug}`}
                  className="bg-b-card rounded-[12px] overflow-hidden relative pb-[18px] block shadow-[0_2px_8px_#0000000a]"
                >
                  <div
                    className="h-[160px] bg-cover bg-center bg-b-line"
                    style={
                      cover
                        ? { backgroundImage: `url(${cover})` }
                        : {
                          background:
                            "linear-gradient(135deg, #c9a58f 0%, #e8d9cc 45%, #8a9a7e 130%)",
                        }
                    }
                  />
                  <span className="absolute left-[18px] top-[138px] w-[42px] h-[42px] rounded-full bg-white grid place-items-center text-b-rose shadow-[0_3px_8px_#0002] text-[18px]">
                    {c.icon}
                  </span>
                  <div className="pt-[34px] px-5">
                    <h3 className="font-newsreader font-normal text-[20px] mb-2">
                      {c.title}
                    </h3>
                    <p className="text-[12px] text-b-muted leading-[1.6] mb-3">
                      {c.tagline}
                    </p>
                    <span className="text-[11px] text-b-green font-medium">
                      Learn more →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

/* ============ ABOUT PAGE ============ */
function AboutPage() {
  return (
    <div className="min-h-screen bg-b-cream text-b-text font-inter">
      <Navbar />

      <section
        className="relative py-[60px] text-white overflow-hidden"
        style={{
          background: `linear-gradient(90deg, #0d1812 0%, #0d1812 50%, rgba(13,24,18,0.7) 100%), url(${heroImg}) right center / cover no-repeat, #0d1812`,
        }}
      >
        <div className="max-w-[1200px] mx-auto px-10 max-[860px]:px-5 relative z-10">
          <div className="eyebrow" style={{ color: "#e6ddd2" }}>
            Our Story
          </div>
          <h1 className="serif text-[clamp(32px,4.5vw,48px)] leading-[1.1] mt-[14px] mb-4 max-w-[500px]">
            About Shri Shakti Decor
          </h1>
          <p className="max-w-[420px] text-[13px] text-[#f1ebe3]">
            Crafting beautiful memories with fresh flowers and creative decor
            since 2017.
          </p>
        </div>
      </section>

      <section className="py-[50px]">
        <div className="max-w-[1200px] mx-auto px-10 max-[860px]:px-5 grid grid-cols-1 md:grid-cols-2 gap-[50px] items-center">
          <div>
            <div className="eyebrow">Who We Are</div>
            <h2 className="serif text-[clamp(24px,3vw,32px)] leading-[1.2] mt-2 mb-5">
              Passionate about making your moments unforgettable
            </h2>
            <p className="text-[13px] text-b-muted leading-[1.9] mb-4">
              Shri Shakti Decor is a full-service floral and event decoration
              company based in Meerut Cantt. For over 8 years, we've been
              transforming ordinary spaces into breathtaking celebrations with
              fresh flowers, elegant drapes and premium installations.
            </p>
            <p className="text-[13px] text-b-muted leading-[1.9] mb-6">
              From intimate engagements to grand weddings and corporate galas,
              our team brings creativity, precision and warmth to every event.
              We believe every celebration deserves decor that tells your
              unique story.
            </p>
            <div className="flex gap-[30px]">
              <div>
                <b className="font-newsreader font-normal text-[28px] block text-b-green">
                  500+
                </b>
                <small className="text-[10px] text-b-muted">
                  Events Decorated
                </small>
              </div>
              <div>
                <b className="font-newsreader font-normal text-[28px] block text-b-green">
                  8+
                </b>
                <small className="text-[10px] text-b-muted">
                  Years Experience
                </small>
              </div>
              <div>
                <b className="font-newsreader font-normal text-[28px] block text-b-green">
                  4.9★
                </b>
                <small className="text-[10px] text-b-muted">Client Rating</small>
              </div>
            </div>
          </div>

          <div className="relative rounded-[14px] overflow-hidden h-[380px] shadow-[0_10px_30px_#0000001a]">
            {featuredImages[0] && (
              <img
                src={featuredImages[0].src}
                alt="About Shri Shakti Decor"
                className="w-full h-full object-cover"
              />
            )}
          </div>
        </div>
      </section>

      <section className="py-[40px] bg-b-wrap mx-[22px] rounded-[12px]">
        <div className="max-w-[1200px] mx-auto px-10 max-[860px]:px-5">
          <div className="eyebrow text-center">Our Values</div>
          <h2 className="serif text-[28px] text-center mt-2 mb-8">
            What drives us every day
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-[20px]">
            {whyItems.map((w) => (
              <div key={w.title} className="text-center">
                <i className="inline-grid place-items-center w-[46px] h-[46px] rounded-full bg-[#f7e1d4] text-b-rose not-italic mb-3 text-[18px]">
                  {w.icon}
                </i>
                <h5 className="text-[13px] font-medium mb-[6px]">{w.title}</h5>
                <p className="text-[10.5px] text-b-muted leading-[1.5]">
                  {w.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-[50px]">
        <div className="max-w-[1200px] mx-auto px-10 max-[860px]:px-5">
          <TestimonialsCarousel />
        </div>
      </section>

      <Footer />
    </div>
  );
}

/* ============ CONTACT PAGE ============ */
function ContactPage() {
  return (
    <div className="min-h-screen bg-b-cream text-b-text font-inter">
      <Navbar />

      <section
        className="relative py-[60px] text-white overflow-hidden"
        style={{
          background: `linear-gradient(90deg, #0d1812 0%, #0d1812 50%, rgba(13,24,18,0.7) 100%), url(${heroImg}) right center / cover no-repeat, #0d1812`,
        }}
      >
        <div className="max-w-[1200px] mx-auto px-10 max-[860px]:px-5 relative z-10">
          <div className="eyebrow" style={{ color: "#e6ddd2" }}>
            Get In Touch
          </div>
          <h1 className="serif text-[clamp(32px,4.5vw,48px)] leading-[1.1] mt-[14px] mb-4 max-w-[500px]">
            Let's Plan Your Event
          </h1>
          <p className="max-w-[420px] text-[13px] text-[#f1ebe3]">
            Tell us about your celebration and we'll get back to you with a
            personalized quote.
          </p>
        </div>
      </section>

      <section className="py-[50px]">
        <div className="max-w-[1200px] mx-auto px-10 max-[860px]:px-5 grid grid-cols-1 md:grid-cols-[1fr_1.4fr] gap-[40px]">
          <div>
            <div className="eyebrow">Contact Information</div>
            <h2 className="serif text-[28px] leading-[1.2] mt-2 mb-6">
              We'd love to hear from you
            </h2>

            <div className="space-y-[20px]">
              <div className="flex gap-[14px] items-start">
                <div className="w-[42px] h-[42px] rounded-[10px] bg-[#f7e1d4] grid place-items-center text-b-green flex-none">
                  <Icon.Phone className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[.1em] text-b-muted mb-1">
                    Phone
                  </div>
                  <a
                    href="tel:+918439090932"
                    className="text-[13px] font-medium hover:text-b-green"
                  >
                    +91 8439090932
                  </a>
                </div>
              </div>

              <div className="flex gap-[14px] items-start">
                <div className="w-[42px] h-[42px] rounded-[10px] bg-[#f7e1d4] grid place-items-center text-b-green flex-none">
                  <Icon.Mail className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[.1em] text-b-muted mb-1">
                    Email
                  </div>
                  <a
                    href="mailto:sumitpasi944@gmail.com"
                    className="text-[13px] font-medium hover:text-b-green break-all"
                  >
                    sumitpasi944@gmail.com
                  </a>
                </div>
              </div>

              <div className="flex gap-[14px] items-start">
                <div className="w-[42px] h-[42px] rounded-[10px] bg-[#f7e1d4] grid place-items-center text-b-green flex-none">
                  <Icon.Pin className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[.1em] text-b-muted mb-1">
                    Address
                  </div>
                  <p className="text-[13px] font-medium leading-[1.5]">
                    Shiv Chowk Kanker Khera,
                    <br />
                    Meerut Cantt
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 p-5 bg-b-wrap rounded-[10px]">
              <h4 className="font-newsreader font-normal text-[16px] mb-2">
                Business Hours
              </h4>
              <p className="text-[11.5px] text-b-muted leading-[1.7]">
                Monday – Saturday: 10:00 AM – 7:00 PM
                <br />
                Sunday: By appointment only
              </p>
            </div>
          </div>

          <EnquiryForm variant="contact" />
        </div>
      </section>

      <Footer />
    </div>
  );
}

/* ================================================================
   SERVICE PAGE
   ================================================================ */
function ServicePage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const service = serviceCards.find((s) => s.slug === slug);

  const [tilePage, setTilePage] = useState(0);
  useEffect(() => {
    setTilePage(0);
  }, [slug]);

  const [selected, setSelected] = useState(null);
  useEffect(() => {
    setSelected(null);
  }, [slug]);
  useEffect(() => {
    if (!selected) return;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") setSelected(null);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [selected]);

  if (!service) {
    return (
      <div className="min-h-screen bg-b-cream text-b-text font-inter">
        <Navbar />
        <div className="max-w-[1200px] mx-auto px-10 max-[860px]:px-5 py-[120px] text-center">
          <h1 className="serif text-[42px] mb-4">Service not found</h1>
          <p className="text-b-muted mb-8">
            We couldn't find the service you're looking for.
          </p>
          <button onClick={() => navigate("/")} className="btn btn-dark">
            ← Back to Home
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  const allItems = allItemsInFolder(service.folder);
  const priced = allItems.filter((x) => x.price !== null);

  const bigCover = decorationHero || (priced[0] || allItems[0])?.url || "";

  const sourceItems = priced.length > 0 ? priced : allItems;
  const TILES_PER_PAGE = 8;
  const totalPages = Math.max(
    1,
    Math.ceil(sourceItems.length / TILES_PER_PAGE),
  );

  const safePage = Math.min(tilePage, totalPages - 1);
  const tileStart = safePage * TILES_PER_PAGE;
  const tileItems = sourceItems.slice(tileStart, tileStart + TILES_PER_PAGE);

  for (
    let k = 0;
    tileItems.length > 0 && tileItems.length < TILES_PER_PAGE;
    k++
  ) {
    tileItems.push(sourceItems[k % sourceItems.length]);
  }

  const selIndex = selected ? sourceItems.indexOf(selected) : -1;
  const stepSelected = (d) =>
    setSelected(
      sourceItems[(selIndex + d + sourceItems.length) % sourceItems.length],
    );

  const goPrev = () => setTilePage((p) => Math.max(0, p - 1));
  const goNext = () => setTilePage((p) => Math.min(totalPages - 1, p + 1));

  const related = serviceCards.filter((s) => s.slug !== slug).slice(0, 4);

  return (
    <div className="min-h-screen bg-sp-bg text-sp-text font-inter">
      {/* HEADER — now shows the real logo image on the left of the title */}
      <header className="bg-sp-bg sticky top-0 z-50">
        <div className="max-w-[1180px] mx-auto px-6 h-[78px] flex items-center justify-between">
          <Link to="/" className="flex items-center gap-[10px]">
            <img
              src="/images/decoration_logos.png"
              alt="Shri Shakti Decor Logo"
              className="w-[110px] h-[110px] object-contain"
            />
            <span>
              <b className="block font-baskerville font-normal text-[21px] leading-none">
                Shri Shakti Decor
              </b>
              <small className="text-[9px] text-sp-muted">
                Flowers · Decor · Special Moments
              </small>
            </span>
          </Link>

          <nav className="hidden md:flex gap-[30px] text-[12px] font-medium">
            <Link to="/" className="py-1.5">
              Home
            </Link>
            <Link to="/services" className="py-1.5">
              Services
            </Link>
            <Link to="/gallery" className="py-1.5">
              Gallery
            </Link>
            <Link to="/about" className="py-1.5">
              About
            </Link>
            <Link to="/contact" className="py-1.5">
              Contact
            </Link>
          </nav>

          <Link
            to="/contact"
            className="hidden md:inline-flex items-center gap-2 bg-sp-gdark text-white px-[22px] py-3 rounded-full text-[12px] font-semibold"
          >
            ▣ Get a Quote →
          </Link>

          <MobileMenu
            visibleClass="flex md:hidden"
            barClass="bg-sp-gdark"
            panelClass="bg-sp-bg"
          />
        </div>
      </header>

      <section className="relative min-h-[520px] overflow-hidden bg-sp-gdark text-white">
        {bigCover && (
          <img
            src="/images/decoration.png"
            alt={service.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div
          className="absolute inset-0 z-[1]"
          style={{
            background:
              "linear-gradient(90deg, rgba(11,35,31,.95) 0, rgba(11,35,31,.8) 32%, rgba(11,35,31,0) 62%)",
          }}
        />

        <div className="relative z-[2] max-w-[1180px] mx-auto px-6 pt-[44px] pb-[60px]">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-[11px] text-[#cfc8bd] hover:text-sp-gold mb-6 bg-transparent border-0 cursor-pointer"
          >
            ← Back
          </button>

          <span
            className="inline-flex items-center gap-2 text-[10px] px-[14px] py-[7px] rounded-full font-medium"
            style={{
              background: "rgba(255,255,255,.08)",
              border: "1px solid rgba(255,255,255,.3)",
            }}
          >
            <span>{service.icon}</span> Transforming Moments
          </span>

          <h1 className="font-baskerville font-normal text-[clamp(28px,4.5vw,44px)] leading-[1.2] mt-7 mb-[22px] max-w-[440px]">
            Beautiful {service.title} Decorations for Your{" "}
            <em className="text-sp-goldText not-italic">Special Moments</em>
          </h1>

          <p className="text-[13px] leading-[1.7] max-w-[330px] text-[#e7ece9] mb-[34px]">
            {service.tagline} {service.longDesc.split(".")[0]}.
          </p>

          <div className="flex flex-wrap gap-4">
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 bg-sp-gold text-sp-gdark px-[22px] py-3 rounded-full text-[12px] font-semibold"
            >
              Get a Free Quote →
            </Link>
            <Link
              to="/gallery"
              className="inline-flex items-center gap-2 border border-white/55 text-white px-[22px] py-3 rounded-full text-[12px] font-semibold"
            >
              ▣ View Gallery
            </Link>
          </div>
        </div>

        <div className="hidden md:block absolute z-[2] right-[30px] top-[140px] font-dancing text-[20px] leading-[1.2] -rotate-[8deg] text-right">
          Your Vision
          <br />
          Our Decoration
        </div>
      </section>

      <section className="bg-sp-bg py-[50px] pb-[44px]">
        <div className="max-w-[1180px] mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-[60px] items-center">
          <div>
            <div className="eyebrow">About this service</div>
            <h2 className="font-baskerville font-normal text-[clamp(22px,3vw,28px)] leading-[1.3] mb-5">
              {service.desc}
            </h2>
            <p className="text-[12.5px] leading-[1.9] text-sp-muted max-w-[330px]">
              {service.longDesc}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-[14px] mt-[30px] mb-[30px]">
              {[
                {
                  ico: <Icon.Leaf className="w-5 h-5" />,
                  bg: "bg-sp-i1",
                  c: "text-sp-green",
                  label: "Fresh & Beautiful Flowers",
                },
                {
                  ico: <Icon.Star className="w-5 h-5" />,
                  bg: "bg-sp-i2",
                  c: "text-sp-amber",
                  label: "Creative & Custom Designs",
                },
                {
                  ico: <Icon.Shield className="w-5 h-5" />,
                  bg: "bg-sp-i3",
                  c: "text-sp-green",
                  label: "On-Time Setup",
                },
                {
                  ico: <Icon.Smile className="w-5 h-5" />,
                  bg: "bg-sp-i4",
                  c: "text-[#e0453a]",
                  label: "100% Client Satisfaction",
                },
              ].map((f, i) => (
                <div
                  key={i}
                  className="text-[11px] text-[#5d6764] leading-[1.5]"
                >
                  <div
                    className={`w-[42px] h-[42px] rounded-[12px] grid place-items-center mb-[10px] ${f.bg} ${f.c}`}
                  >
                    {f.ico}
                  </div>
                  {f.label}
                </div>
              ))}
            </div>

            <Link
              to="/contact"
              className="inline-flex items-center gap-2 bg-sp-gdark text-white px-[22px] py-3 rounded-full text-[12px] font-semibold"
            >
              Know More &nbsp;→
            </Link>
          </div>

          <div className="relative rounded-[14px] overflow-hidden h-[313px] shadow-[0_18px_40px_rgba(11,35,31,.18)]">
            {bigCover && (
              <img
                src={bigCover}
                alt={service.title}
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[34px] h-[34px] rounded-full bg-sp-greenMid text-white grid place-items-center">
              <Icon.Play className="w-3.5 h-3.5" />
            </div>
            <span className="absolute left-4 bottom-3.5 text-white font-dancing text-[14px] leading-[1.2]">
              Creating Memories
              <br />
              With Flowers &amp; Decor ♡
            </span>
          </div>
        </div>
      </section>

      <section className="bg-sp-panel rounded-[22px] max-w-[1128px] mx-auto px-5 pt-6 pb-7">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 mb-4">
          <div>
            <div className="eyebrow">Our Gallery</div>
            <h3 className="font-baskerville font-normal text-[22px]">
              Featured {service.title} Decor Ideas
            </h3>
          </div>
          <Link
            to="/gallery"
            className="text-[10px] font-semibold border-b border-sp-gdark pb-[3px] w-fit"
          >
            View All →
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-[14px] auto-rows-[154px]">
          <div
            onClick={() =>
              setSelected({ url: bigCover, price: priced[0]?.price ?? null })
            }
            className="relative col-span-2 row-span-2 rounded-[12px] overflow-hidden shadow-[0_8px_20px_rgba(11,35,31,.15)] cursor-pointer"
          >
            {bigCover && (
              <img
                src={bigCover}
                alt={service.title}
                className="w-full h-full object-cover"
              />
            )}
            <span className="absolute left-2.5 top-2.5 z-[2] bg-sp-gdark/85 text-white text-[9px] px-[11px] py-[5px] rounded-full">
              {service.title}
            </span>
            <span className="absolute right-2.5 top-2.5 z-[2] w-6 h-6 rounded-full bg-white/90 grid place-items-center text-[11px]">
              ♡
            </span>
            <div className="absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-sp-gdark/85 to-transparent pointer-events-none" />
            <div className="absolute left-4 bottom-4 z-[2] text-white text-[12px]">
              {service.title} Decor
              {priced[0]?.price != null && (
                <b className="block font-inter font-semibold text-[20px] mt-1">
                  {formatPrice(priced[0].price)}
                </b>
              )}
            </div>
            <span className="absolute right-4 bottom-4 z-[2] w-7 h-7 rounded-full bg-[#b9cdc4] text-sp-gdark grid place-items-center text-[11px]">
              →
            </span>
          </div>

          {tileItems.slice(0, TILES_PER_PAGE).map((item, i) => (
            <div
              key={i}
              onClick={() => setSelected(item)}
              className="relative rounded-[12px] overflow-hidden shadow-[0_8px_20px_rgba(11,35,31,.15)] cursor-pointer"
            >
              <img
                src={item.url}
                alt={`${service.title} ${i + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <span className="absolute left-2.5 top-2.5 z-[2] bg-sp-gdark/85 text-white text-[9px] px-[11px] py-[5px] rounded-full">
                {service.title}
              </span>
              <span className="absolute right-2.5 top-2.5 z-[2] w-6 h-6 rounded-full bg-white/90 grid place-items-center text-[11px]">
                ♡
              </span>
              {item.price !== null && (
                <span className="absolute left-2.5 bottom-2.5 z-[2] bg-white text-[11px] font-semibold px-3 py-[5px] rounded-full">
                  {formatPrice(item.price)}
                </span>
              )}
              <span className="absolute right-2.5 bottom-2.5 z-[2] w-[22px] h-[22px] rounded-full bg-[#b9cdc4] text-sp-gdark grid place-items-center text-[10px]">
                →
              </span>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center gap-[10px] mt-[26px]">
          <span className="text-[11px] text-sp-muted">
            Page {safePage + 1} of {totalPages} · {sourceItems.length} images
          </span>
          <div className="flex gap-[10px]">
            <button
              onClick={goPrev}
              disabled={safePage === 0}
              aria-label="Previous images"
              className="w-8 h-8 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,.08)] grid place-items-center text-sp-text cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ←
            </button>
            <button
              onClick={goNext}
              disabled={safePage >= totalPages - 1}
              aria-label="Next images"
              className="w-8 h-8 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,.08)] grid place-items-center text-sp-text cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              →
            </button>
          </div>
        </div>
      </section>

      <section className="bg-sp-cta rounded-[20px] max-w-[1128px] mx-auto mb-10 mt-10 px-5 md:pl-[150px] md:pr-10 py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative min-h-[96px]">
        <div className="hidden md:block absolute left-[18px] bottom-0 text-[60px] leading-none text-sp-mint">
          ✿
        </div>
        <div>
          <div className="eyebrow !mb-0">Let's Plan Your Special Day</div>
          <h3 className="font-baskerville font-normal text-[19px] mt-[6px] mb-2">
            Ready to create something beautiful?
          </h3>
          <p className="text-[10.5px] text-sp-muted">
            Get in touch with us for a personalized quote and let's bring your
            vision to life.
          </p>
        </div>
        <Link
          to="/contact"
          className="inline-flex items-center gap-2 bg-sp-gdark text-white px-[22px] py-3 rounded-full text-[12px] font-semibold"
        >
          Get a Free Quote →
        </Link>
      </section>

      <section className="bg-sp-panel py-[60px] max-[720px]:py-[40px] mx-[22px] rounded-[14px] mb-6">
        <div className="max-w-[1180px] mx-auto px-6">
          <div className="eyebrow mb-2">Explore more</div>
          <h2 className="font-baskerville font-normal text-[clamp(24px,3.5vw,34px)] leading-[1.15] mb-8">
            Other services
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[14px]">
            {related.map((s) => {
              const cover = coverImage(s.folder);
              return (
                <Link
                  key={s.slug}
                  to={`/services/${s.slug}`}
                  className="bg-sp-bg rounded-[12px] overflow-hidden shadow-[0_6px_18px_rgba(11,35,31,.06)] block"
                >
                  <div
                    className="h-[114px] bg-cover bg-center bg-[#cfc8bd]"
                    style={
                      cover ? { backgroundImage: `url(${cover})` } : undefined
                    }
                  />
                  <div className="px-4 pt-2.5 pb-4">
                    <div className="w-[34px] h-[34px] -mt-[38px] mb-3 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,.12)] grid place-items-center text-sp-green text-[15px]">
                      {s.icon}
                    </div>
                    <h4 className="font-baskerville font-semibold text-[13px] mb-1.5">
                      {s.title}
                    </h4>
                    <p className="text-[10px] text-sp-muted leading-[1.6] max-w-[110px]">
                      {s.desc}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <Footer />

      {selected && (
        <div
          className="fixed inset-0 z-[60] bg-[rgba(10,24,20,.6)] flex items-center justify-center p-5"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelected(null);
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            style={{ backgroundColor: "#fbf7f3" }}
            className="w-full max-w-[860px] max-h-[92vh] overflow-auto rounded-[18px] grid grid-cols-1 md:grid-cols-[1.25fr_1fr] shadow-[0_12px_40px_rgba(0,0,0,.25)]"
          >
            <div className="relative h-[300px] md:h-auto md:min-h-[460px] bg-[#cfc8bd]">
              <img
                src={selected.url}
                alt={service.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <span className="absolute left-3 top-3 z-[2] bg-sp-gdark/85 text-white text-[10px] px-3 py-[5px] rounded-full">
                {service.title}
              </span>
              <button
                onClick={() => setSelected(null)}
                aria-label="Close"
                className="absolute z-[3] right-3 top-3 w-8 h-8 rounded-full bg-[#1b1b1b] text-white grid place-items-center cursor-pointer"
              >
                <Icon.X className="w-4 h-4" />
              </button>
              {selIndex >= 0 && sourceItems.length > 1 && (
                <>
                  <button
                    onClick={() => stepSelected(-1)}
                    aria-label="Previous image"
                    className="absolute z-[3] left-3 top-1/2 -mt-4 w-8 h-8 rounded-full bg-[rgba(15,35,30,.75)] text-white grid place-items-center cursor-pointer"
                  >
                    <Icon.ChevLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => stepSelected(1)}
                    aria-label="Next image"
                    className="absolute z-[3] right-3 top-1/2 -mt-4 w-8 h-8 rounded-full bg-[rgba(15,35,30,.75)] text-white grid place-items-center cursor-pointer"
                  >
                    <Icon.ChevRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>

            <div
              className="p-6 flex flex-col"
              style={{ backgroundColor: "#fbf7f3", color: "#1c2b27" }}
            >
              <div
                className="text-[10px] tracking-[.14em] uppercase"
                style={{ color: "#8a7f73" }}
              >
                {service.title}
              </div>
              <h3 className="font-baskerville font-normal text-[22px] leading-[1.25] mt-1 mb-3">
                {service.title} Decor
              </h3>
              {selected.price != null && (
                <div
                  className="text-[24px] font-semibold mb-3"
                  style={{ color: "#2f5d50" }}
                >
                  {formatPrice(selected.price)}
                </div>
              )}
              <p
                className="text-[12px] leading-[1.8] mb-4"
                style={{ color: "#5d6764" }}
              >
                {service.longDesc}
              </p>
              <div className="text-[11px] font-semibold mb-2">Includes</div>
              <ul
                className="text-[11.5px] leading-[1.9] mb-5"
                style={{ color: "#5d6764" }}
              >
                {service.highlights.map((h) => (
                  <li key={h}>✓ {h}</li>
                ))}
              </ul>
              {selIndex >= 0 && (
                <div className="text-[10px] mb-4" style={{ color: "#5d6764" }}>
                  Image {selIndex + 1} of {sourceItems.length}
                </div>
              )}

              {/* Two-button footer: WhatsApp + Get a Free Quote */}
              <div className="mt-auto flex flex-col sm:flex-row gap-2">
                <a
                  href={buildServiceWhatsAppUrl(service, selected)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setSelected(null)}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-[22px] py-3 rounded-full text-[12px] font-semibold bg-[#25D366] text-white hover:bg-[#1ebe5a] transition-colors"
                >
                  <Icon.WhatsApp className="w-4 h-4" />
                  Get in Touch
                </a>
                <Link
                  to="/contact"
                  onClick={() => setSelected(null)}
                  style={{ backgroundColor: "#0b231f", color: "#ffffff" }}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-[22px] py-3 rounded-full text-[12px] font-semibold"
                >
                  Get a Free Quote →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Back to top"
        className="fixed right-3.5 bottom-[50px] w-[30px] h-[30px] rounded-full bg-sp-green text-white grid place-items-center text-[12px] shadow-[0_4px_12px_rgba(0,0,0,.2)] z-50"
      >
        <Icon.ArrowUp className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

/* ============ GALLERY PAGE ============ */
function GalleryPage() {
  const navigate = useNavigate();
  const [cat, setCat] = useState("All");
  const [term, setTerm] = useState("");
  const [shown, setShown] = useState(GALLERY_PAGE);
  const [cur, setCur] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

  const list = useMemo(() => {
    return GALLERY_ITEMS.filter((i) => {
      const matchCat = cat === "All" || i.cat === cat;
      const matchTerm =
        !term || (i.title + " " + i.cat).toLowerCase().includes(term);
      return matchCat && matchTerm;
    });
  }, [cat, term]);

  const visible = list.slice(0, shown);
  const hasMore = shown < list.length;

  useEffect(() => {
    setShown(GALLERY_PAGE);
  }, [cat, term]);
  useEffect(() => {
    if (modalOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [modalOpen]);
  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setModalOpen(false);
      if (e.key === "ArrowLeft")
        setCur((c) => (c - 1 + list.length) % list.length);
      if (e.key === "ArrowRight")
        setCur((c) => (c + 1) % list.length);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [modalOpen, list.length]);

  const openModal = (i) => {
    setCur(i);
    setModalOpen(true);
  };
  const step = (d) => {
    setCur((c) => (c + d + list.length) % list.length);
  };

  const columns = useMemo(() => {
    const cols = [0, 1, 2, 3].map(() => ({ h: 0, items: [] }));
    visible.forEach((it, idx) => {
      const c = cols.reduce((a, b) => (b.h < a.h ? b : a));
      c.items.push({ item: it, idx });
      c.h += it.h + GALLERY_GAP;
    });
    return cols;
  }, [visible]);

  const activeItem = list[cur];

  return (
    <div
      className="min-h-screen bg-g-bg font-inter text-g-ink"
      style={{ WebkitFontSmoothing: "antialiased" }}
    >
      <div className="max-w-[1024px] mx-auto px-9 max-[520px]:px-4">
        <header className="relative flex items-center justify-between h-[82px]">
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/images/decoration_logos.png"
              alt="Shri Shakti Decor Logo"
              className="w-[110px] h-[110px] object-contain"
            />
            <span>
              <b className="block font-playfair font-medium text-[17px] text-g-ink leading-[1.1]">
                Shri Shakti Decor
              </b>
              <small className="block text-[8.5px] text-g-muted tracking-[.2px] mt-[2px]">
                Flowers &nbsp;•&nbsp; Decor &nbsp;•&nbsp; Celebrations
              </small>
            </span>
          </Link>
          <nav className="hidden max-[860px]:hidden absolute left-1/2 -translate-x-1/2 flex gap-[27px] text-[11px] text-g-nav -ml-[9px]">
            <Link to="/">Home</Link>
            <Link
              to="/gallery"
              className="relative font-semibold text-g-ink after:content-[''] after:absolute after:left-0 after:right-0 after:-bottom-[9px] after:h-[2px] after:bg-g-800 after:rounded-[2px]"
            >
              Gallery
            </Link>
            <Link to="/about">About</Link>
            <Link to="/contact">Contact</Link>
          </nav>
          <Link
            to="/contact"
            className="max-[860px]:hidden inline-flex items-center gap-[7px] bg-g-800 text-white text-[11px] font-medium px-[18px] h-[34px] rounded-full shadow-[0_2px_8px_rgba(15,56,48,.2)] -mr-[3px]"
          >
            <Icon.WhatsApp className="w-[14px] h-[14px]" />
            Get a Free Quote
          </Link>

          <MobileMenu
            visibleClass="flex min-[861px]:hidden"
            barClass="bg-g-800"
            panelClass="bg-g-surface"
          />
        </header>

        <section className="relative h-[186px] rounded-[10px] overflow-hidden bg-g-900">
          {heroImg && (
            <img
              src={heroImg}
              alt=""
              className="absolute right-0 top-0 w-[68%] h-full object-cover object-center max-[860px]:w-full max-[860px]:opacity-50"
            />
          )}
          <div
            className="absolute inset-0 z-[1]"
            style={{
              background:
                "linear-gradient(90deg, #0c342c 0%, #0c342c 32%, rgba(12,52,44,.86) 46%, rgba(12,52,44,.25) 66%, rgba(12,52,44,0) 80%)",
            }}
          />
          <svg
            className="hidden max-[860px]:hidden absolute z-[1] left-[455px] bottom-0 h-[140px] opacity-55"
            viewBox="0 0 120 160"
            fill="none"
            stroke="#9db8af"
            strokeWidth=".8"
          >
            <path d="M60 160C58 110 70 60 100 10" />
            <path d="M72 100c-18-4-28-18-30-34 18 4 28 16 30 34zM82 70c-8-14-8-30 2-44 10 14 10 30-2 44zM66 124c-16 2-30-6-38-20 16-2 30 6 38 20zM90 48c14-4 24-12 28-26-14 4-24 12-28 26z" />
          </svg>
          <div className="relative z-[2] pt-9 pl-[37px] pr-[37px] max-[520px]:pt-6 max-[520px]:pl-5 max-[520px]:pr-5">
            <span className="inline-block bg-g-700 text-[#cfe0da] text-[8.5px] tracking-[.8px] px-[10px] py-[5px] rounded-full uppercase">
              Our Work
            </span>
            <h1 className="font-playfair font-medium text-[40px] max-[520px]:text-[30px] text-white mt-2 mb-[14px] tracking-[-.2px] leading-[1.1]">
              Full Gallery
            </h1>
            <p className="text-[11px] leading-[1.55] text-[#d8e4e0] max-w-[360px]">
              Explore our collection of beautiful decorations, flower
              arrangements and event setups. Each moment is crafted with love
              and creativity to make your special day unforgettable.
            </p>
          </div>
        </section>

        <div className="flex items-center gap-[14px] mt-[22px] mb-7 max-[860px]:flex-wrap">
          {GALLERY_CATEGORIES.map((c) => {
            const active = c === cat;
            return (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={
                  active
                    ? "h-[30px] px-[17px] rounded-full bg-g-800 text-white text-[10px] font-semibold shadow-[0_2px_6px_rgba(15,56,48,.25)] transition-[.2s] cursor-pointer"
                    : "h-[30px] px-[15px] rounded-full bg-g-chip text-g-ink2 text-[10px] shadow-[0_1px_3px_rgba(0,0,0,.08)] transition-[.2s] cursor-pointer"
                }
              >
                {c}
              </button>
            );
          })}
          <label className="max-[860px]:ml-0 ml-auto flex items-center gap-[10px] w-[226px] max-[860px]:w-full h-8 bg-g-surface rounded-full px-[14px] shadow-[0_1px_4px_rgba(0,0,0,.08)]">
            <Icon.Search className="w-[13px] h-[13px] text-g-ink" />
            <input
              type="search"
              value={term}
              onChange={(e) => setTerm(e.target.value.trim().toLowerCase())}
              placeholder="Search gallery..."
              aria-label="Search gallery"
              className="border-0 outline-none bg-transparent text-[11px] text-g-ink w-full placeholder:text-g-muted"
            />
          </label>
        </div>

        {visible.length === 0 ? (
          <p className="text-center text-g-muted text-[13px] py-[60px]">
            {GALLERY_ITEMS.length === 0
              ? "No images loaded. Make sure the images folder is inside src/ (e.g. src/images/Wedding/...)"
              : "No items match your search."}
          </p>
        ) : (
          <main className="grid grid-cols-[1.96fr_1fr_1fr_1fr] max-[860px]:grid-cols-2 max-[520px]:gap-3 gap-[19px] items-start">
            {columns.map((col, ci) => (
              <div key={ci} className="flex flex-col gap-4">
                {col.items.map(({ item, idx }) => (
                  <article
                    key={idx}
                    tabIndex={0}
                    onClick={() => openModal(idx)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") openModal(idx);
                    }}
                    aria-label={item.title}
                    style={{ height: `${item.h}px` }}
                    className="group relative rounded-lg overflow-hidden bg-[#d8d5cc] cursor-pointer w-full shadow-[0_2px_8px_rgba(0,0,0,.08)]"
                  >
                    <img
                      src={item.img}
                      alt={item.title}
                      loading="lazy"
                      className="w-full h-full object-cover block transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-black/55 to-transparent pointer-events-none" />
                    <span className="absolute z-[2] left-[13px] top-[13px] bg-white/93 text-g-ink2 text-[9px] px-[10px] py-[5px] rounded-full backdrop-blur-[4px]">
                      {item.cat}
                    </span>
                    {item.price !== null && (
                      <span className="absolute z-[2] right-[13px] top-[13px] bg-white/95 text-g-ink text-[10px] font-semibold px-[10px] py-[5px] rounded-full shadow-[0_2px_6px_rgba(0,0,0,.15)]">
                        {formatPrice(item.price)}
                      </span>
                    )}
                    <div className="absolute z-[2] left-[15px] bottom-3 flex gap-[14px] text-white text-[10px] font-medium">
                      <span className="inline-flex items-center gap-[5px]">
                        <Icon.Heart className="w-3 h-3" />
                        {item.likes}
                      </span>
                      <span className="inline-flex items-center gap-[5px]">
                        <Icon.Eye className="w-3 h-3" />
                        {item.views}
                      </span>
                    </div>
                    <span className="absolute z-[2] right-[11px] bottom-[9px] w-[26px] h-[26px] rounded-full bg-white grid place-items-center shadow-[0_1px_4px_rgba(0,0,0,.25)]">
                      <Icon.ChevRight className="w-3 h-3 text-g-ink" />
                    </span>
                  </article>
                ))}
              </div>
            ))}
          </main>
        )}

        {hasMore && (
          <div className="text-center my-5 mb-[29px]">
            <button
              onClick={() => setShown((s) => s + GALLERY_PAGE)}
              className="inline-flex items-center gap-[9px] bg-g-800 text-white text-[11px] font-medium h-[34px] px-[31px] rounded-full shadow-[0_2px_8px_rgba(15,56,48,.25)] cursor-pointer"
            >
              <Icon.Down className="w-[13px] h-[13px]" />
              Load More
            </button>
          </div>
        )}
      </div>

      {modalOpen && activeItem && (
        <div
          className="fixed inset-0 bg-[rgba(10,24,20,.45)] flex items-center justify-center p-5 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-[872px] max-h-[96vh] overflow-auto bg-g-surface rounded-xl p-4 pb-5 px-5 grid grid-cols-[480px_1fr] max-[860px]:grid-cols-1 gap-6 shadow-[0_12px_40px_rgba(0,0,0,.18)]">
            <div>
              <div className="relative h-[232px] max-[860px]:h-auto max-[860px]:aspect-[480/232] rounded-md overflow-hidden bg-[#d8d5cc]">
                <img
                  src={activeItem.img}
                  alt={activeItem.title}
                  className="w-full h-full object-cover block"
                />
                <div className="absolute inset-x-0 bottom-0 h-[40%] bg-gradient-to-t from-black/45 to-transparent" />
                <button
                  onClick={() => setModalOpen(false)}
                  aria-label="Close"
                  className="absolute z-[3] right-[10px] top-[10px] w-[26px] h-[26px] rounded-full bg-[#1b1b1b] text-white grid place-items-center cursor-pointer"
                >
                  <Icon.X className="w-[13px] h-[13px]" />
                </button>
                <button
                  onClick={() => step(-1)}
                  aria-label="Previous"
                  className="absolute z-[3] left-[10px] top-1/2 -mt-[13px] w-[26px] h-[26px] rounded-full bg-[rgba(15,35,30,.75)] text-white grid place-items-center cursor-pointer"
                >
                  <Icon.ChevLeft className="w-[13px] h-[13px]" />
                </button>
                <button
                  onClick={() => step(1)}
                  aria-label="Next"
                  className="absolute z-[3] right-[10px] top-1/2 -mt-[13px] w-[26px] h-[26px] rounded-full bg-[rgba(15,35,30,.75)] text-white grid place-items-center cursor-pointer"
                >
                  <Icon.ChevRight className="w-[13px] h-[13px]" />
                </button>
                <div className="absolute z-[2] left-[14px] bottom-[10px] flex gap-[14px] text-white text-[10px] font-medium">
                  <span className="inline-flex items-center gap-[5px]">
                    <Icon.Heart className="w-3 h-3" />
                    <i className="not-italic">{activeItem.likes}</i>
                  </span>
                  <span className="inline-flex items-center gap-[5px]">
                    <Icon.Eye className="w-3 h-3" />
                    <i className="not-italic">{activeItem.views}</i>
                  </span>
                </div>
              </div>
              <div className="flex gap-[7px] mt-[9px] overflow-hidden">
                {list.slice(0, 12).map((x, n) => (
                  <button
                    key={n}
                    onClick={() => setCur(n)}
                    aria-label={x.title}
                    className={`flex-none w-[101px] h-[57px] rounded-[4px] overflow-hidden bg-[#d8d5cc] p-0 border-2 ${n === cur ? "border-[#7fb3ae]" : "border-transparent"}`}
                  >
                    <img
                      src={x.img}
                      alt=""
                      className="w-full h-full object-cover block"
                    />
                  </button>
                ))}
              </div>
            </div>
            <div className="pt-1.5 flex flex-col">
              <span className="self-start bg-g-tag text-g-ink2 text-[9px] px-[10px] py-1 rounded-full">
                {activeItem.cat}
              </span>
              <h2 className="font-playfair font-medium text-[19px] mt-[11px] mb-3 text-g-ink leading-[1.25]">
                {activeItem.title}
              </h2>
              {activeItem.price !== null && (
                <div className="text-[20px] font-semibold text-g-800 mb-2">
                  {formatPrice(activeItem.price)}
                </div>
              )}
              <p className="text-[11px] leading-[1.6] text-g-muted">
                {GALLERY_DESC}
              </p>
              <div className="flex gap-[22px] items-center mt-5 mb-[18px] text-[10.5px] text-g-meta pb-5 border-b border-g-line">
                <span className="inline-flex items-center gap-[7px]">
                  <Icon.HeartFill className="w-[14px] h-[14px] text-g-heart" />
                  <i className="not-italic">{activeItem.likes}</i> Likes
                </span>
                <span className="inline-flex items-center gap-[7px]">
                  <Icon.Eye className="w-[14px] h-[14px]" />
                  <i className="not-italic">{activeItem.views}</i> Views
                </span>
              </div>
              <div className="text-[10.5px] font-semibold text-g-ink mb-[11px]">
                Tags
              </div>
              <div className="flex flex-wrap gap-2 mb-5">
                {GALLERY_TAGS.map((t) => (
                  <span
                    key={t}
                    className="bg-g-tag text-g-ink2 text-[9.5px] px-3 py-[6px] rounded-full"
                  >
                    {t}
                  </span>
                ))}
              </div>
              <a
                href={buildWhatsAppUrl(activeItem)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setModalOpen(false)}
                className="flex items-center justify-center gap-[9px] h-[38px] rounded-lg bg-g-800 text-white text-[12.5px] font-medium hover:bg-g-900 transition-colors"
              >
                <Icon.WhatsApp className="w-[18px] h-[18px]" />
                Get in Touch
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============ APP ============ */
export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/services/:slug" element={<ServicePage />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
      </Routes>
    </>
  );
}