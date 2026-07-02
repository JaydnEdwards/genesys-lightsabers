console.log("Hello from the Genesys Lightsabers module! [build 1.0.4]");

const MODULE_ID = "genesys-lightsabers";
const WIELDER_MOD_EFFECT_FLAG = "wielderModEffect";
const WIELDER_MOD_EFFECT_SOURCE_FLAG = "wielderModSource";
// Separate flag pair for talent-sourced effects, kept distinct from WIELDER_MOD_EFFECT_FLAG even
// though they're built the same way — syncActorWielderEffects's stale-effect cleanup only knows
// about weapon/armor source ids, so a talent-sourced effect sharing that flag would get deleted
// and recreated every sync cycle instead of being left alone when unchanged.
const TALENT_MOD_EFFECT_FLAG = "talentModEffect";
const TALENT_MOD_EFFECT_SOURCE_FLAG = "talentModSource";

// Each KOTOR-style item category gets its own slot set and modifiable stat fields, matching
// how the original games scoped upgrades per weapon/armor type rather than sharing one pool.
// Blaster/vibrosword/armor slots are confirmed but not yet populated with actual upgrade
// content (compendiums/JSON come later, once each category's stat effects are designed).
const ITEM_CATEGORIES = {
  lightsaber: {
    itemType: "weapon",
    slots: ["colorCrystal", "powerCrystal", "emitter", "lens", "energyCell"],
    statFields: ["baseDamage", "critical", "rangedDefence"],
    supportsBladeColor: true
  },
  blaster: {
    itemType: "weapon",
    slots: ["targeting", "powerPack", "firingChamber"],
    statFields: ["baseDamage", "critical", "rangedDefence"],
    supportsBladeColor: false
  },
  vibrosword: {
    itemType: "weapon",
    slots: ["edge", "energyCell", "grip"],
    statFields: ["baseDamage", "critical", "rangedDefence"],
    supportsBladeColor: false
  },
  armor: {
    itemType: "armor",
    slots: ["overlay", "underlay"],
    statFields: ["defense", "soak", "encumbrance"],
    supportsBladeColor: false
  }
};

function getItemCategoryKey(item) {
  return item?.getFlag(MODULE_ID, "category") ?? null;
}

function getCategoryConfig(item) {
  return ITEM_CATEGORIES[getItemCategoryKey(item)] ?? null;
}

const crystalImages = {
  single: {
    blue: "modules/genesys-lightsabers/assets/lightsabers/single/iw_lghtsbr_001.png",
    red: "modules/genesys-lightsabers/assets/lightsabers/single/iw_lghtsbr_002.png",
    green: "modules/genesys-lightsabers/assets/lightsabers/single/iw_lghtsbr_003.png",
    yellow: "modules/genesys-lightsabers/assets/lightsabers/single/iw_lghtsbr_004.png",
    violet: "modules/genesys-lightsabers/assets/lightsabers/single/iw_lghtsbr_005.png",
    cyan: "modules/genesys-lightsabers/assets/lightsabers/single/iw_lghtsbr_008.png",
    silver: "modules/genesys-lightsabers/assets/lightsabers/single/iw_lghtsbr_010.png",
    orange: "modules/genesys-lightsabers/assets/lightsabers/single/iw_lghtsbr_007.png",
    viridian: "modules/genesys-lightsabers/assets/lightsabers/single/iw_lghtsbr_009.png"
  },
  double: {
    blue: "modules/genesys-lightsabers/assets/lightsabers/double/iw_dblsbr_001.png",
    red: "modules/genesys-lightsabers/assets/lightsabers/double/iw_dblsbr_002.png",
    green: "modules/genesys-lightsabers/assets/lightsabers/double/iw_dblsbr_003.png",
    yellow: "modules/genesys-lightsabers/assets/lightsabers/double/iw_dblsbr_004.png",
    violet: "modules/genesys-lightsabers/assets/lightsabers/double/iw_dblsbr_005.png",
    cyan: "modules/genesys-lightsabers/assets/lightsabers/double/iw_dblsbr_007.png",
    silver: "modules/genesys-lightsabers/assets/lightsabers/double/iw_dblsbr_009.png",
    orange: "modules/genesys-lightsabers/assets/lightsabers/double/iw_dblsbr_006.png",
    viridian: "modules/genesys-lightsabers/assets/lightsabers/double/iw_dblsbr_008.png"
  },
  short: {
    blue: "modules/genesys-lightsabers/assets/lightsabers/short/iw_shortsbr_001.png",
    red: "modules/genesys-lightsabers/assets/lightsabers/short/iw_shortsbr_002.png",
    green: "modules/genesys-lightsabers/assets/lightsabers/short/iw_shortsbr_008.png",
    yellow: "modules/genesys-lightsabers/assets/lightsabers/short/iw_shortsbr_004.png",
    violet: "modules/genesys-lightsabers/assets/lightsabers/short/iw_shortsbr_005.png",
    cyan: "modules/genesys-lightsabers/assets/lightsabers/short/iw_shortsbr_007.png",
    silver: "modules/genesys-lightsabers/assets/lightsabers/short/iw_shortsbr_009.png",
    orange: "modules/genesys-lightsabers/assets/lightsabers/short/iw_shortsbr_006.png",
    viridian: "modules/genesys-lightsabers/assets/lightsabers/short/iw_shortsbr_003.png"
  }
};

const baseImages = {
  single: "modules/genesys-lightsabers/assets/lightsabers/single/iw_lghtsbr_006.png",
  double: "modules/genesys-lightsabers/assets/lightsabers/double/iw_dblsbr_010.png",
  short: "modules/genesys-lightsabers/assets/lightsabers/short/iw_lghtsbr_006.png"
};

const crystalColours = [
  "blue",
  "green",
  "yellow",
  "red",
  "violet",
  "cyan",
  "silver",
  "orange",
  "viridian"
];

const crystalQualityNames = new Set(
  crystalColours.map((colour) => colour + " crystal")
);

function parseColorFromText(text) {
  const normalizedText = String(text ?? "").toLowerCase().trim();
  if (!normalizedText) return null;

  for (const colour of crystalColours) {
    if (normalizedText.includes(colour)) return colour;
  }

  return null;
}

function collectManagedNamesFromSlot(slotData, targetSet) {
  const primaryName = String(slotData?.qualityData?.name ?? "").toLowerCase().trim();
  if (primaryName) targetSet.add(primaryName);
}

function toFiniteNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function asFiniteNumberOrNull(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function collectStatMods(upgrades, statFields) {
  const totals = {};
  for (const field of statFields) totals[field] = 0;

  for (const slotData of Object.values(upgrades || {})) {
    const mods = slotData?.effectData?.statMods;
    if (!mods || typeof mods !== "object") continue;

    for (const field of statFields) {
      totals[field] += toFiniteNumber(mods[field], 0);
    }
  }

  return totals;
}

function getBaseStats(item, statFields) {
  const flagged = item.getFlag(MODULE_ID, "baseStats") || {};
  const result = {};

  for (const field of statFields) {
    result[field] = foundry.utils.hasProperty(flagged, field) ? flagged[field] : item.system?.[field];
  }

  return result;
}

function applyNumericMod(baseValue, modAmount) {
  const baseNumeric = asFiniteNumberOrNull(baseValue);
  if (baseNumeric === null) return baseValue;

  const modNumeric = toFiniteNumber(modAmount, 0);
  return baseNumeric + modNumeric;
}

function inferBaseStatValue(currentValue, appliedModTotal) {
  const currentNumeric = asFiniteNumberOrNull(currentValue);
  if (currentNumeric === null) return currentValue;

  return currentNumeric - toFiniteNumber(appliedModTotal, 0);
}

function deriveStatsFromBase(baseStats, upgrades, statFields) {
  const modTotals = collectStatMods(upgrades, statFields);
  const result = {};

  for (const field of statFields) {
    result[field] = applyNumericMod(baseStats?.[field], modTotals[field]);
  }

  return result;
}

function getDerivedStats(item, upgrades, statFields) {
  const baseStats = getBaseStats(item, statFields);
  return deriveStatsFromBase(baseStats, upgrades, statFields);
}

function getWeaponVariant(weapon) {
  const flagged = weapon.getFlag(MODULE_ID, "variant");

  if (flagged) return flagged;

  const name = String(weapon.name ?? "").toLowerCase();
  if (name.includes("lightsaber, double-bladed")) return "double";
  if (name.includes("lightsaber, short")) return "short";
  return "single";
}

function collectWielderMods(upgrades) {
  const totals = {};

  function walk(obj, prefix = "") {
    if (!obj || typeof obj !== "object") return;

    for (const [key, value] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;

      if (typeof value === "number") {
        totals[path] = toFiniteNumber(totals[path], 0) + value;
      } else {
        walk(value, path);
      }
    }
  }

  for (const slotData of Object.values(upgrades || {})) {
    const mods = slotData?.effectData?.wielderMods;
    walk(mods);
  }

  return totals;
}

// Foundry's document create/update pipeline auto-expands any dotted key it finds in the data —
// {"system.strain.max": 1} silently becomes {system: {strain: {max: 1}}} once stored. collectWielderMods
// already tolerates this by walking and rebuilding the path itself, but a multiplier (e.g. a
// talent's per-rank scaling) needs to be applied to the actual numeric leaves first, wherever
// they ended up nested. Recurses regardless of whether the structure is flat or expanded.
function scaleNumericLeaves(obj, factor) {
  if (typeof obj === "number") return obj * factor;
  if (!obj || typeof obj !== "object") return obj;

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = scaleNumericLeaves(value, factor);
  }
  return result;
}

