/**
 * Default prompts registry.
 *
 * Every AI feature in CrossList has a prompt defined here.
 * Users can override any of these via the Prompt Studio in Settings.
 * The featureKey is the unique identifier stored in the CustomPrompt table.
 *
 * Prompt text may contain {{variable}} placeholders that are interpolated
 * at runtime before being sent to the AI provider.
 */

export interface PromptDefinition {
  featureKey: string;
  label: string;
  description: string;
  category: "listing" | "analytics" | "pricing" | "trends" | "negotiation";
  prompt: string;
  /** Variables the prompt accepts (for display in Prompt Studio) */
  variables: string[];
  /** Sample values for testing in Prompt Studio */
  sampleVars: Record<string, string>;
}

export const DEFAULT_PROMPTS: PromptDefinition[] = [
  // ── Listing Optimization ──────────────────────────────────────────
  {
    featureKey: "optimize",
    label: "Listing Optimizer",
    description: "Optimizes a listing for a specific marketplace platform",
    category: "listing",
    prompt: `You are a marketplace listing optimization expert. Optimize this product listing for {{platform}}.

{{platformRules}}

Original listing:
- Title: {{title}}
- Description: {{description}}
- Category: {{category}}
- Brand: {{brand}}
- Size: {{size}}
- Condition: {{condition}}
- Price: \${{price}}

Respond in JSON format only (no markdown):
{
  "title": "optimized title",
  "description": "optimized description",
  "hashtags": ["tag1", "tag2"],
  "suggestedPrice": 99.99
}`,
    variables: ["platform", "platformRules", "title", "description", "category", "brand", "size", "condition", "price"],
    sampleVars: {
      platform: "depop",
      platformRules: "Depop style guide:\n- Casual, trendy, Gen-Z tone\n- Max 5 hashtags",
      title: "Vintage Nike Windbreaker",
      description: "90s colorblock Nike windbreaker, great condition",
      category: "Outerwear",
      brand: "Nike",
      size: "L",
      condition: "Good",
      price: "45",
    },
  },

  // ── Platform Rules ────────────────────────────────────────────────
  {
    featureKey: "platform_depop",
    label: "Depop Style Guide",
    description: "Rules for optimizing listings for Depop buyers",
    category: "listing",
    prompt: `Depop style guide:
- Casual, trendy, Gen-Z tone
- Max 5 hashtags, make them searchable
- Keep description concise but descriptive
- Include measurements if relevant
- Mention "depop" trends like Y2K, vintage, streetwear where appropriate`,
    variables: [],
    sampleVars: {},
  },
  {
    featureKey: "platform_grailed",
    label: "Grailed Style Guide",
    description: "Rules for optimizing listings for Grailed buyers",
    category: "listing",
    prompt: `Grailed style guide:
- Professional, brand-focused tone
- Emphasize designer/brand name, season, and collection
- Include detailed measurements (pit-to-pit, length, shoulder width)
- Mention fabric composition and country of manufacture
- Focus on condition details and flaws
- No hashtags needed, use proper category tagging`,
    variables: [],
    sampleVars: {},
  },
  {
    featureKey: "platform_poshmark",
    label: "Poshmark Style Guide",
    description: "Rules for optimizing listings for Poshmark buyers",
    category: "listing",
    prompt: `Poshmark style guide:
- Friendly, enthusiastic tone with community feel
- Use relevant party tags (e.g., "Best in Tops Party")
- Mention sharing strategy appeal (e.g., "Share for a discount!")
- Include size details and fit description
- Add styling suggestions
- Use brand name prominently
- Include 3-5 relevant hashtags`,
    variables: [],
    sampleVars: {},
  },
  {
    featureKey: "platform_mercari",
    label: "Mercari Style Guide",
    description: "Rules for optimizing listings for Mercari buyers",
    category: "listing",
    prompt: `Mercari style guide:
- Clean, factual, straightforward tone
- Emphasize competitive pricing
- Include shipping weight estimate
- Mention condition clearly using Mercari's rating system
- Keep title short and keyword-rich for search
- Include dimensions/measurements
- 3-5 relevant hashtags for search discovery`,
    variables: [],
    sampleVars: {},
  },

  // ── Description Enhancement ───────────────────────────────────────
  {
    featureKey: "enhance",
    label: "Description Enhancer",
    description: "Turns rough notes into polished listing descriptions",
    category: "listing",
    prompt: `Turn these rough notes into a polished product listing description. Keep it natural and appealing.

Category: {{category}}
Brand: {{brand}}
Notes: {{notes}}

Return only the polished description text, no JSON or formatting.`,
    variables: ["category", "brand", "notes"],
    sampleVars: {
      category: "Outerwear",
      brand: "Patagonia",
      notes: "fleece jacket, blue, size M, barely worn, no stains, bought at REI last year",
    },
  },

  // ── Smart Lister (Vision) ─────────────────────────────────────────
  {
    featureKey: "smart_list_system",
    label: "Smart Lister — System Prompt",
    description: "System prompt for the AI vision-based item identifier",
    category: "listing",
    prompt: `You are an expert reseller and fashion identifier. You analyze photos of clothing, footwear, accessories, and other fashion items to generate complete, professional marketplace listings. You have deep knowledge of brands, vintage pieces, streetwear, designer fashion, and current resale market pricing. Always respond with valid JSON only — no markdown, no code fences.`,
    variables: [],
    sampleVars: {},
  },
  {
    featureKey: "smart_list_user",
    label: "Smart Lister — Analysis Prompt",
    description: "User prompt that tells the AI what to extract from the product image",
    category: "listing",
    prompt: `Analyze this item photo and generate a complete marketplace listing. Identify everything you can about the item and provide the following in JSON format:

{
  "item_type": "The type of item (e.g., jacket, sneakers, t-shirt, handbag)",
  "brand": "Brand name if identifiable, or 'Unbranded' if not",
  "model": "Specific model, style name, or collection if recognizable. Use null if unknown",
  "category": "One of: Tops, Bottoms, Outerwear, Footwear, Accessories, Dresses, Activewear, Bags, Jewelry, Streetwear, Vintage, Designer, Sportswear, Other",
  "size": "Estimated size if visible from tags/labels. Use null if not visible",
  "condition": "One of: New with tags, Like new, Good, Fair, Poor",
  "colors": ["Array of colors visible on the item"],
  "material": "Estimated material composition. Use null if uncertain",
  "era": "Estimated era/decade if vintage. Use null if modern/unclear",
  "title": "A polished, SEO-optimized listing title (max 80 chars)",
  "description": "A detailed, appealing listing description (150-250 words)",
  "price_suggestion": {
    "low": "Conservative/quick-sale price in USD (number)",
    "mid": "Fair market value price in USD (number)",
    "high": "Premium/patient-seller price in USD (number)",
    "currency": "USD"
  },
  "hashtags": {
    "depop": ["5-8 Depop-optimized hashtags"],
    "poshmark": ["5-8 Poshmark-optimized hashtags"],
    "mercari": ["5-8 Mercari-optimized hashtags"]
  },
  "style_keywords": ["8-12 style/search keywords"],
  "confidence_score": "0-100 confidence in identification accuracy"
}

Be as specific as possible with brand and model identification.`,
    variables: [],
    sampleVars: {},
  },

  // ── Price Intelligence ────────────────────────────────────────────
  {
    featureKey: "price_intel",
    label: "Price Intelligence",
    description: "Analyzes market pricing for an item across platforms",
    category: "pricing",
    prompt: `You are a reselling pricing expert with deep knowledge of marketplace dynamics. Analyze this item and provide comprehensive pricing intelligence.

Item:
- Title: {{title}}
- Brand: {{brand}}
- Category: {{category}}
- Condition: {{condition}}
- Size: {{size}}
- Current price: \${{currentPrice}}

Provide:
1. Market price analysis — what similar items typically sell for across platforms
2. Platform-specific optimal prices (each platform has different buyer demographics)
3. A pricing strategy recommendation
4. Price psychology tips for this specific item
5. When to drop the price and by how much if it doesn't sell
6. Estimated sell-through rate at different price points

Respond in JSON only (no markdown):
{
  "marketAnalysis": {
    "lowEnd": 20,
    "average": 35,
    "highEnd": 55,
    "summary": "..."
  },
  "platformPricing": {
    "depop": {"price": 30, "reasoning": "..."},
    "grailed": {"price": 40, "reasoning": "..."},
    "poshmark": {"price": 35, "reasoning": "..."},
    "mercari": {"price": 28, "reasoning": "..."}
  },
  "strategy": {
    "recommendation": "price_high_drop|price_competitive|price_to_sell",
    "explanation": "...",
    "optimalPrice": 35
  },
  "psychologyTips": ["..."],
  "priceDropSchedule": [
    {"day": 7, "dropTo": 32, "reasoning": "..."},
    {"day": 14, "dropTo": 28, "reasoning": "..."}
  ],
  "sellThrough": {
    "at_high": {"price": 55, "probability": "20%", "estimatedDays": 30},
    "at_mid": {"price": 35, "probability": "65%", "estimatedDays": 10},
    "at_low": {"price": 20, "probability": "95%", "estimatedDays": 3}
  }
}`,
    variables: ["title", "brand", "category", "condition", "size", "currentPrice"],
    sampleVars: {
      title: "Vintage Levi's 501 Jeans",
      brand: "Levi's",
      category: "Bottoms",
      condition: "Good",
      size: "32x30",
      currentPrice: "65",
    },
  },

  // ── Repricing Strategy ────────────────────────────────────────────
  {
    featureKey: "reprice",
    label: "Bulk Repricing Strategy",
    description: "Analyzes full inventory and suggests optimal repricing",
    category: "pricing",
    prompt: `You are an expert reselling pricing strategist. Analyze this inventory and suggest optimal repricing to maximize sell-through and revenue.

Current inventory:
{{inventory}}

For each listing, determine:
1. Is the current price optimal?
2. Should it be raised, lowered, or kept the same?
3. What's the recommended new price?
4. Priority of the price change (high/medium/low)
5. Brief reasoning

Also provide:
- Overall inventory health assessment
- Total estimated revenue at current prices vs. optimized prices
- Which items to prioritize selling first (stale inventory)

Respond in JSON only (no markdown):
{
  "suggestions": [
    {
      "listingId": "...",
      "title": "...",
      "currentPrice": 45,
      "suggestedPrice": 38,
      "action": "lower|raise|keep",
      "priority": "high|medium|low",
      "reasoning": "...",
      "estimatedDaysToSell": 5
    }
  ],
  "summary": "...",
  "currentEstimatedRevenue": 500,
  "optimizedEstimatedRevenue": 620,
  "staleItems": ["listingId1", "listingId2"]
}`,
    variables: ["inventory"],
    sampleVars: {
      inventory: '[{"title":"Nike Dunk Low","currentPrice":120,"daysListed":14}]',
    },
  },

  // ── Health Score ──────────────────────────────────────────────────
  {
    featureKey: "health_score",
    label: "Listing Health Score",
    description: "Grades a listing on title, description, photos, pricing, and coverage",
    category: "analytics",
    prompt: `You are an expert reselling consultant who grades marketplace listings. Analyze this listing and provide a detailed health score.

Listing:
- Title: {{title}}
- Description: {{description}}
- Category: {{category}}
- Brand: {{brand}}
- Size: {{size}}
- Condition: {{condition}}
- Price: \${{price}}
- Number of photos: {{photoCount}}
- Platforms listed on: {{platforms}}
- Status: {{status}}

Grade this listing on these criteria (each 0-100):
1. Title Quality (SEO keywords, length, clarity)
2. Description Quality (detail, appeal, measurements, keywords)
3. Photo Score (number of photos — ideally 4-8)
4. Pricing Strategy (is it competitive for the brand/category/condition?)
5. Platform Coverage (is it on enough platforms?)

Also provide:
- An overall score (weighted average)
- 3-5 specific, actionable improvements ranked by impact
- An estimated "days to sell" prediction
- A one-line verdict

Respond in JSON only (no markdown):
{
  "overall": 75,
  "scores": {
    "title": {"score": 80, "feedback": "..."},
    "description": {"score": 60, "feedback": "..."},
    "photos": {"score": 40, "feedback": "..."},
    "pricing": {"score": 85, "feedback": "..."},
    "platformCoverage": {"score": 25, "feedback": "..."}
  },
  "improvements": [
    {"action": "...", "impact": "high", "detail": "..."}
  ],
  "estimatedDaysToSell": 7,
  "verdict": "..."
}`,
    variables: ["title", "description", "category", "brand", "size", "condition", "price", "photoCount", "platforms", "status"],
    sampleVars: {
      title: "Nike Air Max 90",
      description: "Classic Nike Air Max 90 in white/black",
      category: "Footwear",
      brand: "Nike",
      size: "US 10",
      condition: "Like new",
      price: "95",
      photoCount: "3",
      platforms: "depop, grailed",
      status: "active",
    },
  },

  // ── Analytics Recommendations ─────────────────────────────────────
  {
    featureKey: "recommendations",
    label: "Sales Recommendations",
    description: "Generates actionable recommendations based on listing performance data",
    category: "analytics",
    prompt: `You are a reselling analytics expert. Based on these listings and their performance, provide actionable recommendations to improve sales.

Listings data:
{{listings}}

Provide 3-5 specific, actionable recommendations. Format as a JSON array of objects:
[{"title": "recommendation title", "description": "detailed advice", "priority": "high|medium|low"}]

Return only valid JSON, no markdown.`,
    variables: ["listings"],
    sampleVars: {
      listings: '[{"title":"Nike Dunk","platform":"depop","views":50,"likes":3,"price":120}]',
    },
  },

  // ── Trends ────────────────────────────────────────────────────────
  {
    featureKey: "trends",
    label: "Market Trends",
    description: "Generates trend reports for resale fashion market",
    category: "trends",
    prompt: `You are an expert reselling market analyst specializing in secondhand fashion and goods across Depop, Grailed, Poshmark, and Mercari. Today is {{today}}.

Based on your knowledge of current resale market trends, provide a comprehensive trend report. Consider recent fashion weeks, social media trends, seasonal shifts, and platform-specific dynamics.

Provide the following:

1. **Top 5 Trending Categories** — what types of items are hottest right now. Include a heat score (1-100) and a short description.
2. **Top 5 Trending Brands** — which brands are commanding the most demand and premium prices. Include a heat score (1-100) and a short description.
3. **Top 5 Hot Items/Styles** — specific items or styles that are selling fast right now. Include an estimated resale price range and description.
4. **3 Sleeper Picks** — undervalued items that are about to trend. Include your reasoning and estimated ROI percentage.
5. **Seasonal Advice** — what's about to be in demand in the next 2-4 weeks based on seasonal shifts.
6. **Platform-Specific Tips** — what's performing best on each platform (Depop, Grailed, Poshmark, Mercari) and how to optimize for each.

Respond in JSON format only (no markdown, no code fences):
{
  "trendingCategories": [{"name": "...", "heat": 80, "description": "..."}],
  "trendingBrands": [{"name": "...", "heat": 90, "description": "..."}],
  "hotItems": [{"name": "...", "priceRange": "$X-$Y", "description": "..."}],
  "sleeperPicks": [{"name": "...", "reasoning": "...", "estimatedROI": "X%"}],
  "seasonalAdvice": "...",
  "platformTips": {"depop": "...", "grailed": "...", "poshmark": "...", "mercari": "..."}
}`,
    variables: ["today"],
    sampleVars: { today: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) },
  },

  // ── Negotiation ───────────────────────────────────────────────────
  {
    featureKey: "negotiate_response",
    label: "Negotiation Copilot",
    description: "Drafts responses to buyer messages with pricing strategy",
    category: "negotiation",
    prompt: `You are an expert reseller's AI assistant helping draft responses to buyer messages. Your goal is to maximize the sale price while keeping the buyer engaged.

Item: {{itemTitle}}
Listed price: \${{itemPrice}}
Description: {{itemDescription}}
Minimum acceptable price: \${{minimumPrice}}
Seller communication style: {{sellerStyle}}

Buyer's message: "{{buyerMessage}}"

Analyze the buyer's intent and draft 3 response options:
1. FIRM — Politely hold your price (for lowball offers or when price is fair)
2. NEGOTIATE — Counter-offer or meet in the middle (for reasonable offers)
3. ACCEPT — Accept or encourage the sale (for good offers)

For each response, explain the strategy behind it.

Also determine:
- Is this a serious buyer or a lowballer?
- What's the buyer's likely maximum price?
- Best negotiation tactic for this situation

Respond in JSON only (no markdown):
{
  "buyerAnalysis": {
    "intent": "lowball|negotiating|serious|question",
    "estimatedMaxPrice": 35,
    "seriousnessScore": 7
  },
  "responses": [
    {
      "type": "firm",
      "message": "...",
      "strategy": "..."
    },
    {
      "type": "negotiate",
      "message": "...",
      "strategy": "..."
    },
    {
      "type": "accept",
      "message": "...",
      "strategy": "..."
    }
  ],
  "recommendedResponse": "firm|negotiate|accept",
  "tactic": "..."
}`,
    variables: ["itemTitle", "itemPrice", "itemDescription", "minimumPrice", "sellerStyle", "buyerMessage"],
    sampleVars: {
      itemTitle: "Vintage Nike Windbreaker",
      itemPrice: "45",
      itemDescription: "90s colorblock Nike windbreaker, great condition",
      minimumPrice: "30",
      sellerStyle: "friendly and professional",
      buyerMessage: "Would you take $25 for this?",
    },
  },
  {
    featureKey: "negotiate_question",
    label: "Buyer Question Responder",
    description: "Drafts helpful responses to buyer questions about items",
    category: "negotiation",
    prompt: `You are a helpful seller on a marketplace. A buyer asked a question about your item. Draft a response.

Item: {{itemTitle}}
Price: \${{itemPrice}}
Description: {{itemDescription}}
Buyer's question: "{{buyerMessage}}"

Write a friendly, helpful response that answers their question and encourages the sale. Keep it concise (2-3 sentences max). Return plain text only, no JSON.`,
    variables: ["itemTitle", "itemPrice", "itemDescription", "buyerMessage"],
    sampleVars: {
      itemTitle: "Vintage Nike Windbreaker",
      itemPrice: "45",
      itemDescription: "90s colorblock Nike windbreaker, great condition",
      buyerMessage: "What are the measurements on this?",
    },
  },

  // ── Competitor Analysis ───────────────────────────────────────────
  {
    featureKey: "competitor",
    label: "Competitor Analysis",
    description: "Analyzes the competitive landscape for an item across resale platforms",
    category: "analytics",
    prompt: `You are an expert resale market analyst. Analyze the competitive landscape for this item across Depop, Grailed, Poshmark, and Mercari.

Item:
- Title: {{title}}
- Brand: {{brand}}
- Category: {{category}}
- Current price: \${{price}}

Provide a comprehensive competitive analysis:

1. **Market Overview** — How saturated is the market for this item? What's the demand level? What's the typical price range?
2. **Competitor Strategies** — What are top sellers doing? How do they photograph, describe, and price similar items?
3. **Differentiation Tips** — How can this seller stand out from competitors?
4. **Keywords & SEO** — What keywords and hashtags are competitors using? What search terms do buyers use?
5. **Pricing Recommendation** — Based on competition, what's the optimal price?

Respond in JSON only (no markdown):
{
  "marketOverview": {
    "saturation": "low|medium|high",
    "demandLevel": "low|medium|high",
    "priceRange": {"low": 20, "average": 35, "high": 55},
    "totalEstimatedListings": 150,
    "summary": "..."
  },
  "competitorStrategies": [
    {"strategy": "...", "detail": "...", "effectiveness": "high|medium|low"}
  ],
  "differentiationTips": [
    {"tip": "...", "impact": "high|medium|low", "detail": "..."}
  ],
  "keywords": {
    "searchTerms": ["..."],
    "hashtags": ["..."],
    "titleKeywords": ["..."]
  },
  "pricingRecommendation": {
    "suggestedPrice": 35,
    "reasoning": "...",
    "undercut": "...",
    "premiumJustification": "..."
  }
}`,
    variables: ["title", "brand", "category", "price"],
    sampleVars: {
      title: "Vintage Nike Windbreaker",
      brand: "Nike",
      category: "Outerwear",
      price: "45",
    },
  },
];

/** Lookup a prompt definition by feature key */
export function getDefaultPrompt(featureKey: string): PromptDefinition | undefined {
  return DEFAULT_PROMPTS.find((p) => p.featureKey === featureKey);
}

/** Interpolate {{variables}} in a prompt string */
export function interpolatePrompt(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}
