export const ecommerceProducts = [
  {
    id: 1,
    slug: '0-07-volume-fans-mixed-tray',
    name: '0.07 Volume Fans — Mixed Tray',
    marketPrice: 1800,
    nowPrice: 1150,
    note: 'Save Ksh 3,250 on the tray!',
    badge: 'MOQ 5',
    icon: '<path d="M10 60 Q35 40 60 55 Q80 68 95 45" stroke="black" stroke-width="1.5" fill="none"/>',
    description:
      'A soft, lightweight fan set designed for full-volume lash styling with a natural finish. Each tray is curated for quick restocks and smooth, repeatable application across a busy salon schedule.',
    features: [
      'Soft, flexible fan shape for full-volume looks',
      'Low-lint finish for cleaner application',
      'Batch-ready packaging for salon restocks',
    ],
    complements: [2, 5],
  },
  {
    id: 2,
    slug: 'pro-bond-adhesive-5ml',
    name: 'Pro Bond Adhesive, 5ml',
    marketPrice: 2400,
    nowPrice: 1600,
    note: 'Save Ksh 4,000 on the case!',
    badge: 'New',
    icon: '<ellipse cx="50" cy="50" rx="30" ry="12" stroke="black" stroke-width="1.5" fill="none"/>',
    description:
      'A strong, flexible cement built for consistent hold and easy lash customization. It dries cleanly, keeps lashes looking soft, and works beautifully with our volume and classic collections.',
    features: [
      'Strong, long-wear hold with smooth finish',
      'Easy-to-control formula for premium retention',
      'Great pairing with volume fans and patch kits',
    ],
    complements: [1, 3],
  },
  {
    id: 3,
    slug: 'isolation-tweezers-curved',
    name: 'Isolation Tweezers, Curved',
    marketPrice: 1200,
    nowPrice: 780,
    note: 'Save Ksh 2,100 on the set!',
    badge: 'Best Seller',
    icon: '<path d="M20 50 L80 50 M50 20 L50 80" stroke="black" stroke-width="1.5"/>',
    description:
      'Precision curved tweezers designed for isolation and clean lash placement. The slim, ergonomic grip makes every application smoother and more controlled, especially on delicate fan sets.',
    features: [
      'Precision tip for clean isolation work',
      'Comfort grip for longer sessions',
      'Ideal for premium retail and treatment rooms',
    ],
    complements: [2, 6],
  },
  {
    id: 4,
    slug: 'under-eye-gel-patches-bulk',
    name: 'Under-Eye Gel Patches, Bulk',
    marketPrice: 900,
    nowPrice: 560,
    note: 'Save Ksh 1,700 on the pack!',
    badge: 'Bulk',
    icon: '<rect x="25" y="25" width="50" height="50" stroke="black" stroke-width="1.5" fill="none"/>',
    description:
      'Cooling, skin-safe patches that prep the under-eye area before treatment. Perfect for comfort-focused service add-ons and easy self-care retail upsells.',
    features: [
      'Cooling effect for a more comfortable service',
      'Low-irritation fit with soft texture',
      'Perfect add-on for retail and treatment bundles',
    ],
    complements: [5, 6],
  },
  {
    id: 5,
    slug: 'mega-volume-fans-0-05',
    name: 'Mega Volume Fans — 0.05',
    marketPrice: 2000,
    nowPrice: 1300,
    note: 'Just landed this batch',
    badge: 'New In',
    icon: '<path d="M15 55 Q50 30 85 55" stroke="black" stroke-width="1.5" fill="none"/>',
    description:
      'The lighter, fluffier alternative for dramatic volume without excessive weight. These fans are ideal for stylists who want soft dimension and a glossy finish at the same time.',
    features: [
      'Ultra-light fan texture for soft volume',
      'Clean finish to support premium lash artistry',
      'Ideal for salon teams stocking a premium range',
    ],
    complements: [1, 2],
  },
  {
    id: 6,
    slug: 'low-fume-primer-10ml',
    name: 'Low-Fume Primer, 10ml',
    marketPrice: 1600,
    nowPrice: 990,
    note: 'Just landed this batch',
    badge: 'New In',
    icon: '<circle cx="50" cy="50" r="28" stroke="black" stroke-width="1.5" fill="none"/>',
    description:
      'A low-fume prep layer that helps create a smoother application and improved bond feel. Designed for clients who prefer a cleaner, more comfortable service experience.',
    features: [
      'Low-fume formula for a more comfortable room',
      'Helps prep for cleaner, more even application',
      'Works well with premium volume and classic sets',
    ],
    complements: [3, 4],
  },
];

export const productIndex = Object.fromEntries(
  ecommerceProducts.map((product) => [product.slug, product])
);

export function formatKsh(value) {
  return `Ksh ${Number(value || 0).toLocaleString()}`;
}
