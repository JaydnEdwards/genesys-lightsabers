console.log("Hello from the Genesys Lightsabers module! [build 1.0.4]");

const MODULE_ID = "genesys-lightsabers";
const WIELDER_MOD_EFFECT_FLAG = "wielderModEffect";
const WIELDER_MOD_EFFECT_SOURCE_FLAG = "wielderModSource";

const upgradeSlots = ["colorCrystal", "powerCrystal", "emitter", "lens", "energyCell"];

const upgradeMatchers = [
  { slot: "colorCrystal", test: (name) => /crystal/i.test(name) && /(blue|green|yellow|red|violet|cyan|silver|orange|viridian)/i.test(name) },
  { slot: "powerCrystal", test: (name) => /power crystal/i.test(name) },
  { slot: "emitter", test: (name) => /emitter/i.test(name) },
  { slot: "lens", test: (name) => /lens/i.test(name) },
  { slot: "energyCell", test: (name) => /energy cell/i.test(name) }
];

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

function normalizeAddedQuality(entry) {
  if (typeof entry === "string") {
    return {
      name: entry,
      description: "",
      isRated: false,
      rating: 0
    };
  }

  if (entry && typeof entry === "object") {
    return {
      name: String(entry.name ?? "").trim(),
      description: String(entry.description ?? ""),
      isRated: Boolean(entry.isRated),
      rating: Number(entry.rating ?? 0)
    };
  }

  return null;
}

function getAddedQualitiesFromSlot(slotData) {
  const entries = Array.isArray(slotData?.effectData?.addedQualities)
    ? slotData.effectData.addedQualities
    : [];

  return entries
    .map((entry) => normalizeAddedQuality(entry))
    .filter((quality) => quality?.name);
}

function collectManagedNamesFromSlot(slotData, targetSet) {
  const primaryName = String(slotData?.qualityData?.name ?? "").toLowerCase().trim();
  if (primaryName) targetSet.add(primaryName);

  for (const addedQuality of getAddedQualitiesFromSlot(slotData)) {
    const addedName = String(addedQuality?.name ?? "").toLowerCase().trim();
    if (addedName) targetSet.add(addedName);
  }
}

function toFiniteNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function asFiniteNumberOrNull(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function collectStatMods(upgrades) {
  const totals = { baseDamage: 0, critical: 0, rangedDefence: 0 };

  for (const slotData of Object.values(upgrades || {})) {
    const mods = slotData?.effectData?.statMods;
    if (!mods || typeof mods !== "object") continue;

    totals.baseDamage += toFiniteNumber(mods.baseDamage, 0);
    totals.critical += toFiniteNumber(mods.critical, 0);
    totals.rangedDefence += toFiniteNumber(mods.rangedDefence, 0);
  }

  return totals;
}

function getBaseWeaponStats(weapon) {
  const flagged = weapon.getFlag(MODULE_ID, "baseStats") || {};
  const currentBaseDamage = weapon.system?.baseDamage;
  const currentCritical = weapon.system?.critical;
  const currentRangedDefence = weapon.system?.rangedDefence;

  return {
    baseDamage: foundry.utils.hasProperty(flagged, "baseDamage") ? flagged.baseDamage : currentBaseDamage,
    critical: foundry.utils.hasProperty(flagged, "critical") ? flagged.critical : currentCritical,
    rangedDefence: foundry.utils.hasProperty(flagged, "rangedDefence") ? flagged.rangedDefence : currentRangedDefence
  };
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

function deriveStatsFromBase(baseStats, upgrades) {
  const modTotals = collectStatMods(upgrades);

  return {
    baseDamage: applyNumericMod(baseStats?.baseDamage, modTotals.baseDamage),
    critical: applyNumericMod(baseStats?.critical, modTotals.critical),
    rangedDefence: applyNumericMod(baseStats?.rangedDefence, modTotals.rangedDefence)
  };
}

function getDerivedWeaponStats(weapon, upgrades) {
  const baseStats = getBaseWeaponStats(weapon);
  return deriveStatsFromBase(baseStats, upgrades);
}

function weaponHasCrystalQuality(weapon) {
  const qualities = Array.isArray(weapon.system?.qualities) ? weapon.system.qualities : [];
  return qualities.some((q) => {
    const qName = String(q?.name ?? q?.label ?? "").toLowerCase();
    return qName.includes(" crystal");
  });
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
    || foundry.utils.hasProperty(changed, "system.equipped")
    || foundry.utils.hasProperty(changed, "system.carried")
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

// Clears stale upgrade slots (quality removed from the weapon sheet) and recalculates
// stats/image from whatever upgrades remain. Returns true if anything was actually changed,
// so callers can stay silent when there was nothing to fix.
async function refreshWeaponData(weapon) {
  let changed = false;

  const upgrades = foundry.utils.deepClone(weapon.getFlag(MODULE_ID, "upgrades") || {});

  const currentNames = new Set(
    (Array.isArray(weapon.system?.qualities) ? weapon.system.qualities : [])
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
    await replaceUpgradesFlag(weapon, upgrades);
    changed = true;
  }

  const variant = getWeaponVariant(weapon);
  const fallbackBaseImg = baseImages[variant] ?? baseImages.single ?? weapon.img;
  const baseImg = weapon.getFlag(MODULE_ID, "baseImg") ?? fallbackBaseImg;

  const activeColor = (
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

  const hasAnyUpgrades = Object.keys(upgrades).length > 0;
  const derivedStats = hasAnyUpgrades
    ? getDerivedWeaponStats(weapon, upgrades)
    : getBaseWeaponStats(weapon);

  const desiredBaseDamage = derivedStats.baseDamage;
  const desiredCritical = derivedStats.critical;
  const desiredRangedDefence = derivedStats.rangedDefence;

  const currentBaseDamage = weapon.system?.baseDamage;
  const currentCritical = weapon.system?.critical;
  const currentRangedDefence = weapon.system?.rangedDefence;

  const currentBaseDamageNumeric = asFiniteNumberOrNull(currentBaseDamage);
  const desiredBaseDamageNumeric = asFiniteNumberOrNull(desiredBaseDamage);
  const currentCriticalNumeric = asFiniteNumberOrNull(currentCritical);
  const desiredCriticalNumeric = asFiniteNumberOrNull(desiredCritical);
  const currentRangedDefenceNumeric = asFiniteNumberOrNull(currentRangedDefence);
  const desiredRangedDefenceNumeric = asFiniteNumberOrNull(desiredRangedDefence);

  const baseDamageChanged = (
    currentBaseDamageNumeric !== null && desiredBaseDamageNumeric !== null
      ? currentBaseDamageNumeric !== desiredBaseDamageNumeric
      : currentBaseDamage !== desiredBaseDamage
  );

  const criticalChanged = (
    currentCriticalNumeric !== null && desiredCriticalNumeric !== null
      ? currentCriticalNumeric !== desiredCriticalNumeric
      : currentCritical !== desiredCritical
  );

  const rangedDefenceChanged = (
    currentRangedDefenceNumeric !== null && desiredRangedDefenceNumeric !== null
      ? currentRangedDefenceNumeric !== desiredRangedDefenceNumeric
      : currentRangedDefence !== desiredRangedDefence
  );

  const needsStatUpdate = baseDamageChanged || criticalChanged || rangedDefenceChanged;

  if (weapon.img !== desiredImg || needsStatUpdate) {
    await weapon.update({
      img: desiredImg,
      "system.baseDamage": desiredBaseDamage,
      "system.critical": desiredCritical,
      "system.rangedDefence": desiredRangedDefence
    });
    changed = true;
  }

  if (!activeColor) {
    await weapon.unsetFlag(MODULE_ID, "baseImg");
  }

  if (!hasAnyUpgrades) {
    await weapon.unsetFlag(MODULE_ID, "baseStats");
  }

  return changed;
}

// Fixed isWeaponWielded function
function isWeaponWielded(weapon) {
  if (!weapon || weapon.type !== "weapon") return false;

  // Check equipped status (primary method)
  if (foundry.utils.hasProperty(weapon, "system.equipped")) {
    return Boolean(weapon.system?.equipped);
  }

  // Check carried status (alternative method)
  if (foundry.utils.hasProperty(weapon, "system.carried")) {
    return Boolean(weapon.system?.carried);
  }

  // If neither property exists, assume wielded (backward compatibility)
  return true;
}

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
    // Collect all wielded weapons and their desired effects
    const desiredByWeapon = new Map();
    const weapons = actor.items.filter(item =>
      item?.type === "weapon" && isWeaponWielded(item)
    );

    for (const weapon of weapons) {
      const upgrades = weapon.getFlag(MODULE_ID, "upgrades") || {};
      const wieldMods = collectWielderMods(upgrades);
      const effectChanges = buildWielderEffectChanges(wieldMods);

      if (effectChanges.length > 0) {
        desiredByWeapon.set(weapon.id, getWielderEffectPayload(weapon, effectChanges));
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

// Improved event handlers with debouncing
Hooks.on("createItem", async (item) => {
  if (item?.type !== "weapon") return;
  const actor = item.parent;
  if (actor?.documentName === "Actor" && isWeaponWielded(item)) {
    queueSync(actor);
  }
});

Hooks.on("deleteItem", async (item) => {
  if (item?.type !== "weapon") return;
  const actor = item.parent;
  if (actor?.documentName === "Actor") {
    queueSync(actor);
  }
});

Hooks.on("updateItem", async (item, changed) => {
  if (item.type !== "weapon") return;

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
    item.type === "weapon" && shouldSyncWielderEffects(changed)
  );

  if (hasWieldChange) {
    queueSync(actor);
  }
});

// Full data-integrity pass on world load: clears stale upgrade slots, recalculates weapon
// stats/images, and syncs wielder effects for every actor. GM-only so multiple connected
// clients don't redundantly race to write the same documents, and silent unless it actually
// fixes something (no notification on a clean load).
Hooks.once("ready", async () => {
  if (!game.user.isGM) return;

  let weaponsFixed = 0;
  let errors = 0;

  for (const actor of game.actors) {
    for (const weapon of actor.items.filter((i) => i.type === "weapon")) {
      try {
        if (await refreshWeaponData(weapon)) weaponsFixed++;
      } catch (error) {
        console.error(`[${MODULE_ID}] Error refreshing ${weapon.name} on ${actor.name}:`, error);
        errors++;
      }
    }

    try {
      await syncActorWielderEffects(actor);
    } catch (error) {
      console.error(`[${MODULE_ID}] Error syncing wielder effects for ${actor.name}:`, error);
      errors++;
    }
  }

  if (weaponsFixed > 0 || errors > 0) {
    console.log(`[${MODULE_ID}] Startup refresh: ${weaponsFixed} weapon(s) fixed${errors > 0 ? `, ${errors} error(s)` : ""}`);
    ui.notifications.info(`Genesys Lightsabers: refreshed ${weaponsFixed} weapon(s) on startup.`);
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
  const weapon = app.item;
  if (!weapon) return;
  if (weapon.type !== "weapon") return;

  if (html[0].dataset.glCrystalDropBound === "1") return;
  html[0].dataset.glCrystalDropBound = "1";

  html[0].addEventListener("drop", async (event) => {
    const dropData = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    if (!dropData) return;

    const dropped = await Item.implementation.fromDropData(dropData);
    if (!dropped || dropped.type !== "gear") return;

    const upgradeType = dropped.getFlag(MODULE_ID, "upgradeType");
    const qualityData = dropped.getFlag(MODULE_ID, "qualityData");
    const colorFlag = dropped.getFlag(MODULE_ID, "color");
    const effectData = dropped.getFlag(MODULE_ID, "effectData") || {};

    if (!upgradeType || !qualityData) {
      ui.notifications.warn("This upgrade is missing genesys-lightsabers flags.");
      return;
    }

    const currentQualities = Array.isArray(weapon.system.qualities)
      ? foundry.utils.deepClone(weapon.system.qualities)
      : [];

    const currentQualityNames = new Set(
      currentQualities
        .map((q) => String(q?.name ?? q?.label ?? "").toLowerCase().trim())
        .filter(Boolean)
    );

    const oldUpgrades = foundry.utils.deepClone(
      weapon.getFlag(MODULE_ID, "upgrades") || {}
    );

    // Discard stale slots whose qualities were manually removed from the weapon.
    for (const [slotKey, slotData] of Object.entries(oldUpgrades)) {
      const qName = String(slotData?.qualityData?.name ?? "").toLowerCase().trim();
      if (qName && !currentQualityNames.has(qName)) {
        delete oldUpgrades[slotKey];
      }
    }

    const normalizedColorFlag = typeof colorFlag === "string" ? colorFlag.toLowerCase().trim() : null;

    const existingModTotals = collectStatMods(oldUpgrades);
    const inferredBaseStats = {
      baseDamage: inferBaseStatValue(weapon.system?.baseDamage, existingModTotals.baseDamage),
      critical: inferBaseStatValue(weapon.system?.critical, existingModTotals.critical),
      rangedDefence: inferBaseStatValue(weapon.system?.rangedDefence, existingModTotals.rangedDefence)
    };

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

    const moduleManagedNames = new Set(crystalQualityNames);

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

    for (const slotKey of upgradeSlots) {
      const slot = upgrades[slotKey];
      if (slot?.qualityData) filtered.push(foundry.utils.deepClone(slot.qualityData));
    }

    const variant = getWeaponVariant(weapon);
    const fallbackBaseImg = baseImages[variant] ?? baseImages.single ?? weapon.img;
    const baseImg = weapon.getFlag(MODULE_ID, "baseImg") ?? fallbackBaseImg;

    let img = baseImg;
    const activeColor = String(upgrades.colorCrystal?.color ?? "").toLowerCase().trim() || null;
    if (activeColor) {
      const crystalImg = crystalImages[variant]?.[activeColor] ?? null;
      if (crystalImg) img = crystalImg;
    }

    const derivedStats = deriveStatsFromBase(inferredBaseStats, upgrades);

    // Save slot state first so the update watcher sees the new color crystal immediately.
    await weapon.setFlag(MODULE_ID, "baseImg", baseImg);
    await replaceUpgradesFlag(weapon, upgrades);
    await weapon.setFlag(MODULE_ID, "baseStats", inferredBaseStats);

    await weapon.update({
      "system.qualities": filtered,
      "system.baseDamage": derivedStats.baseDamage,
      "system.critical": derivedStats.critical,
      "system.rangedDefence": derivedStats.rangedDefence,
      img
    });

    console.log(`[${MODULE_ID}] applied upgrade`, upgradeType, dropped.name, "to", weapon.name);
  });
});

// Keeps weapon qualities/stats/image in sync if a quality is manually removed from the sheet
if (!globalThis.GLS_WEAPON_CRYSTAL_WATCHER) {
  globalThis.GLS_WEAPON_CRYSTAL_WATCHER = true;

  Hooks.on("updateItem", async (item, changed) => {
    if (item.type !== "weapon") return;
    if (!foundry.utils.hasProperty(changed, "system.qualities")) return;

    await refreshWeaponData(item);
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