// Skill ranks live on separate owned Item documents (type "skill"), not on actor.system, so
// they can't be targeted by an ActiveEffect change key the way characteristics can. Bonuses
// are tracked here by skill name and applied via direct mutation in syncActorSkillMods.
function collectSkillMods(upgrades) {
  const totals = {};

  for (const slotData of Object.values(upgrades || {})) {
    const mods = slotData?.effectData?.skillMods;
    if (!mods || typeof mods !== "object") continue;

    for (const [skillName, amount] of Object.entries(mods)) {
      const name = String(skillName ?? "").trim();
      if (!name) continue;
      totals[name] = toFiniteNumber(totals[name], 0) + toFiniteNumber(amount, 0);
    }
  }

  return totals;
}

// Generic collector for any "named amount" effectData field (diceMods, targetDiceMods) —
// same shape as collectSkillMods but reusable across multiple field names.
function collectNamedMods(upgrades, fieldName) {
  const totals = {};

  for (const slotData of Object.values(upgrades || {})) {
    const mods = slotData?.effectData?.[fieldName];
    if (!mods || typeof mods !== "object") continue;

    for (const [name, amount] of Object.entries(mods)) {
      totals[name] = toFiniteNumber(totals[name], 0) + toFiniteNumber(amount, 0);
    }
  }

  return totals;
}

// The Genesys system reads dice-pool bonuses directly off ActiveEffect changes with keys like
// "genesys.pool.skill.self.<exact skill name>", mode CUSTOM, and a value string of concatenated
// single-character glyphs (confirmed against the system's own bundled source — it manually
// scans actor.effects for these rather than using Foundry's native effect-application
// pipeline, so CUSTOM-mode changes here are inert to anything else and safe to mix into the
// same effect as the ADD-mode wielderMods changes). Friendly names below map to those glyphs;
// a fixed iteration order (not Object.entries insertion order) keeps the built string
// deterministic so didWielderPayloadChange's array comparison doesn't see spurious "changes"
// between syncs that didn't actually change anything.
const DICE_POOL_GLYPHS = {
  boost: "B",
  setback: "S",
  ability: "A",
  proficiency: "P",
  difficulty: "D",
  challenge: "C"
};
const DICE_POOL_GLYPH_ORDER = ["boost", "setback", "ability", "proficiency", "difficulty", "challenge"];

function buildPoolGlyphString(mods) {
  const parts = [];

  for (const dieType of DICE_POOL_GLYPH_ORDER) {
    const count = toFiniteNumber(mods?.[dieType], 0);
    if (count === 0) continue;

    const glyph = DICE_POOL_GLYPHS[dieType];
    const token = count > 0 ? glyph : `-${glyph}`;
    parts.push(token.repeat(Math.abs(count)));
  }

  return parts.join("");
}

// One change per skill the weapon is used with — the system matches on the exact skill name
// being rolled, so a weapon usable with multiple skills needs a separate change per skill.
function buildDicePoolChanges(diceMods, skillNames) {
  const glyphString = buildPoolGlyphString(diceMods);
  if (!glyphString) return [];

  const uniqueSkillNames = Array.from(new Set((skillNames || []).filter(Boolean))).sort();

  return uniqueSkillNames.map((skillName) => ({
    key: `genesys.pool.skill.self.${skillName}`,
    mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
    value: glyphString,
    priority: 20
  }));
}

// Defensive bonus: boosts an attacker's pool when this actor (wearing/wielding the item) is
// the one being targeted. The key is a fixed literal string — no skill name involved.
function buildTargetDicePoolChanges(targetDiceMods) {
  const glyphString = buildPoolGlyphString(targetDiceMods);
  if (!glyphString) return [];

  return [{
    key: "genesys.pool.check.target.",
    mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
    value: glyphString,
    priority: 20
  }];
}

function buildWielderEffectChanges(wielderMods) {
  return Object.entries(wielderMods)
    .sort(([leftPath], [rightPath]) => leftPath.localeCompare(rightPath))
    .filter(([, amount]) => toFiniteNumber(amount, 0) !== 0)
    .map(([path, amount]) => ({
      key: path,
      mode: CONST.ACTIVE_EFFECT_MODES.ADD,
      value: String(toFiniteNumber(amount, 0)),
      priority: 20
    }));
}

function getWielderEffectPayload(weapon, changes) {
  return {
    name: `${weapon.name}`,
    icon: weapon.img,
    origin: weapon.uuid,
    disabled: false,
    transfer: false,
    changes,
    flags: {
      [MODULE_ID]: {
        [WIELDER_MOD_EFFECT_FLAG]: true,
        [WIELDER_MOD_EFFECT_SOURCE_FLAG]: weapon.id
      }
    }
  };
}

function getTalentEffectPayload(talent, changes) {
  return {
    name: `${talent.name}`,
    icon: talent.img,
    origin: talent.uuid,
    disabled: false,
    transfer: false,
    changes,
    flags: {
      [MODULE_ID]: {
        [TALENT_MOD_EFFECT_FLAG]: true,
        [TALENT_MOD_EFFECT_SOURCE_FLAG]: talent.id
      }
    }
  };
}

function didWielderPayloadChange(effect, nextPayload) {
  if (!effect) return true;

  if (String(effect.name ?? "") !== String(nextPayload.name ?? "")) return true;
  if (String(effect.icon ?? "") !== String(nextPayload.icon ?? "")) return true;
  if (Boolean(effect.disabled) !== Boolean(nextPayload.disabled)) return true;

  const currentChanges = Array.isArray(effect.changes) ? effect.changes : [];
  const nextChanges = Array.isArray(nextPayload.changes) ? nextPayload.changes : [];
  return JSON.stringify(currentChanges) !== JSON.stringify(nextChanges);
}

function shouldSyncWielderEffects(changed) {
  const moduleFlags = changed?.flags?.[MODULE_ID];
  // unsetFlag() encodes removal as a "-=upgrades" deletion key rather than "upgrades",
  // so both forms need to be checked or a fully-cleared upgrade slot never re-syncs.
  const upgradesTouched = Boolean(
    moduleFlags && (
      foundry.utils.hasProperty(moduleFlags, "upgrades")
      || foundry.utils.hasProperty(moduleFlags, "-=upgrades")
    )
  );

  return upgradesTouched
    || foundry.utils.hasProperty(changed, "system.state")
    || foundry.utils.hasProperty(changed, "img")
    || foundry.utils.hasProperty(changed, "name");
}

// Centralized effect syncing queue to prevent race conditions
const syncQueue = new Map();
let syncTimer = null;

function queueSync(actor) {
  if (!actor) return;

  syncQueue.set(actor.id, actor);

  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(async () => {
    const actors = Array.from(syncQueue.values());
    syncQueue.clear();

    for (const queuedActor of actors) {
      try {
        await syncActorWielderEffects(queuedActor);
        await syncActorSkillMods(queuedActor);
        await syncActorTalentEffects(queuedActor);
      } catch (error) {
        console.error(`[${MODULE_ID}] Error syncing effects for ${queuedActor.name}:`, error);
      }
    }
  }, 100); // Debounce 100ms
}

// setFlag()/update() deep-merge nested objects with whatever is already stored, so writing a
// trimmed-down "upgrades" object on top of stale data (e.g. a removed slot, or a slot's old
// wielderMods/statMods sub-keys) never actually clears the old keys. Unset first so there's
// nothing left for the next write to merge against.
async function replaceUpgradesFlag(item, upgrades) {
  await item.unsetFlag(MODULE_ID, "upgrades");
  if (upgrades && Object.keys(upgrades).length > 0) {
    await item.setFlag(MODULE_ID, "upgrades", upgrades);
  }
}

