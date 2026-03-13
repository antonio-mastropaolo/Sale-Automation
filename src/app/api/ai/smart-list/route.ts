import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { parseAIJson } from "@/lib/ai-utils";

const client = new OpenAI();

export async function POST(request: NextRequest) {
  try {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: "Request must be multipart/form-data with an image file" },
        { status: 400 }
      );
    }
    const file = formData.get("image") as File | null;

    if (!file || file.size === 0) {
      return NextResponse.json(
        { error: "No image provided" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image." },
        { status: 400 }
      );
    }

    // Validate file size (max 20MB for OpenAI vision)
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Image too large. Maximum size is 20MB." },
        { status: 400 }
      );
    }

    // Convert image to base64
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mimeType = file.type;
    const dataUrl = `data:${mimeType};base64,${base64}`;

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 2048,
      messages: [
        {
          role: "system",
          content: `You are an expert reseller and fashion identifier. You analyze photos of clothing, footwear, accessories, and other fashion items to generate complete, professional marketplace listings. You have deep knowledge of brands, vintage pieces, streetwear, designer fashion, and current resale market pricing. Always respond with valid JSON only — no markdown, no code fences.`,
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: dataUrl,
                detail: "high",
              },
            },
            {
              type: "text",
              text: `Analyze this item photo and generate a complete marketplace listing. Identify everything you can about the item and provide the following in JSON format:

{
  "item_type": "The type of item (e.g., jacket, sneakers, t-shirt, handbag)",
  "brand": "Brand name if identifiable, or 'Unbranded' if not",
  "model": "Specific model, style name, or collection if recognizable (e.g., 'Air Force 1', 'Box Logo Hoodie'). Use null if unknown",
  "category": "One of: Tops, Bottoms, Outerwear, Footwear, Accessories, Dresses, Activewear, Bags, Jewelry, Streetwear, Vintage, Designer, Sportswear, Other",
  "size": "Estimated size if visible from tags/labels (e.g., 'M', 'US 10', '32x30'). Use null if not visible",
  "condition": "One of: New with tags, Like new, Good, Fair, Poor — assess based on visible wear, creasing, fading, stains",
  "colors": ["Array of colors visible on the item"],
  "material": "Estimated material composition (e.g., '100% Cotton', 'Nylon/Polyester blend', 'Leather'). Use null if uncertain",
  "era": "Estimated era/decade if the item appears vintage (e.g., '1990s', 'Early 2000s'). Use null if modern/unclear",
  "title": "A polished, SEO-optimized listing title. Include brand, key descriptors, item type, and notable features. Make it keyword-rich for marketplace search (max 80 chars)",
  "description": "A detailed, appealing listing description. Include:\n- Item overview and key selling points\n- Brand and style details\n- Color and material description\n- Condition notes\n- A measurements placeholder section like: '\\n\\nMeasurements (laid flat):\\n- Chest/Width: ___\\n- Length: ___\\n- Sleeve/Inseam: ___'\n- A brief styling suggestion\nKeep it professional but engaging, 150-250 words",
  "price_suggestion": {
    "low": "Conservative/quick-sale price in USD (number)",
    "mid": "Fair market value price in USD (number)",
    "high": "Premium/patient-seller price in USD (number)",
    "currency": "USD"
  },
  "hashtags": {
    "depop": ["Array of 5-8 Depop-optimized hashtags — trendy, Gen-Z focused, include style tags"],
    "poshmark": ["Array of 5-8 Poshmark-optimized hashtags — include brand, style, party tags"],
    "mercari": ["Array of 5-8 Mercari-optimized hashtags — keyword-focused, search-friendly"]
  },
  "style_keywords": ["Array of 8-12 style/search keywords for discoverability (e.g., 'y2k', 'streetwear', 'vintage', 'minimalist')"],
  "confidence_score": "Your confidence in the identification accuracy as a number from 0 to 100"
}

Be as specific as possible with brand and model identification. If you can see tags, labels, or logos, use them. For pricing, consider the current resale market on platforms like Depop, Grailed, Poshmark, and Mercari.`,
            },
          ],
        },
      ],
    });

    const content = response.choices[0]?.message?.content || "";

    const parsed = parseAIJson(content);
    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Smart list error:", error);

    if (error instanceof OpenAI.APIError) {
      if (error.status === 401) {
        return NextResponse.json(
          { error: "Invalid OpenAI API key. Please check your OPENAI_API_KEY environment variable." },
          { status: 401 }
        );
      }
      if (error.status === 429) {
        return NextResponse.json(
          { error: "Rate limit exceeded. Please try again in a moment." },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { error: `OpenAI API error: ${error.message}` },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to analyze image. Please try again." },
      { status: 500 }
    );
  }
}
