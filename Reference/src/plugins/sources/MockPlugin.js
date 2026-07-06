import { BasePlugin } from '../base/BasePlugin'

/**
 * MockPlugin — built-in demo plugin using curated outfit imagery.
 * Active by default; no API key required.
 * Images represent a diverse range of people, body types, ages, and styles.
 */
export class MockPlugin extends BasePlugin {
  constructor() {
    super()
    this.name = 'mock'
    this.displayName = 'Editorial'
    this.icon = '✦'
    this.enabled = true
  }

  async fetchInspiration(occasion) {
    await new Promise(r => setTimeout(r, 900))
    const pool = this._getImagePool(occasion)
    const shuffled = [...pool].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, 20).map(item => this.formatItem(item))
  }

  _getImagePool(occasion) {
    const type = (occasion?.type || '').toLowerCase()
    const dress = (occasion?.dressCode || '').toLowerCase()

    const allItems = [
      // ── Formal / Black Tie ──────────────────────────────────────────────────
      {
        id: 'f1',
        imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=500&h=700&fit=crop&crop=top',
        title: 'Classic Evening Look',
        tags: ['formal', 'gown', 'black tie', 'evening'],
        credit: 'Unsplash',
        aspectRatio: 0.71,
        occasion: ['black tie', 'formal', 'gala'],
      },
      {
        id: 'f2',
        imageUrl: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=500&h=700&fit=crop&crop=top',
        title: 'Silk Slip Dress',
        tags: ['formal', 'silk', 'evening', 'elegant'],
        credit: 'Unsplash',
        aspectRatio: 0.71,
        occasion: ['black tie', 'cocktail', 'formal'],
      },
      {
        id: 'f3',
        imageUrl: 'https://images.unsplash.com/photo-1613482184972-f9b1e7a5f7f7?w=500&h=700&fit=crop&crop=top',
        title: 'Gala-Ready Gown',
        tags: ['gown', 'gala', 'black tie', 'sequin'],
        credit: 'Unsplash',
        aspectRatio: 0.71,
        occasion: ['gala', 'black tie', 'formal'],
      },
      {
        id: 'f4',
        imageUrl: 'https://images.unsplash.com/photo-1502716119720-b23a93e5fe1b?w=500&h=700&fit=crop&crop=top',
        title: 'Bridal Elegance',
        tags: ['white', 'bridal', 'wedding', 'formal'],
        credit: 'Unsplash',
        aspectRatio: 0.71,
        occasion: ['wedding', 'black tie', 'formal'],
      },

      // ── Diverse Formal: Black Women ─────────────────────────────────────────
      {
        id: 'd1',
        imageUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=500&h=700&fit=crop&crop=top',
        title: 'Powerful in Black',
        tags: ['formal', 'evening', 'elegant', 'black woman'],
        credit: 'Unsplash',
        aspectRatio: 0.71,
        occasion: ['gala', 'cocktail', 'black tie', 'formal', 'date'],
      },
      {
        id: 'd2',
        imageUrl: 'https://images.unsplash.com/photo-1580499337486-bf5cd3b2c14a?w=500&h=700&fit=crop&crop=top',
        title: 'Editorial Chic',
        tags: ['editorial', 'chic', 'black woman', 'fashion'],
        credit: 'Unsplash',
        aspectRatio: 0.71,
        occasion: ['cocktail', 'date', 'smart casual'],
      },
      {
        id: 'd3',
        imageUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=500&h=700&fit=crop&crop=top',
        title: 'Bold & Refined',
        tags: ['formal', 'elegant', 'black woman', 'evening'],
        credit: 'Unsplash',
        aspectRatio: 0.71,
        occasion: ['formal', 'wedding', 'cocktail'],
      },
      {
        id: 'd4',
        imageUrl: 'https://images.unsplash.com/photo-1596816397616-e27a9f15fc5c?w=500&h=700&fit=crop&crop=top',
        title: 'Melanin & Style',
        tags: ['casual', 'chic', 'black woman', 'street style'],
        credit: 'Unsplash',
        aspectRatio: 0.71,
        occasion: ['casual', 'brunch', 'smart casual'],
      },

      // ── Diverse Formal: Asian Women ─────────────────────────────────────────
      {
        id: 'd5',
        imageUrl: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=500&h=700&fit=crop&crop=top',
        title: 'Minimalist Asian Chic',
        tags: ['minimalist', 'modern', 'asian', 'chic'],
        credit: 'Unsplash',
        aspectRatio: 0.71,
        occasion: ['business', 'smart casual', 'cocktail'],
      },
      {
        id: 'd6',
        imageUrl: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=500&h=700&fit=crop&crop=top',
        title: 'East Meets West',
        tags: ['fashion', 'asian', 'contemporary', 'chic'],
        credit: 'Unsplash',
        aspectRatio: 0.71,
        occasion: ['cocktail', 'date', 'casual'],
      },
      {
        id: 'd7',
        imageUrl: 'https://images.unsplash.com/photo-1603217192634-61068e4d4bf9?w=500&h=700&fit=crop&crop=top',
        title: 'Street Style Seoul',
        tags: ['street style', 'asian', 'casual', 'trendy'],
        credit: 'Unsplash',
        aspectRatio: 0.71,
        occasion: ['casual', 'concert', 'brunch'],
      },

      // ── Diverse: Latina / Hispanic ──────────────────────────────────────────
      {
        id: 'd8',
        imageUrl: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=500&h=700&fit=crop&crop=top',
        title: 'Vibrant & Confident',
        tags: ['colorful', 'latina', 'elegant', 'evening'],
        credit: 'Unsplash',
        aspectRatio: 0.71,
        occasion: ['cocktail', 'date', 'formal'],
      },

      // ── Diverse: Plus Size Fashion ──────────────────────────────────────────
      {
        id: 'd9',
        imageUrl: 'https://images.unsplash.com/photo-1567456668659-4fd47b8c6ae0?w=500&h=700&fit=crop&crop=top',
        title: 'Curve Confidence',
        tags: ['plus size', 'confident', 'fashion', 'inclusive'],
        credit: 'Unsplash',
        aspectRatio: 0.71,
        occasion: ['casual', 'brunch', 'smart casual', 'cocktail'],
      },
      {
        id: 'd10',
        imageUrl: 'https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=500&h=700&fit=crop&crop=top',
        title: 'Bold Curves, Bold Style',
        tags: ['plus size', 'inclusive', 'chic', 'evening'],
        credit: 'Unsplash',
        aspectRatio: 0.71,
        occasion: ['cocktail', 'formal', 'date'],
      },

      // ── Diverse: Mature / Older Adults ─────────────────────────────────────
      {
        id: 'd11',
        imageUrl: 'https://images.unsplash.com/photo-1567168544813-cc03465b4fa8?w=500&h=700&fit=crop&crop=top',
        title: 'Age Is Just a Number',
        tags: ['mature', 'elegant', 'timeless', 'classic'],
        credit: 'Unsplash',
        aspectRatio: 0.71,
        occasion: ['formal', 'wedding', 'cocktail', 'brunch'],
      },
      {
        id: 'd12',
        imageUrl: 'https://images.unsplash.com/photo-1556742393-d75f468bfcb0?w=500&h=700&fit=crop&crop=top',
        title: 'Timeless Sophistication',
        tags: ['mature', 'sophisticated', 'classic', 'elegant'],
        credit: 'Unsplash',
        aspectRatio: 0.71,
        occasion: ['formal', 'gala', 'cocktail'],
      },

      // ── Diverse: South Asian / Modest Fashion ──────────────────────────────
      {
        id: 'd13',
        imageUrl: 'https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?w=500&h=700&fit=crop&crop=top',
        title: 'Modern Modest',
        tags: ['modest fashion', 'south asian', 'elegant', 'contemporary'],
        credit: 'Unsplash',
        aspectRatio: 0.71,
        occasion: ['formal', 'wedding', 'smart casual'],
      },

      // ── Diverse: Men of Color ───────────────────────────────────────────────
      {
        id: 'd14',
        imageUrl: 'https://images.unsplash.com/photo-1614093302611-8efc4dd56082?w=500&h=700&fit=crop&crop=top',
        title: 'Dapper in Colour',
        tags: ['menswear', 'black man', 'suit', 'formal'],
        credit: 'Unsplash',
        aspectRatio: 0.71,
        occasion: ['business', 'formal', 'wedding', 'black tie'],
      },
      {
        id: 'd15',
        imageUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=500&h=700&fit=crop&crop=top',
        title: 'Sharply Dressed',
        tags: ['menswear', 'suit', 'smart', 'formal'],
        credit: 'Unsplash',
        aspectRatio: 0.71,
        occasion: ['business', 'wedding', 'formal', 'cocktail'],
      },

      // ── Business / Work ─────────────────────────────────────────────────────
      {
        id: 'f5',
        imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&h=650&fit=crop&crop=top',
        title: 'Polished Work Attire',
        tags: ['business', 'office', 'professional', 'blazer'],
        credit: 'Unsplash',
        aspectRatio: 0.77,
        occasion: ['business', 'work', 'corporate'],
      },
      {
        id: 'f11',
        imageUrl: 'https://images.unsplash.com/photo-1544441893-675973e31985?w=500&h=700&fit=crop&crop=top',
        title: 'Power Dressing',
        tags: ['business', 'power suit', 'professional', 'blazer'],
        credit: 'Unsplash',
        aspectRatio: 0.71,
        occasion: ['business', 'work', 'meeting'],
      },
      {
        id: 'f18',
        imageUrl: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=500&h=700&fit=crop&crop=top',
        title: 'White Shirt Moment',
        tags: ['business casual', 'white shirt', 'classic', 'office'],
        credit: 'Unsplash',
        aspectRatio: 0.71,
        occasion: ['business casual', 'work', 'meeting'],
      },
      {
        id: 'f21',
        imageUrl: 'https://images.unsplash.com/photo-1566206091558-7f218b696731?w=500&h=700&fit=crop&crop=top',
        title: 'Navy Suit Edit',
        tags: ['suit', 'navy', 'formal', 'business'],
        credit: 'Unsplash',
        aspectRatio: 0.71,
        occasion: ['business', 'formal', 'cocktail', 'wedding'],
      },

      // ── Cocktail / Date Night ───────────────────────────────────────────────
      {
        id: 'f3b',
        imageUrl: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=500&h=700&fit=crop&crop=top',
        title: 'Monochrome Statement',
        tags: ['editorial', 'modern', 'street style'],
        credit: 'Unsplash',
        aspectRatio: 0.71,
        occasion: ['cocktail', 'smart casual', 'date'],
      },
      {
        id: 'f9',
        imageUrl: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=500&h=700&fit=crop&crop=top',
        title: 'Cocktail Hour',
        tags: ['cocktail', 'evening', 'party', 'chic'],
        credit: 'Unsplash',
        aspectRatio: 0.71,
        occasion: ['cocktail', 'party', 'date'],
      },
      {
        id: 'f14',
        imageUrl: 'https://images.unsplash.com/photo-1611042553484-d61f84d22784?w=500&h=700&fit=crop&crop=top',
        title: 'Date Night Essential',
        tags: ['date night', 'evening', 'romantic', 'chic'],
        credit: 'Unsplash',
        aspectRatio: 0.71,
        occasion: ['date', 'cocktail', 'dinner'],
      },
      {
        id: 'f22',
        imageUrl: 'https://images.unsplash.com/photo-1571513722275-4b41940f54b8?w=500&h=750&fit=crop&crop=top',
        title: 'All Black Uniform',
        tags: ['all black', 'monochrome', 'chic', 'versatile'],
        credit: 'Unsplash',
        aspectRatio: 0.67,
        occasion: ['cocktail', 'date', 'night out', 'concert'],
      },

      // ── Casual / Smart Casual ───────────────────────────────────────────────
      {
        id: 'f4b',
        imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=500&h=750&fit=crop&crop=top',
        title: 'Shopping Day Chic',
        tags: ['casual', 'smart casual', 'daytime'],
        credit: 'Unsplash',
        aspectRatio: 0.67,
        occasion: ['casual', 'smart casual'],
      },
      {
        id: 'f7',
        imageUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500&h=750&fit=crop&crop=top',
        title: 'Street Style Edit',
        tags: ['street style', 'casual', 'urban', 'trendy'],
        credit: 'Unsplash',
        aspectRatio: 0.67,
        occasion: ['casual', 'concert', 'smart casual'],
      },
      {
        id: 'f12',
        imageUrl: 'https://images.unsplash.com/photo-1532453288672-3a17f2e6ad51?w=500&h=700&fit=crop&crop=top',
        title: 'Minimalist Edit',
        tags: ['minimalist', 'neutral', 'smart casual', 'modern'],
        credit: 'Unsplash',
        aspectRatio: 0.71,
        occasion: ['smart casual', 'casual', 'date'],
      },
      {
        id: 'f19',
        imageUrl: 'https://images.unsplash.com/photo-1462804993656-fac4ff489837?w=500&h=700&fit=crop&crop=top',
        title: 'Concert Vibes',
        tags: ['concert', 'night out', 'edgy', 'casual'],
        credit: 'Unsplash',
        aspectRatio: 0.71,
        occasion: ['concert', 'casual', 'night out'],
      },

      // ── Wedding / Garden Party ──────────────────────────────────────────────
      {
        id: 'f8',
        imageUrl: 'https://images.unsplash.com/photo-1487222099582-18f1e0afd1c5?w=500&h=700&fit=crop',
        title: 'Winter Wedding Guest',
        tags: ['wedding', 'winter', 'formal', 'elegant'],
        credit: 'Unsplash',
        aspectRatio: 0.71,
        occasion: ['wedding', 'formal', 'black tie'],
      },
      {
        id: 'f10',
        imageUrl: 'https://images.unsplash.com/photo-1562572159-4efd90a0a6c5?w=500&h=700&fit=crop&crop=top',
        title: 'Garden Party Ready',
        tags: ['garden party', 'spring', 'floral', 'feminine'],
        credit: 'Unsplash',
        aspectRatio: 0.71,
        occasion: ['wedding', 'garden party', 'brunch'],
      },
      {
        id: 'f20',
        imageUrl: 'https://images.unsplash.com/photo-1548175601-8eb5f7f0ab94?w=500&h=700&fit=crop&crop=top',
        title: 'Floral Summer Dress',
        tags: ['floral', 'summer', 'feminine', 'casual'],
        credit: 'Unsplash',
        aspectRatio: 0.71,
        occasion: ['brunch', 'garden party', 'casual', 'wedding guest'],
      },

      // ── Brunch / Casual ─────────────────────────────────────────────────────
      {
        id: 'f15',
        imageUrl: 'https://images.unsplash.com/photo-1572635196184-84e35138cf62?w=500&h=700&fit=crop&crop=top',
        title: 'Sunglasses & Style',
        tags: ['summer', 'casual', 'accessories', 'daytime'],
        credit: 'Unsplash',
        aspectRatio: 0.71,
        occasion: ['vacation', 'casual', 'brunch'],
      },
      {
        id: 'f16',
        imageUrl: 'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=500&h=750&fit=crop&crop=top',
        title: 'Sunday Brunch',
        tags: ['brunch', 'casual', 'spring', 'relaxed'],
        credit: 'Unsplash',
        aspectRatio: 0.67,
        occasion: ['brunch', 'casual', 'smart casual'],
      },
      {
        id: 'f23',
        imageUrl: 'https://images.unsplash.com/photo-1504198453119-5047050c6b9a?w=500&h=700&fit=crop&crop=top',
        title: 'Countryside Weekend',
        tags: ['countryside', 'weekend', 'relaxed', 'casual'],
        credit: 'Unsplash',
        aspectRatio: 0.71,
        occasion: ['casual', 'outdoor', 'weekend'],
      },

      // ── Beach / Vacation ────────────────────────────────────────────────────
      {
        id: 'f6',
        imageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=500&h=700&fit=crop&crop=top',
        title: 'Effortless Resort',
        tags: ['beach', 'vacation', 'summer', 'resort'],
        credit: 'Unsplash',
        aspectRatio: 0.71,
        occasion: ['vacation', 'beach', 'casual'],
      },

      // ── Seasonal ─────────────────────────────────────────────────────────────
      {
        id: 'f17',
        imageUrl: 'https://images.unsplash.com/photo-1550614000-4895a10e1bfd?w=500&h=700&fit=crop&crop=top',
        title: 'Autumn Layering',
        tags: ['fall', 'autumn', 'layers', 'coat'],
        credit: 'Unsplash',
        aspectRatio: 0.71,
        occasion: ['casual', 'smart casual', 'meeting'],
      },
    ]

    const keywords = [type, dress, ...(occasion?.tags || [])].map(k => k.toLowerCase())

    const scored = allItems.map(item => {
      let score = 0
      item.occasion.forEach(o => {
        if (keywords.some(k => o.includes(k) || k.includes(o))) score += 3
      })
      item.tags.forEach(t => {
        if (keywords.some(k => t.includes(k) || k.includes(t))) score += 1
      })
      return { ...item, score }
    })

    return scored.sort((a, b) => b.score - a.score)
  }
}
