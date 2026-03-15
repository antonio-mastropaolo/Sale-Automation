import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

const STARTER_TEMPLATES = [
  {
    name: "Vintage Graphic Tee",
    category: "Tops",
    brand: "",
    condition: "Good",
    description: "Vintage [BRAND] graphic tee from the [YEAR]s. [COLOR] colorway with [DESIGN] print on front. Tag size [SIZE], fits [FIT]. No holes, stains, or cracks in the graphic.\n\nMeasurements (laid flat):\n- Chest: ___\"\n- Length: ___\"\n\nShips within 1-2 business days.",
    tags: "vintage,graphic tee,retro,streetwear,y2k",
  },
  {
    name: "Sneakers — Clean Pair",
    category: "Footwear",
    brand: "Nike",
    condition: "Good",
    description: "[BRAND] [MODEL] in [COLORWAY]. Size [SIZE] US. Worn [X] times — soles in great shape, no major creasing. Comes with original box [and extra laces]. OG all.\n\nCondition: 8.5/10\n\nShips double-boxed for protection.",
    tags: "sneakers,kicks,nike,jordan,footwear",
  },
  {
    name: "Designer Outerwear",
    category: "Outerwear",
    brand: "",
    condition: "Like new",
    description: "[BRAND] [ITEM TYPE] from [SEASON/YEAR]. Size [SIZE]. [MATERIAL] construction. [COLOR] colorway.\n\nCondition: Excellent — worn once, no visible wear. All zippers and buttons functional.\n\nMeasurements:\n- Chest (pit-to-pit): ___\"\n- Length (back): ___\"\n- Sleeve: ___\"\n\nIncludes original tags/dust bag.",
    tags: "designer,outerwear,jacket,coat,luxury",
  },
  {
    name: "Vintage Denim Jeans",
    category: "Bottoms",
    brand: "Levi's",
    condition: "Good",
    description: "Vintage [BRAND] [MODEL] jeans. [COLOR] wash with natural fading and distressing. Tag size [SIZE], see measurements below for actual fit.\n\nWaist: ___\"\nInseam: ___\"\nRise: ___\"\nLeg opening: ___\"\nThigh: ___\"\n\nMade in [COUNTRY]. [DECADE] era based on tag/stitching.",
    tags: "vintage,denim,jeans,levis,501,wrangler",
  },
  {
    name: "Streetwear Hoodie",
    category: "Tops",
    brand: "",
    condition: "Good",
    description: "[BRAND] [ITEM NAME] hoodie. Size [SIZE]. [COLOR].\n\n- Heavyweight cotton fleece\n- Drawstring hood\n- Kangaroo pocket\n- Ribbed cuffs and hem\n\nCondition: [DETAILS]. No major flaws.\n\nShips folded and wrapped.",
    tags: "streetwear,hoodie,supreme,bape,palace,hype",
  },
  {
    name: "Luxury Handbag",
    category: "Bags",
    brand: "",
    condition: "Very Good",
    description: "[BRAND] [MODEL] bag in [COLOR] [MATERIAL].\n\nDimensions: ___\" L x ___\" H x ___\" W\nStrap drop: ___\"\n\nInterior: Clean, no stains or pen marks. All hardware functional.\nExterior: Minimal wear. [NOTE ANY MARKS].\n\nSerial number: [IF APPLICABLE]\nIncludes: [dust bag / authenticity card / box]",
    tags: "bag,handbag,designer,luxury,accessory",
  },
  {
    name: "Activewear Set",
    category: "Activewear",
    brand: "",
    condition: "Like new",
    description: "[BRAND] [ITEM TYPE] — [COLOR/PATTERN].\nSize [SIZE]. [MATERIAL BLEND].\n\nFeatures:\n- Moisture-wicking / Quick-dry\n- [Pockets / Reflective details]\n\nWorn [X] times, washed cold. No pilling, fading, or stretching. Smoke-free home.",
    tags: "activewear,lululemon,gym,athletic,workout",
  },
  {
    name: "Quick Flip — Bundle Ready",
    category: "Other",
    brand: "",
    condition: "Good",
    description: "[ITEM DESCRIPTION]\n\nCondition: [Good/Very Good]\nSize: [SIZE]\n\nBundle 2+ items from my closet for a discount!\nOpen to reasonable offers.\n\nShips same or next business day.",
    tags: "bundle,deal,quick ship,reseller",
  },
];

export async function GET() {
  try {
    // Seed admin user
    const existing = await prisma.user.findUnique({
      where: { email: "admin@listblitz.io" },
    });

    if (!existing) {
      const passwordHash = await hashPassword("admin");
      await prisma.user.create({
        data: {
          email: "admin@listblitz.io",
          username: "admin",
          passwordHash,
          role: "admin",
          onboarded: true,
        },
      });
    }

    // Seed starter templates (only if none exist)
    const templateCount = await prisma.template.count();
    if (templateCount === 0) {
      for (const t of STARTER_TEMPLATES) {
        await prisma.template.create({ data: t });
      }
    }

    return NextResponse.json({
      message: existing ? "Admin already exists" : "Admin user created",
      templates: templateCount === 0 ? `${STARTER_TEMPLATES.length} starter templates created` : `${templateCount} templates already exist`,
    });
  } catch (err) {
    console.error("Seed error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