// Clears stale upgrade slots (quality removed from the item sheet) and recalculates
// stats/image from whatever upgrades remain. Returns true if anything was actually changed,
// so callers can stay silent when there was nothing to fix. Works for any category — the
// blade-color image logic is gated off for everything except lightsaber.
async function refreshItemUpgradeData(item, categoryConfig) {
  let changed = false;

  const upgrades = foundry.utils.deepClone(item.getFlag(MODULE_ID, "upgrades") || {});

  const currentNames = new Set(
    (Array.isArray(item.system?.qualities) ? item.system.qualities : [])
      .map((q) => String(q?.name ?? q?.label ?? "").toLowerCase().trim())
      .filter(Boolean)
  );

  let upgradesChanged = false;
  for (const [slotKey, slotData] of Object.entries(upgrades)) {
    const qName = String(slotData?.qualityData?.name ?? "").toLowerCase().trim();
    if (qName && !currentNames.has(qName)) {
      delete upgrades[slotKey];
      upgradesChanged = true;
    }
  }

  if (upgradesChanged) {
    await replaceUpgradesFlag(item, upgrades);
    changed = true;
  }

  const hasAnyUpgrades = Object.keys(upgrades).length > 0;
  const statFields = categoryConfig.statFields;
  const derivedStats = hasAnyUpgrades
    ? getDerivedStats(item, upgrades, statFields)
    : getBaseStats(item, statFields);

  const updatePayload = {};
  let needsStatUpdate = false;
  for (const field of statFields) {
    const current = item.system?.[field];
    const desired = derivedStats[field];
    const currentNumeric = asFiniteNumberOrNull(current);
    const desiredNumeric = asFiniteNumberOrNull(desired);
    const fieldChanged = (
      currentNumeric !== null && desiredNumeric !== null
        ? currentNumeric !== desiredNumeric
        : current !== desired
    );
    if (fieldChanged) {
      needsStatUpdate = true;
      updatePayload[`system.${field}`] = desired;
    }
  }

  let activeColor = null;
  if (categoryConfig.supportsBladeColor) {
    const variant = getWeaponVariant(item);
    const fallbackBaseImg = baseImages[variant] ?? baseImages.single ?? item.img;
    const baseImg = item.getFlag(MODULE_ID, "baseImg") ?? fallbackBaseImg;

    activeColor = (
      String(
        upgrades.colorCrystal?.color
        ?? parseColorFromText(upgrades.colorCrystal?.sourceGearName)
        ?? parseColorFromText(upgrades.colorCrystal?.qualityData?.name)
        ?? ""
      ).toLowerCase().trim()
      || null
    );
    const desiredImg = activeColor
      ? (crystalImages[variant]?.[activeColor] ?? baseImg)
      : baseImg;

    if (item.img !== desiredImg) updatePayload.img = desiredImg;

    if (!activeColor) {
      await item.unsetFlag(MODULE_ID, "baseImg");
    }
  }

  if (needsStatUpdate || updatePayload.img) {
    await item.update(updatePayload);
    changed = true;
  }

  if (!hasAnyUpgrades) {
    await item.unsetFlag(MODULE_ID, "baseStats");
  }

  return changed;
}

// The real "is this equipped" signal in this system — confirmed by checking the Genesys
// system's own bundled source, where it sums armor soak/defense via the same field — is the
// shared equipment-template "state" string, not separate equipped/carried booleans (which
// don't actually exist here). Works identically for weapons and armor.
function isItemActive(item) {
  return Boolean(item?.system?.state === "equipped");
}

const warnedMissingDiceSkills = new Set();

// Improved syncActorWielderEffects with better error handling
async function syncActorWielderEffects(actor) {
  if (!actor || actor.documentName !== "Actor") return;

  // Check permissions more carefully
  if (!actor.isOwner && !game.user.isGM) {
    console.debug(`[${MODULE_ID}] Skipping sync for ${actor.name} - insufficient permissions`);
    return;
  }

  console.log(`[${MODULE_ID}] Syncing wielder effects for actor: ${actor.name}`);

  try {
    // Collect all wielded/worn items and their desired effects
    const desiredByWeapon = new Map();
    const weapons = actor.items.filter(item =>
      getCategoryConfig(item) && isItemActive(item)
    );

    // Armor (and any other non-weapon category) has no system.skills of its own, so a
    // "trigger on any attack roll" diceMods bonus from a worn item has no skill to target.
    // Instead, target whichever skill(s) the actor's currently-wielded weapon(s) actually use —
    // that's what "any attack roll" means in practice, and it follows whatever's equipped.
    const wieldedWeaponSkillNames = new Set();
    for (const item of weapons) {
      if (getCategoryConfig(item)?.itemType !== "weapon") continue;
      for (const skillName of (Array.isArray(item.system?.skills) ? item.system.skills : [])) {
        wieldedWeaponSkillNames.add(skillName);
      }
    }

    for (const weapon of weapons) {
      const categoryConfig = getCategoryConfig(weapon);
      const upgrades = weapon.getFlag(MODULE_ID, "upgrades") || {};

      // Some base items (e.g. specialization robes) grant their own bonuses without requiring
      // an upgrade in a slot — same effectData shape upgrades use (wielderMods/diceMods/
      // targetDiceMods/skillMods), just stored directly on the item. Modeled as a synthetic
      // slot merged in before the existing collect* helpers run, so none of them need changes.
      const innateEffectData = weapon.getFlag(MODULE_ID, "innateEffectData");
      const upgradesForMods = innateEffectData
        ? { ...upgrades, __innate: { effectData: innateEffectData } }
        : upgrades;

      const wieldMods = collectWielderMods(upgradesForMods);
      const wielderChanges = buildWielderEffectChanges(wieldMods);

      const skillNames = categoryConfig.itemType === "weapon"
        ? (Array.isArray(weapon.system?.skills) ? weapon.system.skills : [])
        : Array.from(wieldedWeaponSkillNames);
      const diceMods = collectNamedMods(upgradesForMods, "diceMods");
      const diceChanges = buildDicePoolChanges(diceMods, skillNames);

      const targetDiceMods = collectNamedMods(upgradesForMods, "targetDiceMods");
      const targetDiceChanges = buildTargetDicePoolChanges(targetDiceMods);

      const effectChanges = [...wielderChanges, ...diceChanges, ...targetDiceChanges];

      if (effectChanges.length > 0) {
        desiredByWeapon.set(weapon.id, getWielderEffectPayload(weapon, effectChanges));
      }

      // Catches the class of bug that motivated this check in the first place: a weapon's
      // system.skills naming a skill that doesn't actually exist on the actor (e.g. a typo'd
      // or mismatched skill name) would otherwise silently do nothing.
      if (diceChanges.length > 0) {
        const ownedSkillNames = new Set(
          actor.items.filter((i) => i.type === "skill").map((i) => String(i.name ?? "").trim())
        );
        for (const skillName of skillNames) {
          if (ownedSkillNames.has(skillName)) continue;
          const warnKey = `${actor.id}:${weapon.id}:${skillName}`;
          if (warnedMissingDiceSkills.has(warnKey)) continue;
          warnedMissingDiceSkills.add(warnKey);
          ui.notifications.warn(`${weapon.name}'s bonus dice target a "${skillName}" skill that ${actor.name} doesn't have.`);
        }
      }
    }

    // Get all existing module-managed effects
    const existingEffects = actor.effects.filter(effect =>
      effect.getFlag(MODULE_ID, WIELDER_MOD_EFFECT_FLAG)
    );

    // Determine which effects to delete
    const toDelete = [];
    const existingByWeapon = new Map();

    for (const effect of existingEffects) {
      const sourceWeaponId = effect.getFlag(MODULE_ID, WIELDER_MOD_EFFECT_SOURCE_FLAG);

      if (!sourceWeaponId) {
        // Clean up effects with missing source ID
        toDelete.push(effect.id);
        console.warn(`[${MODULE_ID}] Found orphaned effect without source weapon ID`);
        continue;
      }

      if (!desiredByWeapon.has(sourceWeaponId)) {
        toDelete.push(effect.id);
        continue;
      }

      // If a prior run ever left more than one effect for the same weapon, keep
      // only the first and delete the rest instead of silently shadowing them.
      if (existingByWeapon.has(sourceWeaponId)) {
        toDelete.push(effect.id);
        continue;
      }

      existingByWeapon.set(sourceWeaponId, effect);
    }

    // Delete stale effects
    if (toDelete.length > 0) {
      console.log(`[${MODULE_ID}] Deleting ${toDelete.length} stale effects for ${actor.name}`);
      await actor.deleteEmbeddedDocuments("ActiveEffect", toDelete);
    }

    // Determine which effects to create or update
    const toCreate = [];
    const toUpdate = [];

    for (const [weaponId, payload] of desiredByWeapon.entries()) {
      const existing = existingByWeapon.get(weaponId);

      if (!existing) {
        toCreate.push(payload);
      } else if (didWielderPayloadChange(existing, payload)) {
        toUpdate.push({
          _id: existing.id,
          name: payload.name,
          icon: payload.icon,
          origin: payload.origin,
          disabled: payload.disabled,
          transfer: payload.transfer,
          changes: payload.changes,
          flags: payload.flags
        });
      }
    }

    // Batch create new effects
    if (toCreate.length > 0) {
      console.log(`[${MODULE_ID}] Creating ${toCreate.length} new effects for ${actor.name}`);
      await actor.createEmbeddedDocuments("ActiveEffect", toCreate);
    }

    // Batch update existing effects
    if (toUpdate.length > 0) {
      console.log(`[${MODULE_ID}] Updating ${toUpdate.length} effects for ${actor.name}`);
      await actor.updateEmbeddedDocuments("ActiveEffect", toUpdate);
    }

  } catch (error) {
    console.error(`[${MODULE_ID}] Error syncing wielder effects for ${actor.name}:`, error);
  }
}

