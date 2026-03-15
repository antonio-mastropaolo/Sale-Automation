import { NextRequest, NextResponse } from "next/server";
import { getAIClient } from "@/lib/settings";
import { parseAIJson } from "@/lib/ai-utils";
import { tokenParams } from "@/lib/ai";

// ── Per-platform fallback trend data ─────────────────────────

const FALLBACKS: Record<string, {
  trendingCategories: { name: string; heat: number; description: string }[];
  trendingBrands: { name: string; heat: number; description: string }[];
  hotItems: { name: string; priceRange: string; description: string }[];
  sleeperPicks: { name: string; reasoning: string; estimatedROI: string }[];
  platformStrategy: string;
}> = {
  depop: {
    trendingCategories: [
      { name: "Y2K Fashion", heat: 95, description: "Low-rise jeans, baby tees, and butterfly tops dominate Depop's Gen-Z audience." },
      { name: "Vintage Band Tees", heat: 88, description: "90s/2000s concert tees with faded graphics sell fast on Depop." },
      { name: "Streetwear", heat: 85, description: "Nike, Stussy, Carhartt — casual streetwear is Depop's bread and butter." },
      { name: "Fairy/Cottagecore", heat: 78, description: "Flowy dresses, lace tops, and whimsical aesthetics trending on Depop." },
      { name: "Vintage Sportswear", heat: 72, description: "Retro Adidas, Nike tracksuits, and vintage jerseys." },
    ],
    trendingBrands: [
      { name: "Nike", heat: 92, description: "Dunks, vintage windbreakers, and Tech Fleece dominate Depop search." },
      { name: "Brandy Melville", heat: 88, description: "One-size fits all pieces are hugely popular with Depop's core audience." },
      { name: "Carhartt WIP", heat: 82, description: "Workwear-meets-streetwear continues to trend on Depop." },
      { name: "Stussy", heat: 78, description: "Classic streetwear brand with strong Depop resale demand." },
      { name: "Urban Outfitters", heat: 74, description: "Vintage UO pieces and BDG denim perform well." },
    ],
    hotItems: [
      { name: "Nike Dunk Low", priceRange: "$90-$180", description: "The most searched sneaker on Depop — Panda colorway leads." },
      { name: "Vintage Levi's 501", priceRange: "$60-$150", description: "High-waisted vintage denim is a Depop staple." },
      { name: "Carhartt WIP Vest", priceRange: "$80-$130", description: "The workwear vest trend is huge on Depop." },
      { name: "Y2K Mini Shoulder Bag", priceRange: "$20-$60", description: "Small bags in bright colors fly off Depop." },
      { name: "Vintage Nike Windbreaker", priceRange: "$40-$90", description: "Colorblock 90s windbreakers are a top seller." },
    ],
    sleeperPicks: [
      { name: "Vintage Polo Ralph Lauren", reasoning: "Quiet luxury trend is bringing preppy brands to Depop's young audience", estimatedROI: "40-60%" },
      { name: "2000s Ed Hardy Tees", reasoning: "Y2K nostalgia wave is reaching the 2000s maximalist era", estimatedROI: "50-80%" },
      { name: "Vintage Dickies", reasoning: "Workwear trend expanding beyond Carhartt", estimatedROI: "30-50%" },
    ],
    platformStrategy: "On Depop, aesthetic flat-lay photos and trendy styling sell items. Refresh your listings daily for algorithm boost. Use 5 relevant hashtags max. Price competitively — Depop buyers are deal-hunters. Y2K and vintage streetwear perform best.",
  },
  grailed: {
    trendingCategories: [
      { name: "Archive Fashion", heat: 95, description: "Helmut Lang, Raf Simons, early Margiela — archive pieces command top dollar on Grailed." },
      { name: "Japanese Streetwear", heat: 90, description: "Kapital, Undercover, Comme des Garçons — Japanese brands are Grailed's sweet spot." },
      { name: "Designer Outerwear", heat: 85, description: "High-end jackets from Rick Owens, Balenciaga, and Stone Island." },
      { name: "Luxury Denim", heat: 78, description: "APC, Acne Studios, and vintage Helmut Lang denim." },
      { name: "Avant-Garde", heat: 74, description: "Rick Owens, Julius, Boris Bidjan Saberi — dark aesthetic pieces." },
    ],
    trendingBrands: [
      { name: "Rick Owens", heat: 95, description: "Ramones, Geobaskets, and drkshdw pieces are the top sellers on Grailed." },
      { name: "Kapital", heat: 90, description: "Japanese patchwork and boro denim are highly sought after." },
      { name: "Maison Margiela", heat: 88, description: "Tabi boots and deconstructed pieces command premium prices." },
      { name: "Stone Island", heat: 82, description: "Technical outerwear with the badge continues strong." },
      { name: "Helmut Lang", heat: 78, description: "Late 90s/early 2000s archive pieces are appreciating fast." },
    ],
    hotItems: [
      { name: "Rick Owens Ramones", priceRange: "$300-$600", description: "The iconic high-top sneaker — black leather is most liquid." },
      { name: "Kapital Bandana Patchwork Jacket", priceRange: "$400-$800", description: "Unique Japanese craftsmanship with cult following." },
      { name: "Maison Margiela Tabi Boots", priceRange: "$400-$700", description: "Split-toe boots in black leather are grails." },
      { name: "Stone Island Overshirt", priceRange: "$200-$400", description: "Garment-dyed overshirts with badge." },
      { name: "Helmut Lang Painter Jeans", priceRange: "$150-$350", description: "90s archive denim appreciating rapidly." },
    ],
    sleeperPicks: [
      { name: "Early Acne Studios", reasoning: "Pre-2015 Acne pieces are undervalued compared to similar Scandi archive", estimatedROI: "35-55%" },
      { name: "Issey Miyake Pleats Please", reasoning: "Quiet luxury + archive interest driving prices up", estimatedROI: "30-50%" },
      { name: "Dries Van Noten Prints", reasoning: "Floral and abstract prints gaining traction in menswear circles", estimatedROI: "25-45%" },
    ],
    platformStrategy: "Grailed rewards detailed descriptions with exact measurements, fabric composition, and condition notes. Professional photography on neutral backgrounds. Price firm initially — Grailed buyers respect confident pricing. Bump listings every 7 days. Remember: prices can only go DOWN on existing listings.",
  },
  poshmark: {
    trendingCategories: [
      { name: "Contemporary Women's", heat: 92, description: "Free People, Anthropologie, and Madewell are Poshmark's bread and butter." },
      { name: "Athleisure", heat: 88, description: "Lululemon, Alo Yoga, and Nike training pieces sell fastest on Poshmark." },
      { name: "Designer Bags", heat: 85, description: "Coach, Kate Spade, and Tory Burch bags are Poshmark staples." },
      { name: "Plus Size Fashion", heat: 80, description: "Torrid, Lane Bryant — plus size has strong demand on Poshmark." },
      { name: "Wedding & Formal", heat: 75, description: "BHLDN, David's Bridal — seasonal wedding pieces sell well." },
    ],
    trendingBrands: [
      { name: "Lululemon", heat: 95, description: "Align leggings and Define jackets have the fastest sell-through on Poshmark." },
      { name: "Free People", heat: 88, description: "Boho dresses and movement pieces are always in demand." },
      { name: "Anthropologie", heat: 82, description: "Unique prints and quality basics perform well." },
      { name: "Tory Burch", heat: 78, description: "Bags and flats are steady sellers on Poshmark." },
      { name: "Nike", heat: 75, description: "Air Max and Dunks sell well in women's sizes." },
    ],
    hotItems: [
      { name: "Lululemon Align Leggings", priceRange: "$50-$85", description: "25\" and 28\" in neutral colors sell within days." },
      { name: "Free People Movement Top", priceRange: "$25-$50", description: "Athletic tops with the boho aesthetic." },
      { name: "Coach Tabby Bag", priceRange: "$150-$280", description: "The it-bag for Poshmark's audience." },
      { name: "Madewell Transport Tote", priceRange: "$60-$100", description: "Classic leather tote with strong resale." },
      { name: "Anthropologie Maxi Dress", priceRange: "$40-$80", description: "Printed maxi dresses for spring/summer." },
    ],
    sleeperPicks: [
      { name: "Vuori Activewear", reasoning: "Premium athleisure brand growing fast, still underpriced on resale", estimatedROI: "35-55%" },
      { name: "Vintage Coach", reasoning: "Y2K interest in vintage Coach bags is rising fast", estimatedROI: "40-70%" },
      { name: "Skims Basics", reasoning: "Celebrity brand with high demand, limited resale supply", estimatedROI: "25-45%" },
    ],
    platformStrategy: "Share your closet 3x daily — Poshmark's algorithm rewards active sharing. Send Offers to Likers with 10%+ discount and shipping discount. Join Posh Parties to get exposure. Bundle discounts drive higher AOV. Friendly, enthusiastic descriptions with styling tips work best.",
  },
  mercari: {
    trendingCategories: [
      { name: "Sneakers", heat: 90, description: "Jordan, Nike Dunk, New Balance — sneakers move fast on Mercari's price-conscious audience." },
      { name: "Electronics Accessories", heat: 85, description: "AirPods cases, phone accessories, and cables sell surprisingly well." },
      { name: "Kids' Clothing Bundles", heat: 80, description: "Bundled kids' clothes by size are Mercari money-makers." },
      { name: "Home & Kitchen", heat: 78, description: "Kitchen gadgets, home decor, and organization items." },
      { name: "Video Games", heat: 75, description: "Retro games and current-gen titles with competitive pricing." },
    ],
    trendingBrands: [
      { name: "Nike", heat: 90, description: "Most searched brand on Mercari — sneakers and apparel." },
      { name: "Nintendo", heat: 85, description: "Switch games and accessories have strong Mercari demand." },
      { name: "The North Face", heat: 80, description: "Puffers and fleece jackets sell fast in fall/winter." },
      { name: "Dyson", heat: 78, description: "Used Dyson products command premium prices on Mercari." },
      { name: "New Balance", heat: 75, description: "990 and 2002R models are consistently selling." },
    ],
    hotItems: [
      { name: "Jordan 4 Retro", priceRange: "$180-$300", description: "Various colorways are Mercari's top-selling sneaker." },
      { name: "AirPods Pro 2", priceRange: "$120-$180", description: "Used AirPods with case sell quickly." },
      { name: "North Face Nuptse 700", priceRange: "$150-$250", description: "The puffer jacket of choice on Mercari." },
      { name: "Nintendo Switch OLED", priceRange: "$220-$300", description: "Used consoles with games bundled." },
      { name: "New Balance 990v6", priceRange: "$100-$180", description: "The dad shoe trend keeps these selling." },
    ],
    sleeperPicks: [
      { name: "Stanley Tumblers (limited)", reasoning: "Limited edition Stanley cups resell for 2-3x on Mercari", estimatedROI: "50-100%" },
      { name: "Vintage Starter Jackets", reasoning: "Sports nostalgia trend pushing prices up", estimatedROI: "40-60%" },
      { name: "Hoka Sneakers", reasoning: "Growing brand with limited resale competition", estimatedROI: "25-40%" },
    ],
    platformStrategy: "Price 10-15% below competitors — Mercari buyers compare heavily. Use Smart Pricing with a floor price to auto-decrement. Promote listings with a 5%+ drop for search boost. Fast shipping rating matters — ship within 24 hours. Clean, factual descriptions with measurements work best.",
  },
  ebay: {
    trendingCategories: [
      { name: "Vintage Watches", heat: 92, description: "Seiko, Casio, and vintage Swiss watches have massive eBay demand." },
      { name: "Trading Cards", heat: 88, description: "Pokemon, sports cards, and MTG continue to drive eBay volume." },
      { name: "Vintage Electronics", heat: 82, description: "iPods, retro gaming, and vintage audio equipment." },
      { name: "Auto Parts", heat: 80, description: "OEM parts, performance upgrades — eBay's largest category." },
      { name: "Vintage Clothing", heat: 78, description: "Band tees, vintage sportswear, and workwear." },
    ],
    trendingBrands: [
      { name: "Apple", heat: 92, description: "iPhones, AirPods, MacBooks — Apple dominates eBay electronics." },
      { name: "Rolex", heat: 88, description: "Even parts and accessories for Rolex sell well on eBay." },
      { name: "Pokemon", heat: 85, description: "Sealed products and graded cards command premiums." },
      { name: "LEGO", heat: 82, description: "Retired sets appreciate significantly — eBay is the main market." },
      { name: "Patagonia", heat: 78, description: "Vintage and current Patagonia outerwear sells consistently." },
    ],
    hotItems: [
      { name: "Pokemon Booster Box (Sealed)", priceRange: "$150-$500", description: "Sealed vintage sets appreciate monthly." },
      { name: "Apple AirPods Max", priceRange: "$300-$450", description: "Premium headphones with steady eBay demand." },
      { name: "Vintage Seiko Diver", priceRange: "$100-$400", description: "SKX007 and turtle models are collector favorites." },
      { name: "LEGO Star Wars UCS Set", priceRange: "$200-$800", description: "Retired UCS sets are eBay gold." },
      { name: "Retro iPod Classic", priceRange: "$80-$250", description: "Nostalgia-driven demand for working iPods." },
    ],
    sleeperPicks: [
      { name: "Vintage Pyrex", reasoning: "Vintage kitchenware collecting is booming — rare patterns sell for hundreds", estimatedROI: "50-100%" },
      { name: "Vintage Casio Watches", reasoning: "Affordable vintage watches are the next wave after Seiko", estimatedROI: "30-60%" },
      { name: "Sealed VHS Tapes", reasoning: "Nostalgia collecting market growing — Disney Black Diamond tapes", estimatedROI: "40-80%" },
    ],
    platformStrategy: "eBay rewards keyword-stuffed titles (80 chars max) and detailed item specifics. Use promoted listings at 2-5% for visibility. Enable Best Offer on fixed-price listings. Free shipping converts better. Sunday evening 7-10pm is peak buying time. Auction format works for rare/unique items.",
  },
  vinted: {
    trendingCategories: [
      { name: "Zara & H&M", heat: 90, description: "Fast fashion resale is Vinted's sweet spot — no seller fees makes it viable." },
      { name: "Kids' Clothing", heat: 85, description: "Children's clothes in bundles sell extremely well on Vinted." },
      { name: "Basics & Essentials", heat: 82, description: "Plain tees, jeans, and everyday basics move fast." },
      { name: "Sports & Outdoor", heat: 78, description: "Decathlon, Nike, Adidas — affordable sportswear." },
      { name: "Vintage", heat: 75, description: "Vintage pieces at affordable prices find European buyers." },
    ],
    trendingBrands: [
      { name: "Zara", heat: 92, description: "Most searched brand on Vinted across all European markets." },
      { name: "Nike", heat: 88, description: "Sneakers and sportswear are universal sellers." },
      { name: "Adidas", heat: 82, description: "Originals and performance pieces sell well." },
      { name: "The North Face", heat: 78, description: "Puffers are hugely popular on European Vinted." },
      { name: "Mango", heat: 74, description: "European mid-range brand with strong Vinted presence." },
    ],
    hotItems: [
      { name: "Zara Leather Jacket", priceRange: "€30-€60", description: "Faux leather jackets are Vinted's top seller." },
      { name: "Nike Air Force 1", priceRange: "€50-€90", description: "Clean pairs sell within hours on Vinted." },
      { name: "North Face Nuptse", priceRange: "€100-€180", description: "Puffer jackets are gold in European winter." },
      { name: "Adidas Samba", priceRange: "€40-€80", description: "The trendy sneaker of the moment." },
      { name: "Levi's 501 (Vintage)", priceRange: "€30-€70", description: "Vintage denim at affordable Vinted prices." },
    ],
    sleeperPicks: [
      { name: "COS Basics", reasoning: "Minimalist Scandi brand growing in resale value on Vinted", estimatedROI: "30-50%" },
      { name: "Salomon XT-6", reasoning: "Gorpcore trend driving trail runners to fashion status in EU", estimatedROI: "25-45%" },
      { name: "Vintage Burberry Scarves", reasoning: "Classic check pattern always in demand at right price point", estimatedROI: "35-55%" },
    ],
    platformStrategy: "Vinted has NO seller fees — price competitively. Good photos are essential (Vinted's algorithm favors them). Short, honest descriptions in local language. Use EU sizing. Ship within 48 hours for good ratings. Bump listings every few days for visibility.",
  },
  facebook: {
    trendingCategories: [
      { name: "Furniture", heat: 92, description: "Facebook Marketplace is the #1 place for local furniture sales." },
      { name: "Baby & Kids", heat: 88, description: "Strollers, car seats, and kids' toys sell instantly locally." },
      { name: "Tools & Equipment", heat: 82, description: "Power tools and garage equipment have massive local demand." },
      { name: "Sports Equipment", heat: 78, description: "Bikes, gym equipment, and outdoor gear." },
      { name: "Clothing Bundles", heat: 74, description: "Bulk clothing lots by size/gender for deal hunters." },
    ],
    trendingBrands: [
      { name: "IKEA", heat: 90, description: "Used IKEA furniture sells for 40-60% of retail on FB Marketplace." },
      { name: "Apple", heat: 85, description: "iPhones, iPads, and MacBooks — always in demand locally." },
      { name: "Peloton", heat: 80, description: "Used Pelotons sell fast as people upgrade or declutter." },
      { name: "Weber", heat: 75, description: "Grills and outdoor cooking equipment — seasonal gold." },
      { name: "Pottery Barn", heat: 72, description: "Quality home furnishings hold resale value well." },
    ],
    hotItems: [
      { name: "Mid-Century Modern Dresser", priceRange: "$100-$400", description: "MCM furniture is FB Marketplace gold." },
      { name: "iPhone (Previous Gen)", priceRange: "$200-$500", description: "1-2 generation old iPhones sell within hours." },
      { name: "Peloton Bike", priceRange: "$500-$900", description: "Massive depreciation = great local flip." },
      { name: "Kids' Bike", priceRange: "$30-$100", description: "Growing kids means constant turnover." },
      { name: "Power Tools Bundle", priceRange: "$50-$200", description: "DeWalt and Milwaukee tools are always wanted." },
    ],
    sleeperPicks: [
      { name: "Vintage Rugs", reasoning: "Interior design trend driving rug prices up — source cheap at estate sales", estimatedROI: "50-100%" },
      { name: "Electric Scooters", reasoning: "Urban transport demand growing, good margins on used scooters", estimatedROI: "30-50%" },
      { name: "Standing Desks", reasoning: "WFH trend still strong — used standing desks sell fast locally", estimatedROI: "25-40%" },
    ],
    platformStrategy: "Facebook Marketplace is LOCAL first — mention pickup availability and neighborhood. Respond to messages within 1 hour (algorithm rewards fast replies). Price 15-20% below retail for fast sales. Use all 10 photo slots. Cross-post to local Buy/Sell groups for more reach. No fees = pure profit.",
  },
  vestiaire: {
    trendingCategories: [
      { name: "Luxury Bags", heat: 95, description: "Chanel, Hermès, Louis Vuitton bags are Vestiaire's core market." },
      { name: "Designer Shoes", heat: 88, description: "Louboutin, Manolo Blahnik, and designer sneakers." },
      { name: "Fine Jewelry", heat: 82, description: "Cartier, Tiffany, and Van Cleef pieces appreciate on Vestiaire." },
      { name: "Luxury Outerwear", heat: 78, description: "Max Mara coats, Burberry trench coats — timeless luxury." },
      { name: "Watches", heat: 75, description: "Pre-owned luxury watches with authentication." },
    ],
    trendingBrands: [
      { name: "Chanel", heat: 95, description: "Classic Flap bags and tweed jackets are Vestiaire's top sellers." },
      { name: "Hermès", heat: 92, description: "Birkin and Kelly bags — the ultimate investment pieces." },
      { name: "Louis Vuitton", heat: 85, description: "Monogram and Damier pieces have steady demand." },
      { name: "Celine", heat: 80, description: "Phoebe Philo-era pieces command huge premiums." },
      { name: "Bottega Veneta", heat: 78, description: "Intrecciato leather goods and Pouch bags trending." },
    ],
    hotItems: [
      { name: "Chanel Classic Flap Medium", priceRange: "$5,000-$8,000", description: "The most sought-after bag on Vestiaire." },
      { name: "Hermès Birkin 30", priceRange: "$8,000-$15,000", description: "Investment-grade luxury — appreciates annually." },
      { name: "Celine Luggage Tote (Phoebe Era)", priceRange: "$1,500-$3,000", description: "Old Celine pieces are the hottest collector items." },
      { name: "Bottega Veneta Cassette Bag", priceRange: "$1,200-$2,000", description: "Daniel Lee's designs hold resale value." },
      { name: "Cartier Love Bracelet", priceRange: "$3,000-$6,000", description: "The classic gold bracelet — always liquid." },
    ],
    sleeperPicks: [
      { name: "Loewe Puzzle Bag", reasoning: "Rising brand with growing cult following — still below Celine/Chanel pricing", estimatedROI: "20-35%" },
      { name: "Vintage Dior Saddle Bag", reasoning: "Y2K revival keeping Saddle bags in demand", estimatedROI: "25-40%" },
      { name: "The Row Accessories", reasoning: "Quiet luxury brand appreciating fast in resale", estimatedROI: "30-45%" },
    ],
    platformStrategy: "Vestiaire is luxury-only — professional photography on neutral backgrounds is essential. Include serial numbers and authenticity markers. Detailed condition using Vestiaire's grading (Never worn, Very good, Good, Fair). Price with Vestiaire's commission + authentication fee in mind. Mention original packaging. International audience — measurements in cm.",
  },
};

