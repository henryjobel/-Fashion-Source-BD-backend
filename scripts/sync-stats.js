import { closeDb, connectDb } from "../src/db.js";
import { Page } from "../src/models/index.js";

const field = (key, label, value, type = "text") => ({ key, label, value, type });

const aboutStatsFields = [
  field("stat1Value", "Stat 1 Value", "2017"),
  field("stat1Suffix", "Stat 1 Suffix", ""),
  field("stat1Label", "Stat 1 Label", "Industry Experience"),
  field("stat2Value", "Stat 2 Value", "150"),
  field("stat2Suffix", "Stat 2 Suffix", "+"),
  field("stat2Label", "Stat 2 Label", "Skilled Employees"),
  field("stat3Value", "Stat 3 Value", "134"),
  field("stat3Suffix", "Stat 3 Suffix", "+"),
  field("stat3Label", "Stat 3 Label", "Associated Factories"),
  field("stat4Value", "Stat 4 Value", "2"),
  field("stat4Suffix", "Stat 4 Suffix", ""),
  field("stat4Label", "Stat 4 Label", "Key Locations"),
];

const homeStatsFields = [
  field("stat1Value", "Stat 1 Value", "2017"),
  field("stat1Suffix", "Stat 1 Suffix", ""),
  field("stat1Label", "Stat 1 Label", "Established"),
  field("stat2Value", "Stat 2 Value", "150"),
  field("stat2Suffix", "Stat 2 Suffix", "+"),
  field("stat2Label", "Stat 2 Label", "Skilled Employees"),
  field("stat3Value", "Stat 3 Value", "134"),
  field("stat3Suffix", "Stat 3 Suffix", "+"),
  field("stat3Label", "Stat 3 Label", "Associated Factories"),
  field("stat4Value", "Stat 4 Value", "2"),
  field("stat4Suffix", "Stat 4 Suffix", ""),
  field("stat4Label", "Stat 4 Label", "Locations"),
];

async function upsertSection(slug, sectionKey, label, sectionType, fields) {
  const page = await Page.findOne({ slug });
  if (!page) {
    console.log(`↷ Page ${slug} not found, skipping`);
    return;
  }
  const existing = page.sections.find((s) => s.section_key === sectionKey);
  if (existing) {
    existing.label = label;
    existing.section_type = sectionType;
    existing.content = { fields };
    console.log(`✅ Updated existing "${sectionKey}" section on ${slug}`);
  } else {
    const maxOrder = page.sections.reduce((max, s) => Math.max(max, s.sort_order ?? 0), 0);
    page.sections.push({
      section_key: sectionKey,
      label,
      section_type: sectionType,
      content: { fields },
      sort_order: maxOrder + 1,
    });
    console.log(`✅ Added new "${sectionKey}" section on ${slug}`);
  }
  await page.save();
}

async function main() {
  console.log("🔌 Connecting to database…");
  await connectDb();

  await upsertSection("/about", "stats", "Stats Cards", "cards", aboutStatsFields);
  await upsertSection("/", "classic-stats", "Home Stats Band", "cards", homeStatsFields);

  console.log("\n🚀 Stats sync complete.");
  await closeDb();
}

main().catch(async (err) => {
  console.error("❌ Sync failed:", err.message);
  await closeDb();
  process.exit(1);
});