// Talents have no "equipped" concept — owning one is enough for its effect to apply, unlike
// weapons/armor where syncActorWielderEffects exists specifically to gate on equip state. The
// remaining wrinkle: Foundry's ADD-mode effects don't auto-scale by an item's rank the way
// Genesys's own dice-pool (CUSTOM-mode) mechanism does, so a "ranked" talent's wielderMods are
// written in the source JSON as a per-rank amount and scaled by the talent's current
// system.rank here before building the effect. Uses its own TALENT_MOD_EFFECT_FLAG pair rather
// than reusing WIELDER_MOD_EFFECT_FLAG so this sync's stale-effect cleanup never collides with
// syncActorWielderEffects's (which only knows about weapon/armor source ids).
async function syncActorTalentEffects(actor) {
  if (!actor || actor.documentName !== "Actor") return;
  if (!actor.isOwner && !game.user.isGM) return;

  try {
    const desiredByTalent = new Map();
    const talents = actor.items.filter((item) => item.type === "talent");

    for (const talent of talents) {
      const innateEffectData = talent.getFlag(MODULE_ID, "innateEffectData");
      if (!innateEffectData?.wielderMods) continue;

      const rank = toFiniteNumber(talent.system?.rank, 1);
      const scaledWielderMods = scaleNumericLeaves(innateEffectData.wielderMods, rank);

      // Reuses collectWielderMods (rather than reading scaledWielderMods directly) so the
      // Foundry dot-expansion quirk noted above is handled the same proven way as everywhere
      // else wielderMods is consumed.
      const wieldMods = collectWielderMods({ __innate: { effectData: { wielderMods: scaledWielderMods } } });
      const wielderChanges = buildWielderEffectChanges(wieldMods);
      if (wielderChanges.length > 0) {
        desiredByTalent.set(talent.id, getTalentEffectPayload(talent, wielderChanges));
      }
    }

    const existingEffects = actor.effects.filter((effect) =>
      effect.getFlag(MODULE_ID, TALENT_MOD_EFFECT_FLAG)
    );

    const toDelete = [];
    const existingByTalent = new Map();

    for (const effect of existingEffects) {
      const sourceTalentId = effect.getFlag(MODULE_ID, TALENT_MOD_EFFECT_SOURCE_FLAG);

      if (!sourceTalentId || !desiredByTalent.has(sourceTalentId) || existingByTalent.has(sourceTalentId)) {
        toDelete.push(effect.id);
        continue;
      }

      existingByTalent.set(sourceTalentId, effect);
    }

    if (toDelete.length > 0) {
      await actor.deleteEmbeddedDocuments("ActiveEffect", toDelete);
    }

    const toCreate = [];
    const toUpdate = [];

    for (const [talentId, payload] of desiredByTalent.entries()) {
      const existing = existingByTalent.get(talentId);

      if (!existing) {
        toCreate.push(payload);
      } else if (didWielderPayloadChange(existing, payload)) {
        toUpdate.push({
          _id: existing.id,
          name: payload.name,
          icon: payload.icon,
          origin: payload.origin,
          disabled: payload.disabled,
          transfer: payload.transfer,
          changes: payload.changes,
          flags: payload.flags
        });
      }
    }

    if (toCreate.length > 0) {
      await actor.createEmbeddedDocuments("ActiveEffect", toCreate);
    }
    if (toUpdate.length > 0) {
      await actor.updateEmbeddedDocuments("ActiveEffect", toUpdate);
    }
  } catch (error) {
    console.error(`[${MODULE_ID}] Error syncing talent effects for ${actor.name}:`, error);
  }
}

// --- Skill Tree module integration (theripper93's premium "Skill Tree") -------------------
// Skill-tree points are a deliberately separate currency from Genesys XP (granted manually by
// the GM at session end, e.g. "10 XP and 1 skill point"), not derived/translated from it — so
// no onUnlockScript or cross-module XP syncing is needed. The only thing worth automating is
// setting each node's point cost to match its tier (5 XP per tier == 1 skill point per tier, by
// the GM's own conversion rate), so nodes don't need their cost hand-set.
const SKILL_TREE_MODULE_ID = "skill-tree";

// True if any actor has spent at least one point on this node already. Checked before changing
// a node's point cost — skill-tree tracks points-spent per actor as {uuid, points} entries under
// the actor's own "skills" flag, keyed by the node's uuid. Raising/lowering an already-spent
// node's cost could desync it (the module compares points spent against the new max to decide
// whether the linked item should still be granted), so those are left untouched and logged.
function hasAnyActorSpentPoints(pageUuid) {
  return game.actors.some((actor) => {
    const skills = actor.getFlag(SKILL_TREE_MODULE_ID, "skills");
    if (!Array.isArray(skills)) return false;
    return skills.some((s) => s.uuid === pageUuid && toFiniteNumber(s.points, 0) > 0);
  });
}

// Sets each skill-tree node's point cost to match its tier *within this tree* — its row, not
// the linked talent's own intrinsic system.tier. Matches how official Genesys specialization
// trees actually work: the same talent can appear at different tiers across different trees,
// and its cost is set by where it's placed in the tree it's currently in, not a fixed property
// of the talent itself. Diffed so a clean world doesn't rewrite every node every reload.
async function syncSkillTreeNodeCosts() {
  const result = { updated: 0, skipped: 0, errors: 0 };
  if (!game.modules.get(SKILL_TREE_MODULE_ID)?.active) return result;

  const trees = game.journal.filter((j) => j.getFlag(SKILL_TREE_MODULE_ID, "isSkillTree"));

  for (const tree of trees) {
    for (const page of tree.pages) {
      try {
        const itemUuids = page.getFlag(SKILL_TREE_MODULE_ID, "itemUuids") ?? [];
        if (itemUuids.length === 0) continue;

        // row is 0-indexed (row 0 == Tier 1), confirmed against this tree's own existing nodes.
        const row = toFiniteNumber(page.getFlag(SKILL_TREE_MODULE_ID, "row"), 0);
        const cost = row + 1;

        const currentCost = page.getFlag(SKILL_TREE_MODULE_ID, "points") ?? 1;
        if (currentCost === cost) continue;

        if (hasAnyActorSpentPoints(page.uuid)) {
          console.warn(`[${MODULE_ID}] Skipped re-costing skill tree node "${page.name}" (${page.uuid}) — at least one actor has already spent points on it. Current cost ${currentCost}, computed cost ${cost}. Reconcile manually if this is intentional.`);
          result.skipped++;
          continue;
        }

        await page.setFlag(SKILL_TREE_MODULE_ID, "points", cost);
        result.updated++;
      } catch (error) {
        console.error(`[${MODULE_ID}] Skill tree node sync failed for "${page.name}":`, error);
        result.errors++;
      }
    }
  }

  return result;
}
// --- End Skill Tree module integration -----------------------------------------------------

const SKILL_MOD_AMOUNT_FLAG = "skillModAmount";
const warnedMissingSkills = new Set();