/**
 * GET /api/ai/trends/platform?p=depop
 * Returns trends specific to one platform.
 */
export async function GET(request: NextRequest) {
  const platform = request.nextUrl.searchParams.get("p") || "";
  if (!platform) {
    return NextResponse.json({ error: "p param required" }, { status: 400 });
  }

  const platformNames: Record<string, string> = {
    depop: "Depop", grailed: "Grailed", poshmark: "Poshmark",
    mercari: "Mercari", ebay: "eBay", vinted: "Vinted",
    facebook: "Facebook Marketplace", vestiaire: "Vestiaire Collective",
  };

  const name = platformNames[platform] || platform;
  const fallback = FALLBACKS[platform];

  try {
    const { client, model } = await getAIClient();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    const response = await client.chat.completions.create(
      {
        model,
        ...tokenParams(model, 2048),
        messages: [{
          role: "user",
          content: `You are a resale market analyst specializing in ${name}. Provide trends SPECIFIC to ${name} — what works on THIS platform, not generic resale trends.

Return JSON only (no markdown):
{
  "trendingCategories": [{"name":"...","heat":80,"description":"Why this category is hot on ${name} specifically"}],
  "trendingBrands": [{"name":"...","heat":90,"description":"Why this brand performs well on ${name}"}],
  "hotItems": [{"name":"...","priceRange":"$X-$Y","description":"Why this sells fast on ${name}"}],
  "sleeperPicks": [{"name":"...","reasoning":"Why this is undervalued on ${name}","estimatedROI":"X%"}],
  "platformStrategy": "2-3 sentences on the best overall strategy for selling on ${name} right now"
}

Provide 5-8 items per category. Be specific to ${name}'s audience, fee structure, and algorithm.`,
        }],
      },
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    const text = response.choices[0]?.message?.content || "{}";
    const parsed = parseAIJson<{ trendingCategories?: unknown[] }>(text);

    // Validate we got real data
    if (parsed.trendingCategories?.length > 0) {
      return NextResponse.json(parsed);
    }
    throw new Error("Empty AI response");
  } catch {
    // Return curated fallback data for this specific platform
    if (fallback) {
      return NextResponse.json(fallback);
    }
    return NextResponse.json({
      trendingCategories: [],
      trendingBrands: [],
      hotItems: [],
      sleeperPicks: [],
      platformStrategy: `Unable to fetch ${name}-specific trends. Check your AI provider in Settings.`,
    });
  }
}
