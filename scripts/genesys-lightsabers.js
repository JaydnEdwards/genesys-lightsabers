console.log("Hello from the Genesys Lightsabers module! [build 1.0.4]");

const MODULE_ID = "genesys-lightsabers";
const WIELDER_MOD_EFFECT_FLAG = "wielderModEffect";
const WIELDER_MOD_EFFECT_SOURCE_FLAG = "wielderModSource";

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

      const wieldMods = collectWielderMods(upgrades);
      const wielderChanges = buildWielderEffectChanges(wieldMods);

      const skillNames = categoryConfig.itemType === "weapon"
        ? (Array.isArray(weapon.system?.skills) ? weapon.system.skills : [])
        : Array.from(wieldedWeaponSkillNames);
      const diceMods = collectNamedMods(upgrades, "diceMods");
      const diceChanges = buildDicePoolChanges(diceMods, skillNames);

      const targetDiceMods = collectNamedMods(upgrades, "targetDiceMods");
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
      const skillMods = collectSkillMods(upgrades);

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
  if (!getCategoryConfig(item)) return;
  const actor = item.parent;
  if (actor?.documentName === "Actor" && isItemActive(item)) {
    queueSync(actor);
  }
});

Hooks.on("deleteItem", async (item) => {
  if (!getCategoryConfig(item)) return;
  const actor = item.parent;
  if (actor?.documentName === "Actor") {
    queueSync(actor);
  }
});

Hooks.on("updateItem", async (item, changed) => {
  if (!getCategoryConfig(item)) return;

  const actor = item.parent;
  if (!actor || actor.documentName !== "Actor") return;

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
    } catch (error) {
      console.error(`[${MODULE_ID}] Error syncing wielder effects for ${actor.name}:`, error);
      errors++;
    }
  }

  if (weaponsFixed > 0 || reflagged > 0 || skillNamesFixed > 0 || errors > 0) {
    console.log(`[${MODULE_ID}] Startup refresh: ${weaponsFixed} item(s) fixed, ${reflagged} compendium item(s) reflagged, ${skillNamesFixed} skill name(s) fixed${errors > 0 ? `, ${errors} error(s)` : ""}`);
    ui.notifications.info(`Genesys Lightsabers: refreshed ${weaponsFixed} item(s), reflagged ${reflagged} upgrade(s) on startup.`);
  }
});

// Optional: Add a cleanup hook when module is disabled
Hooks.on("closeModuleSettings", async () => {
  // Clean up all module-managed effects if module is being disabled
  if (game.modules.get(MODULE_ID)?.active === false) {
    for (const actor of game.actors) {
      if (actor.isOwner || game.user.isGM) {
        const effects = actor.effects.filter(e =>
          e.getFlag(MODULE_ID, WIELDER_MOD_EFFECT_FLAG)
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