// Applies/removes skillMods bonuses by directly mutating the matching owned skill Item's rank.
// The previously-applied amount is tracked in a flag and subtracted from the skill's current
// rank to infer its true base each run, so a GM manually changing the rank in between syncs
// (e.g. spending XP) is respected rather than overwritten.
async function syncActorSkillMods(actor) {
  if (!actor || actor.documentName !== "Actor") return;
  if (!actor.isOwner && !game.user.isGM) return;

  try {
    const desiredBySkillName = new Map();
    const weapons = actor.items.filter((item) =>
      getCategoryConfig(item) && isItemActive(item)
    );

    for (const weapon of weapons) {
      const upgrades = weapon.getFlag(MODULE_ID, "upgrades") || {};

      // Same innate-effectData merge used in syncActorWielderEffects, so a base item's own
      // built-in skillMods (e.g. a specialization robe) apply without needing a slotted upgrade.
      const innateEffectData = weapon.getFlag(MODULE_ID, "innateEffectData");
      const upgradesForMods = innateEffectData
        ? { ...upgrades, __innate: { effectData: innateEffectData } }
        : upgrades;

      const skillMods = collectSkillMods(upgradesForMods);

      for (const [skillName, amount] of Object.entries(skillMods)) {
        if (toFiniteNumber(amount, 0) === 0) continue;
        const key = skillName.toLowerCase();
        const entry = desiredBySkillName.get(key) ?? { displayName: skillName, amount: 0 };
        entry.amount += toFiniteNumber(amount, 0);
        desiredBySkillName.set(key, entry);
      }
    }

    const skillItems = actor.items.filter((item) => item?.type === "skill");
    const skillByName = new Map(
      skillItems.map((item) => [String(item.name ?? "").toLowerCase().trim(), item])
    );

    const touchedNames = new Set([
      ...desiredBySkillName.keys(),
      ...skillItems
        .filter((item) => toFiniteNumber(item.getFlag(MODULE_ID, SKILL_MOD_AMOUNT_FLAG), 0) !== 0)
        .map((item) => String(item.name ?? "").toLowerCase().trim())
    ]);

    for (const key of touchedNames) {
      const skill = skillByName.get(key);
      const desired = desiredBySkillName.get(key);

      if (!skill) {
        if (desired) {
          const warnKey = `${actor.id}:${key}`;
          if (!warnedMissingSkills.has(warnKey)) {
            warnedMissingSkills.add(warnKey);
            ui.notifications.warn(`${actor.name} has no "${desired.displayName}" skill — cannot apply upgrade bonus.`);
          }
        }
        continue;
      }

      const previousAmount = toFiniteNumber(skill.getFlag(MODULE_ID, SKILL_MOD_AMOUNT_FLAG), 0);
      const currentRank = toFiniteNumber(skill.system?.rank, 0);
      const baseRank = currentRank - previousAmount;
      const desiredAmount = toFiniteNumber(desired?.amount, 0);
      const desiredRank = baseRank + desiredAmount;

      if (desiredAmount === previousAmount && currentRank === desiredRank) continue;

      if (desiredAmount === 0) {
        await skill.unsetFlag(MODULE_ID, SKILL_MOD_AMOUNT_FLAG);
        await skill.update({ "system.rank": baseRank });
        continue;
      }

      await skill.setFlag(MODULE_ID, SKILL_MOD_AMOUNT_FLAG, desiredAmount);
      await skill.update({ "system.rank": desiredRank });
    }
  } catch (error) {
    console.error(`[${MODULE_ID}] Error syncing skill mods for ${actor.name}:`, error);
  }
}

// Improved event handlers with debouncing
Hooks.on("createItem", async (item) => {
  const actor = item.parent;
  if (actor?.documentName !== "Actor") return;

  if (item.type === "talent") {
    queueSync(actor);
    return;
  }

  if (getCategoryConfig(item) && isItemActive(item)) {
    queueSync(actor);
  }
});

Hooks.on("deleteItem", async (item) => {
  const actor = item.parent;
  if (actor?.documentName !== "Actor") return;

  if (item.type === "talent" || getCategoryConfig(item)) {
    queueSync(actor);
  }
});

Hooks.on("updateItem", async (item, changed) => {
  const actor = item.parent;
  if (!actor || actor.documentName !== "Actor") return;

  // Talents have no equip state to watch — only rank (and name/img, for the effect's display)
  // ever need a re-sync.
  if (item.type === "talent") {
    if (
      foundry.utils.hasProperty(changed, "system.rank")
      || foundry.utils.hasProperty(changed, "img")
      || foundry.utils.hasProperty(changed, "name")
    ) {
      queueSync(actor);
    }
    return;
  }

  if (!getCategoryConfig(item)) return;

  // Only sync if relevant properties changed
  if (shouldSyncWielderEffects(changed)) {
    queueSync(actor);
  }
});

// Add hook for when items are equipped/unequipped
Hooks.on("updateActor", async (actor, changed) => {
  // Check if any owned items' wielded status changed
  const hasWieldChange = actor.items.some(item =>
    getCategoryConfig(item) && shouldSyncWielderEffects(changed)
  );

  if (hasWieldChange) {
    queueSync(actor);
  }
});

// Each upgrade category's source JSON and the compendium pack it gets reflagged onto. Add an
// entry here whenever a new category's upgrade content/compendium is created.
const UPGRADE_EFFECTS_SOURCES = [
  {
    effectsPath: `modules/${MODULE_ID}/scripts/upgrades/upgrade-effects.json`,
    packId: `${MODULE_ID}.upgrades`
  },
  {
    effectsPath: `modules/${MODULE_ID}/scripts/upgrades/armor-effects.json`,
    packId: `${MODULE_ID}.upgrades`
  },
  {
    effectsPath: `modules/${MODULE_ID}/scripts/upgrades/vibrosword-effects.json`,
    packId: `${MODULE_ID}.upgrades`
  },
  {
    effectsPath: `modules/${MODULE_ID}/scripts/upgrades/blaster-effects.json`,
    packId: `${MODULE_ID}.upgrades`
  }
];

// Pushes an upgrade-effects JSON file onto the matching compendium items' flags, mirroring the
// manual reflag macro. Skips items that already match (diffed against current flags) so a
// clean world doesn't rewrite every item on every load. Temporarily unlocks the pack if needed
// and restores its original lock state afterward.
async function reflagCompendiumItems(effectsPath, packId) {
  const result = { updated: [], missing: [], failed: [] };

  const pack = game.packs.get(packId);
  if (!pack) {
    console.warn(`[${MODULE_ID}] Compendium not found: ${packId}`);
    return result;
  }

  let effectsData;
  try {
    const response = await fetch(effectsPath, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    effectsData = await response.json();
  } catch (error) {
    console.error(`[${MODULE_ID}] Failed to load ${effectsPath}`, error);
    return result;
  }

  const wasLocked = pack.locked;
  if (wasLocked) await pack.configure({ locked: false });

  try {
    const index = await pack.getIndex({ fields: ["name"] });
    const byName = new Map(index.map((e) => [String(e.name).toLowerCase().trim(), e]));

    for (const [itemName, payload] of Object.entries(effectsData)) {
      const hit = byName.get(String(itemName).toLowerCase().trim());
      if (!hit) {
        result.missing.push(itemName);
        continue;
      }

      try {
        const doc = await pack.getDocument(hit._id);

        const desiredUpgradeType = payload.upgradeType ?? null;
        const desiredCategory = payload.category ?? null;
        const desiredQualityData = foundry.utils.deepClone(payload.qualityData ?? {});
        const desiredEffectData = foundry.utils.deepClone(payload.effectData ?? {});
        const hasColor = Object.prototype.hasOwnProperty.call(payload, "color");
        const desiredColor = hasColor ? payload.color : undefined;

        const currentUpgradeType = doc.getFlag(MODULE_ID, "upgradeType") ?? null;
        const currentCategory = doc.getFlag(MODULE_ID, "category") ?? null;
        const currentQualityData = doc.getFlag(MODULE_ID, "qualityData") ?? {};
        const currentEffectData = doc.getFlag(MODULE_ID, "effectData") ?? {};
        const currentColor = doc.getFlag(MODULE_ID, "color");

        const needsUpdate = (
          currentUpgradeType !== desiredUpgradeType
          || currentCategory !== desiredCategory
          || JSON.stringify(currentQualityData) !== JSON.stringify(desiredQualityData)
          || JSON.stringify(currentEffectData) !== JSON.stringify(desiredEffectData)
          || (hasColor ? currentColor !== desiredColor : currentColor !== undefined)
        );

        if (!needsUpdate) continue;

        // setFlag()/update() deep-merge nested objects with whatever is already stored (see
        // replaceUpgradesFlag above) so qualityData/effectData must be cleared before rewriting,
        // or stale sub-keys from a previous run never actually go away.
        await doc.unsetFlag(MODULE_ID, "qualityData");
        await doc.unsetFlag(MODULE_ID, "effectData");
        await doc.update({
          [`flags.${MODULE_ID}.upgradeType`]: desiredUpgradeType,
          [`flags.${MODULE_ID}.category`]: desiredCategory
        });
        await doc.setFlag(MODULE_ID, "qualityData", desiredQualityData);
        await doc.setFlag(MODULE_ID, "effectData", desiredEffectData);

        if (hasColor) {
          await doc.setFlag(MODULE_ID, "color", desiredColor);
        } else {
          await doc.unsetFlag(MODULE_ID, "color");
        }

        result.updated.push(itemName);
      } catch (error) {
        console.error(`[${MODULE_ID}] Reflag failed for`, itemName, error);
        result.failed.push(itemName);
      }
    }
  } finally {
    if (wasLocked) await pack.configure({ locked: true });
  }

  return result;
}

// All base weapon/armor items now live in one "equipment" compendium, organized into folders
// by category rather than separate packs. Category is set explicitly per item at creation time
// (see the item-creation console scripts), since pack location no longer implies category.
const EQUIPMENT_PACK_ID = `${MODULE_ID}.equipment`;

// The base lightsaber items were created with system.skills: ["Lightsaber"], but the actual
// skill Item is named "Lightsabers" (plural) — the Genesys system requires an exact-match
// skill name for both its own native attack-from-weapon flow and this module's dice-pool mods,
// so this typo silently breaks both. Add an entry here for any future name corrections needed.
const SKILL_NAME_FIXES = {
  "Lightsaber": "Lightsabers"
};

function fixWeaponSkillNames(skills) {
  if (!Array.isArray(skills)) return null;

  let changed = false;
  const fixed = skills.map((name) => {
    if (Object.prototype.hasOwnProperty.call(SKILL_NAME_FIXES, name)) {
      changed = true;
      return SKILL_NAME_FIXES[name];
    }
    return name;
  });

  return changed ? fixed : null;
}

// Fixes system.skills both on the compendium source (the "equipment" pack) and on any
// already-placed copies on actors — base items dropped onto a character sheet become
// independent copies, so the compendium fix alone wouldn't reach those.
async function migrateWeaponSkillNames() {
  let migrated = 0;

  const pack = game.packs.get(EQUIPMENT_PACK_ID);
  if (pack) {
    const wasLocked = pack.locked;
    if (wasLocked) await pack.configure({ locked: false });

    try {
      const index = await pack.getIndex();
      for (const entry of index) {
        const doc = await pack.getDocument(entry._id);
        const fixed = fixWeaponSkillNames(doc.system?.skills);
        if (fixed) {
          await doc.update({ "system.skills": fixed });
          migrated++;
        }
      }
    } finally {
      if (wasLocked) await pack.configure({ locked: true });
    }
  }

  for (const actor of game.actors) {
    for (const item of actor.items) {
      const fixed = fixWeaponSkillNames(item.system?.skills);
      if (fixed) {
        await item.update({ "system.skills": fixed });
        migrated++;
      }
    }
  }

  return migrated;
}

// Source JSON files describing full Item documents (system data + flags) that should exist in a
// compendium, created or updated to match on world load. Unlike
// UPGRADE_EFFECTS_SOURCES/reflagCompendiumItems, this creates the item itself if missing rather
// than only reflagging an existing one — these items aren't preceded by a hand-placed document
// the way upgrades are. Not equipment-specific despite the original name on the sync function —
// also used for talents, which have neither a category flag nor innateEffectData.
const EQUIPMENT_DATA_SOURCES = [
  {
    dataPath: `modules/${MODULE_ID}/scripts/equipment/robes.json`,
    packId: EQUIPMENT_PACK_ID
  }
];

const TALENT_PACK_ID = `${MODULE_ID}.talents`;
const TALENT_DATA_SOURCES = [
  {
    dataPath: `modules/${MODULE_ID}/scripts/talents/tier1-talents.json`,
    packId: TALENT_PACK_ID
  },
  {
    dataPath: `modules/${MODULE_ID}/scripts/talents/tier2-talents.json`,
    packId: TALENT_PACK_ID
  },
  {
    dataPath: `modules/${MODULE_ID}/scripts/talents/tier3-talents.json`,
    packId: TALENT_PACK_ID
  },
  {
    dataPath: `modules/${MODULE_ID}/scripts/talents/tier4-talents.json`,
    packId: TALENT_PACK_ID
  },
  {
    dataPath: `modules/${MODULE_ID}/scripts/talents/tier5-talents.json`,
    packId: TALENT_PACK_ID
  },
  {
    dataPath: `modules/${MODULE_ID}/scripts/talents/jedi-talents.json`,
    packId: TALENT_PACK_ID
  }
];

// Creates or updates compendium items from a name-keyed JSON file of full item data (type,
// system, flags). Diffed against current values so a clean world doesn't rewrite everything on
// every load. Only the system/flag keys present in the source are compared/written — fields not
// listed there (e.g. img) are left alone. flags.category/flags.innateEffectData are optional
// (talents have neither; only equipment uses them).
async function syncEquipmentItems(dataPath, packId) {
  const result = { created: [], updated: [], failed: [] };

  const pack = game.packs.get(packId);
  if (!pack) {
    console.warn(`[${MODULE_ID}] Compendium not found: ${packId}`);
    return result;
  }

  let itemsData;
  try {
    const response = await fetch(dataPath, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    itemsData = await response.json();
  } catch (error) {
    console.error(`[${MODULE_ID}] Failed to load ${dataPath}`, error);
    return result;
  }

  const wasLocked = pack.locked;
  if (wasLocked) await pack.configure({ locked: false });

  try {
    const index = await pack.getIndex({ fields: ["name"] });
    const byName = new Map(index.map((e) => [String(e.name).toLowerCase().trim(), e]));

    // Resolved by name rather than hardcoding folder IDs in the source JSON, since folder IDs
    // are pack/world-specific and would break if a folder is ever deleted and recreated. Missing
    // folders are created on demand (see below) — useful for a brand-new pack with none yet.
    // Existing items are never moved by this sync (see the update branch below) — this only
    // determines where brand-new items land, so manual filing is always respected afterward.
    const foldersByName = new Map();
    for (const folder of pack.folders ?? []) {
      foldersByName.set(String(folder.name).toLowerCase().trim(), folder.id);
    }

    for (const [itemName, payload] of Object.entries(itemsData)) {
      try {
        const desiredSystem = foundry.utils.deepClone(payload.system ?? {});
        const desiredCategory = payload.flags?.category ?? null;
        const desiredInnateEffectData = foundry.utils.deepClone(payload.flags?.innateEffectData ?? null);

        const hit = byName.get(String(itemName).toLowerCase().trim());

        if (!hit) {
          const desiredFolderName = payload.folder ?? null;
          let folderId = desiredFolderName
            ? foldersByName.get(String(desiredFolderName).toLowerCase().trim())
            : undefined;

          // First time this folder name is needed in this pack (e.g. a brand-new pack with no
          // folders yet) — create it once and cache it so later items in the same pass reuse it
          // instead of creating duplicates.
          if (desiredFolderName && !folderId) {
            const newFolder = await Folder.create(
              { name: desiredFolderName, type: "Item" },
              { pack: packId }
            );
            folderId = newFolder.id;
            foldersByName.set(String(desiredFolderName).toLowerCase().trim(), folderId);
          }

          await pack.documentClass.create(
            {
              name: itemName,
              type: payload.type,
              ...(folderId ? { folder: folderId } : {}),
              system: desiredSystem,
              flags: {
                [MODULE_ID]: {
                  ...(desiredCategory !== null ? { category: desiredCategory } : {}),
                  ...(desiredInnateEffectData ? { innateEffectData: desiredInnateEffectData } : {})
                }
              }
            },
            { pack: packId }
          );
          result.created.push(itemName);
          continue;
        }

        const doc = await pack.getDocument(hit._id);

        const currentSystemSubset = {};
        for (const key of Object.keys(desiredSystem)) {
          currentSystemSubset[key] = foundry.utils.getProperty(doc, `system.${key}`) ?? null;
        }
        const currentCategory = doc.getFlag(MODULE_ID, "category") ?? null;
        const currentInnateEffectData = doc.getFlag(MODULE_ID, "innateEffectData") ?? null;

        const needsUpdate = (
          JSON.stringify(currentSystemSubset) !== JSON.stringify(desiredSystem)
          || currentCategory !== desiredCategory
          || JSON.stringify(currentInnateEffectData) !== JSON.stringify(desiredInnateEffectData)
        );

        if (!needsUpdate) continue;

        const systemUpdate = {};
        for (const [key, value] of Object.entries(desiredSystem)) {
          systemUpdate[`system.${key}`] = value;
        }
        await doc.update(systemUpdate);
        if (desiredCategory !== null) {
          await doc.update({ [`flags.${MODULE_ID}.category`]: desiredCategory });
        }

        // Deep-merge bug strikes again for nested flag objects — unset before rewriting.
        // Also clears the older "innateWielderMods" flag name from items created before this
        // was generalized into the unified innateEffectData shape — harmless no-op otherwise.
        await doc.unsetFlag(MODULE_ID, "innateEffectData");
        await doc.unsetFlag(MODULE_ID, "innateWielderMods");
        if (desiredInnateEffectData) {
          await doc.setFlag(MODULE_ID, "innateEffectData", desiredInnateEffectData);
        }

        result.updated.push(itemName);
      } catch (error) {
        console.error(`[${MODULE_ID}] Equipment sync failed for`, itemName, error);
        result.failed.push(itemName);
      }
    }
  } finally {
    if (wasLocked) await pack.configure({ locked: true });
  }

  return result;
}

// Full data-integrity pass on world load: fixes weapon skill names, reflags compendium items
// from upgrade-effects.json, clears stale upgrade slots, recalculates stats/images, and syncs
// wielder/skill effects for every actor. GM-only so multiple connected clients don't redundantly
// race to write the same documents, and silent unless it actually fixes something (no
// notification on a clean load).
Hooks.once("ready", async () => {
  if (!game.user.isGM) return;

  let weaponsFixed = 0;
  let errors = 0;

  // Must run before the per-actor loop below so corrected skill names are in place before
  // dice-pool-mod skill-name checks run in the same pass.
  const skillNamesFixed = await migrateWeaponSkillNames().catch((error) => {
    console.error(`[${MODULE_ID}] Weapon skill name migration failed:`, error);
    errors++;
    return 0;
  });

  let reflagged = 0;
  for (const source of UPGRADE_EFFECTS_SOURCES) {
    const reflagResult = await reflagCompendiumItems(source.effectsPath, source.packId).catch((error) => {
      console.error(`[${MODULE_ID}] Compendium reflag failed for ${source.packId}:`, error);
      errors++;
      return { updated: [], missing: [], failed: [] };
    });

    if (reflagResult.missing.length > 0) {
      console.log(`[${MODULE_ID}] Reflag: items in ${source.effectsPath} with no match in ${source.packId}:`, reflagResult.missing);
    }
    errors += reflagResult.failed.length;
    reflagged += reflagResult.updated.length;
  }

  let itemsSynced = 0;
  for (const source of EQUIPMENT_DATA_SOURCES) {
    const syncResult = await syncEquipmentItems(source.dataPath, source.packId).catch((error) => {
      console.error(`[${MODULE_ID}] Equipment sync failed for ${source.packId}:`, error);
      errors++;
      return { created: [], updated: [], failed: [] };
    });

    errors += syncResult.failed.length;
    itemsSynced += syncResult.created.length + syncResult.updated.length;
  }

  for (const source of TALENT_DATA_SOURCES) {
    const syncResult = await syncEquipmentItems(source.dataPath, source.packId).catch((error) => {
      console.error(`[${MODULE_ID}] Talent sync failed for ${source.packId}:`, error);
      errors++;
      return { created: [], updated: [], failed: [] };
    });

    errors += syncResult.failed.length;
    itemsSynced += syncResult.created.length + syncResult.updated.length;
  }

  const skillTreeResult = await syncSkillTreeNodeCosts().catch((error) => {
    console.error(`[${MODULE_ID}] Skill tree node cost sync failed:`, error);
    errors++;
    return { updated: 0, skipped: 0, errors: 0 };
  });
  errors += skillTreeResult.errors;
  if (skillTreeResult.skipped > 0) {
    console.log(`[${MODULE_ID}] Skill tree: ${skillTreeResult.skipped} node(s) skipped re-costing (already in active play).`);
  }

  for (const actor of game.actors) {
    for (const item of actor.items) {
      const categoryConfig = getCategoryConfig(item);
      if (!categoryConfig || item.type !== categoryConfig.itemType) continue;

      try {
        if (await refreshItemUpgradeData(item, categoryConfig)) weaponsFixed++;
      } catch (error) {
        console.error(`[${MODULE_ID}] Error refreshing ${item.name} on ${actor.name}:`, error);
        errors++;
      }
    }

    try {
      await syncActorWielderEffects(actor);
      await syncActorSkillMods(actor);
      await syncActorTalentEffects(actor);
      await syncActorAlignmentEffect(actor);
    } catch (error) {
      console.error(`[${MODULE_ID}] Error syncing wielder effects for ${actor.name}:`, error);
      errors++;
    }
  }

  if (weaponsFixed > 0 || reflagged > 0 || itemsSynced > 0 || skillNamesFixed > 0 || skillTreeResult.updated > 0 || errors > 0) {
    console.log(`[${MODULE_ID}] Startup refresh: ${weaponsFixed} item(s) fixed, ${reflagged} compendium item(s) reflagged, ${itemsSynced} item(s) synced, ${skillNamesFixed} skill name(s) fixed, ${skillTreeResult.updated} skill tree node cost(s) synced${errors > 0 ? `, ${errors} error(s)` : ""}`);
    ui.notifications.info(`Genesys Lightsabers: refreshed ${weaponsFixed} item(s), reflagged ${reflagged} upgrade(s), synced ${itemsSynced} item(s) on startup.`);
  }
});

// --- Alignment tracking -----------------------------------------------------------------------
// Alignment is stored as a module flag (integer, -100 to +100) on the actor.
// +100 = full Light Side, -100 = full Dark Side, 0 = Neutral. Used descriptively in Force
// talent text to indicate when Boost or Setback applies — no passive dice effects are applied
// automatically, keeping Force neutral talents unaffected.

function getAlignmentLabel(value) {
  if (value >= 76) return "Strong Light Side";
  if (value >= 26) return "Light Side";
  if (value >= -25) return "Neutral";
  if (value >= -75) return "Dark Side";
  return "Strong Dark Side";
}

// Shared dialog for updating an actor's alignment. Accepts an absolute value (e.g. 50) or a
// signed delta (e.g. +10, -15), clamped to -100/+100. No macro needed — triggered from the
// sheet header button registered by both hooks below.
async function openAlignmentDialog(actor) {
  const current = toFiniteNumber(actor.getFlag(MODULE_ID, "alignment"), 0);
  const label = getAlignmentLabel(current);

  const raw = await Dialog.prompt({
    title: `Alignment — ${actor.name}`,
    content: `
      <div style="margin-bottom:8px">
        <strong>Current:</strong> ${current >= 0 ? "+" : ""}${current} (${label})
      </div>
      <label>New value</label>
      <input type="text" name="alignment" style="width:100%;margin-top:4px" autofocus>
    `,
    callback: (html) => html.find("[name=alignment]").val().trim(),
    rejectClose: false
  });

  if (!raw) return;

  let newAlignment;
  if (raw.startsWith("+") || (raw.startsWith("-") && raw.length > 1 && !isNaN(raw.slice(1)))) {
    const delta = Number(raw);
    if (isNaN(delta)) { ui.notifications.warn("Invalid alignment value."); return; }
    newAlignment = Math.max(-100, Math.min(100, current + delta));
  } else {
    const absolute = Number(raw);
    if (isNaN(absolute)) { ui.notifications.warn("Invalid alignment value."); return; }
    newAlignment = Math.max(-100, Math.min(100, absolute));
  }

  await actor.setFlag(MODULE_ID, "alignment", newAlignment);
  ui.notifications.info(`${actor.name}: ${newAlignment >= 0 ? "+" : ""}${newAlignment} (${getAlignmentLabel(newAlignment)})`);
}

// Genesys uses the old ActorSheet class, which fires getActorSheetHeaderButtons.
Hooks.on("getActorSheetHeaderButtons", (app, buttons) => {
  if (!app.object?.isOwner) return;
  buttons.unshift({ label: "Alignment", class: "alignment-tracker", icon: "fas fa-yin-yang", onclick: () => openAlignmentDialog(app.object) });
});

// Also register for ApplicationV2-based sheets (future-proofing).
Hooks.on("getHeaderControlsActorSheetV2", (app, controls) => {
  if (!app.document?.isOwner) return;
  controls.push({ label: "Alignment", icon: "fas fa-yin-yang", onClick: () => openAlignmentDialog(app.document) });
});

// Creates or updates a passive ActiveEffect on the actor whose name reflects the current
// alignment — e.g. "Alignment: Light Side (+45)". No changes array so it has no mechanical
// effect; it exists purely as a visible label on the character sheet's effects list, matching
// the look of any other passive ability entry. Identified by the isAlignmentEffect flag so
// the sync can find and update rather than creating duplicates.
const ALIGNMENT_EFFECT_FLAG = "isAlignmentEffect";

const ALIGNMENT_ICONS = {
  light:   `modules/${MODULE_ID}/assets/skills/lightsidev.png`,
  dark:    `modules/${MODULE_ID}/assets/skills/darksidev.png`,
  neutral: `modules/${MODULE_ID}/assets/skills/dark_vs_light.png`
};

async function syncActorAlignmentEffect(actor) {
  if (!actor || actor.documentName !== "Actor") return;
  if (!actor.isOwner && !game.user.isGM) return;

  const alignment = toFiniteNumber(actor.getFlag(MODULE_ID, "alignment"), 0);
  const label = getAlignmentLabel(alignment);
  const signed = alignment >= 0 ? `+${alignment}` : `${alignment}`;
  const desiredName = `Alignment: ${label} (${signed})`;
  const desiredIcon = alignment < -25 ? ALIGNMENT_ICONS.dark
    : alignment > 25 ? ALIGNMENT_ICONS.light
    : ALIGNMENT_ICONS.neutral;

  const existing = actor.effects.find((e) => e.getFlag(MODULE_ID, ALIGNMENT_EFFECT_FLAG));

  if (existing) {
    if (existing.name !== desiredName || existing.icon !== desiredIcon) {
      await existing.update({ name: desiredName, icon: desiredIcon });
    }
  } else {
    await actor.createEmbeddedDocuments("ActiveEffect", [{
      name: desiredName,
      icon: desiredIcon,
      disabled: false,
      transfer: false,
      changes: [],
      flags: { [MODULE_ID]: { [ALIGNMENT_EFFECT_FLAG]: true } }
    }]);
  }
}

// Re-sync the alignment effect whenever the alignment flag is updated directly.
Hooks.on("updateActor", async (actor, changed) => {
  if (!foundry.utils.hasProperty(changed, `flags.${MODULE_ID}.alignment`)) return;
  await syncActorAlignmentEffect(actor).catch((e) =>
    console.error(`[${MODULE_ID}] Error syncing alignment effect for ${actor.name}:`, e)
  );
});
// --- End Alignment tracking -------------------------------------------------------------------

// Optional: Add a cleanup hook when module is disabled
Hooks.on("closeModuleSettings", async () => {
  // Clean up all module-managed effects if module is being disabled
  if (game.modules.get(MODULE_ID)?.active === false) {
    for (const actor of game.actors) {
      if (actor.isOwner || game.user.isGM) {
        const effects = actor.effects.filter(e =>
          e.getFlag(MODULE_ID, WIELDER_MOD_EFFECT_FLAG) || e.getFlag(MODULE_ID, TALENT_MOD_EFFECT_FLAG)
        );
        if (effects.length > 0) {
          await actor.deleteEmbeddedDocuments("ActiveEffect", effects.map(e => e.id));
        }
      }
    }
  }
});

// Drag-and-drop: applying an upgrade (gear item) onto a lightsaber weapon sheet
Hooks.on("renderItemSheet", (app, html) => {
  const item = app.item;
  if (!item) return;

  const categoryConfig = getCategoryConfig(item);
  if (!categoryConfig || item.type !== categoryConfig.itemType) return;

  if (html[0].dataset.glCrystalDropBound === "1") return;
  html[0].dataset.glCrystalDropBound = "1";

  html[0].addEventListener("drop", async (event) => {
    const dropData = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    if (!dropData) return;

    const dropped = await Item.implementation.fromDropData(dropData);
    if (!dropped || dropped.type !== "gear") return;

    const upgradeType = dropped.getFlag(MODULE_ID, "upgradeType");
    const upgradeCategory = dropped.getFlag(MODULE_ID, "category");
    const qualityData = dropped.getFlag(MODULE_ID, "qualityData");
    const colorFlag = dropped.getFlag(MODULE_ID, "color");
    const effectData = dropped.getFlag(MODULE_ID, "effectData") || {};

    if (!upgradeType || !qualityData) {
      ui.notifications.warn("This upgrade is missing genesys-lightsabers flags.");
      return;
    }

    if (upgradeCategory !== getItemCategoryKey(item)) {
      ui.notifications.warn(`${dropped.name} cannot be installed on this item (wrong category).`);
      return;
    }

    if (!categoryConfig.slots.includes(upgradeType)) {
      ui.notifications.warn(`${dropped.name}'s slot "${upgradeType}" is not valid for this item.`);
      return;
    }

    const statFields = categoryConfig.statFields;

    const currentQualities = Array.isArray(item.system.qualities)
      ? foundry.utils.deepClone(item.system.qualities)
      : [];

    const currentQualityNames = new Set(
      currentQualities
        .map((q) => String(q?.name ?? q?.label ?? "").toLowerCase().trim())
        .filter(Boolean)
    );

    const oldUpgrades = foundry.utils.deepClone(
      item.getFlag(MODULE_ID, "upgrades") || {}
    );

    // Discard stale slots whose qualities were manually removed from the item.
    for (const [slotKey, slotData] of Object.entries(oldUpgrades)) {
      const qName = String(slotData?.qualityData?.name ?? "").toLowerCase().trim();
      if (qName && !currentQualityNames.has(qName)) {
        delete oldUpgrades[slotKey];
      }
    }

    const normalizedColorFlag = typeof colorFlag === "string" ? colorFlag.toLowerCase().trim() : null;

    const existingModTotals = collectStatMods(oldUpgrades, statFields);
    const inferredBaseStats = {};
    for (const field of statFields) {
      inferredBaseStats[field] = inferBaseStatValue(item.system?.[field], existingModTotals[field]);
    }

    const upgrades = foundry.utils.deepClone(oldUpgrades);
    upgrades[upgradeType] = {
      sourceGearId: dropped.id,
      sourceGearName: dropped.name,
      qualityData: foundry.utils.deepClone(qualityData),
      effectData: foundry.utils.deepClone(effectData),
      color: upgradeType === "colorCrystal"
        ? (normalizedColorFlag || parseColorFromText(dropped.name))
        : null
    };

    const moduleManagedNames = categoryConfig.supportsBladeColor
      ? new Set(crystalQualityNames)
      : new Set();

    for (const slot of Object.values(oldUpgrades)) {
      collectManagedNamesFromSlot(slot, moduleManagedNames);
    }

    for (const slot of Object.values(upgrades)) {
      collectManagedNamesFromSlot(slot, moduleManagedNames);
    }

    const filtered = currentQualities.filter((q) => {
      const qName = String(q?.name ?? q?.label ?? "").toLowerCase().trim();
      return !moduleManagedNames.has(qName);
    });

    for (const slotKey of categoryConfig.slots) {
      const slot = upgrades[slotKey];
      if (slot?.qualityData) filtered.push(foundry.utils.deepClone(slot.qualityData));
    }

    const updatePayload = { "system.qualities": filtered };

    if (categoryConfig.supportsBladeColor) {
      const variant = getWeaponVariant(item);
      const fallbackBaseImg = baseImages[variant] ?? baseImages.single ?? item.img;
      const baseImg = item.getFlag(MODULE_ID, "baseImg") ?? fallbackBaseImg;

      let img = baseImg;
      const activeColor = String(upgrades.colorCrystal?.color ?? "").toLowerCase().trim() || null;
      if (activeColor) {
        const crystalImg = crystalImages[variant]?.[activeColor] ?? null;
        if (crystalImg) img = crystalImg;
      }

      await item.setFlag(MODULE_ID, "baseImg", baseImg);
      updatePayload.img = img;
    }

    const derivedStats = deriveStatsFromBase(inferredBaseStats, upgrades, statFields);
    for (const field of statFields) {
      updatePayload[`system.${field}`] = derivedStats[field];
    }

    // Save slot state first so the update watcher sees the new upgrades immediately.
    await replaceUpgradesFlag(item, upgrades);
    await item.setFlag(MODULE_ID, "baseStats", inferredBaseStats);

    await item.update(updatePayload);

    console.log(`[${MODULE_ID}] applied upgrade`, upgradeType, dropped.name, "to", item.name);
  });
});

// Keeps weapon qualities/stats/image in sync if a quality is manually removed from the sheet
if (!globalThis.GLS_WEAPON_CRYSTAL_WATCHER) {
  globalThis.GLS_WEAPON_CRYSTAL_WATCHER = true;

  Hooks.on("updateItem", async (item, changed) => {
    const categoryConfig = getCategoryConfig(item);
    if (!categoryConfig) return;
    if (!foundry.utils.hasProperty(changed, "system.qualities")) return;

    await refreshItemUpgradeData(item, categoryConfig);
  });
}

function attachModuleApi() {
  const moduleRef = game?.modules?.get(MODULE_ID);
  const moduleApi = moduleRef?.api ?? {};

  if (moduleRef) {
    moduleRef.api = moduleApi;
  }

  globalThis.GenesysLightsabersApi = moduleApi;
  console.log(`[${MODULE_ID}] API ready`, Object.keys(moduleApi));
}

Hooks.once("ready", attachModuleApi);

// The Genesys system only auto-applies a matched dice-pool modification (the boost/setback
// dice this module now grants) if the rolling player has their own client-scoped "Pool
// Modifications: Auto-Apply" setting enabled — off by default, and not something a GM can turn
// on for everyone. Without it, the bonus shows as a pre-populated-but-still-manual checkbox in
// the roll dialog rather than applying silently. One-time per-user notice, not GM-gated.
Hooks.once("ready", async () => {
  if (game.user.getFlag(MODULE_ID, "seenAutoApplyPoolModsNotice")) return;
  await game.user.setFlag(MODULE_ID, "seenAutoApplyPoolModsNotice", true);

  ui.notifications.info(
    "Genesys Lightsabers: equipped upgrades can now add Boost/Setback dice to your rolls. " +
    "For these to apply automatically instead of showing as a manual checkbox, enable " +
    "\"Pool Modifications: Auto-Apply\" in Settings → Configure Settings → System Settings.",
    { permanent: true }
  );
});
