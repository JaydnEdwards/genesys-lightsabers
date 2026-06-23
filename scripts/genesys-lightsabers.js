console.log("Hello from the Genesys Lightsabers module! [build 1.0.3]");

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

function isWeaponWielded(weapon) {
  if (!weapon || weapon.type !== "weapon") return false;

  if (foundry.utils.hasProperty(weapon, "system.equipped")) {
    return Boolean(weapon.system?.equipped);
  }

  if (foundry.utils.hasProperty(weapon, "system.carried")) {
    return Boolean(weapon.system?.carried);
  }

  return true;
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

async function syncActorWielderEffects(actor) {
    console.log("[GLS] syncing actor effects", actor.name, actor.items.size);
  if (!actor || actor.documentName !== "Actor" || !actor.isOwner) return;

  const desiredByWeapon = new Map();
  const weapons = Array.isArray(actor.items)
    ? actor.items.filter((item) => item?.type === "weapon" && isWeaponWielded(item))
    : Array.from(actor.items?.values?.() ?? []).filter((item) => item?.type === "weapon" && isWeaponWielded(item));

  for (const weapon of weapons) {
    const upgrades = weapon.getFlag(MODULE_ID, "upgrades") || {};
    const wieldMods = collectWielderMods(upgrades);
    const effectChanges = buildWielderEffectChanges(wieldMods);
    if (!effectChanges.length) continue;

    desiredByWeapon.set(weapon.id, getWielderEffectPayload(weapon, effectChanges));
  }

  const existingEffects = actor.effects.filter((effect) => effect.getFlag(MODULE_ID, WIELDER_MOD_EFFECT_FLAG));

  const toDelete = [];
  const existingByWeapon = new Map();
  for (const effect of existingEffects) {
    const sourceWeaponId = String(effect.getFlag(MODULE_ID, WIELDER_MOD_EFFECT_SOURCE_FLAG) ?? "").trim();
    if (!sourceWeaponId || !desiredByWeapon.has(sourceWeaponId)) {
      toDelete.push(effect.id);
      continue;
    }

    existingByWeapon.set(sourceWeaponId, effect);
  }

  if (toDelete.length) {
    await actor.deleteEmbeddedDocuments("ActiveEffect", toDelete);
  }

  const toCreate = [];
  const toUpdate = [];
  for (const [weaponId, payload] of desiredByWeapon.entries()) {
    const existing = existingByWeapon.get(weaponId);
    if (!existing) {
      toCreate.push(payload);
      continue;
    }

    if (didWielderPayloadChange(existing, payload)) {
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

  if (toCreate.length) {
    await actor.createEmbeddedDocuments("ActiveEffect", toCreate);
  }

  if (toUpdate.length) {
    await actor.updateEmbeddedDocuments("ActiveEffect", toUpdate);
  }
}

function shouldSyncWielderEffects(changed) {
  return foundry.utils.hasProperty(changed, `flags.${MODULE_ID}.upgrades`)
    || foundry.utils.hasProperty(changed, "system.equipped")
    || foundry.utils.hasProperty(changed, "system.carried")
    || foundry.utils.hasProperty(changed, "img")
    || foundry.utils.hasProperty(changed, "name");
}

function getBaseWeaponStats(weapon) {
  const flagged = weapon.getFlag("genesys-lightsabers", "baseStats") || {};
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
    const flagged = weapon.getFlag("genesys-lightsabers", "variant");

    if (flagged) return flagged;

    const name = String(weapon.name ?? "").toLowerCase();
    if (name.includes("lightsaber, double-bladed")) return "double";
    if (name.includes("lightsaber, short")) return "short";
    return "single";
}

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

    const upgradeType = dropped.getFlag("genesys-lightsabers", "upgradeType");
    const qualityData = dropped.getFlag("genesys-lightsabers", "qualityData");
    const colorFlag = dropped.getFlag("genesys-lightsabers", "color");
    const effectData = dropped.getFlag("genesys-lightsabers", "effectData") || {};

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
      weapon.getFlag("genesys-lightsabers", "upgrades") || {}
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

    const moduleManagedNames = new Set([
      "blue crystal", "green crystal", "yellow crystal", "red crystal", "violet crystal", "cyan crystal", "silver crystal", "orange crystal", "viridian crystal"
    ]);

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

    for (const slotKey of ["colorCrystal", "powerCrystal", "emitter", "lens", "energyCell"]) {
      const slot = upgrades[slotKey];
      if (slot?.qualityData) filtered.push(foundry.utils.deepClone(slot.qualityData));
    }

    const variant = getWeaponVariant(weapon);
    const fallbackBaseImg = baseImages[variant] ?? baseImages.single ?? weapon.img;
    const baseImg = weapon.getFlag("genesys-lightsabers", "baseImg") ?? fallbackBaseImg;

    let img = baseImg;
    const activeColor = String(upgrades.colorCrystal?.color ?? "").toLowerCase().trim() || null;
    if (activeColor) {
      const crystalImg = crystalImages[variant]?.[activeColor] ?? null;
      if (crystalImg) img = crystalImg;
    }

    const derivedStats = deriveStatsFromBase(inferredBaseStats, upgrades);

    // Save slot state first so the update watcher sees the new color crystal immediately.
    await weapon.setFlag("genesys-lightsabers", "baseImg", baseImg);
    await weapon.setFlag("genesys-lightsabers", "upgrades", upgrades);
    await weapon.setFlag("genesys-lightsabers", "baseStats", inferredBaseStats);

    await weapon.update({
      "system.qualities": filtered,
      "system.baseDamage": derivedStats.baseDamage,
      "system.critical": derivedStats.critical,
      "system.rangedDefence": derivedStats.rangedDefence,
      img
    });

    console.log("[genesys-lightsabers] applied upgrade", upgradeType, dropped.name, "to", weapon.name);
  });
});

if (!globalThis.GLS_WEAPON_CRYSTAL_WATCHER) {
  globalThis.GLS_WEAPON_CRYSTAL_WATCHER = true;

  Hooks.on("updateItem", async (item, changed) => {
    if (item.type !== "weapon") return;
    if (!foundry.utils.hasProperty(changed, "system.qualities")) return;

    const upgrades = foundry.utils.deepClone(
      item.getFlag("genesys-lightsabers", "upgrades") || {}
    );

    const currentNames = new Set(
      (Array.isArray(item.system?.qualities) ? item.system.qualities : [])
        .map((q) => String(q?.name ?? q?.label ?? "").toLowerCase().trim())
        .filter(Boolean)
    );

    // Remove stale slots whose quality was manually deleted from the weapon.
    let upgradesChanged = false;
    for (const [slotKey, slotData] of Object.entries(upgrades)) {
      const qName = String(slotData?.qualityData?.name ?? "").toLowerCase().trim();
      if (qName && !currentNames.has(qName)) {
        delete upgrades[slotKey];
        upgradesChanged = true;
      }
    }

    if (upgradesChanged) {
      if (Object.keys(upgrades).length) {
        await item.setFlag("genesys-lightsabers", "upgrades", upgrades);
      } else {
        await item.unsetFlag("genesys-lightsabers", "upgrades");
      }
    }

    // Recompute image from remaining color crystal slot only.
    const variant = getWeaponVariant(item);
    const fallbackBaseImg = baseImages[variant] ?? baseImages.single ?? item.img;
    const baseImg = item.getFlag("genesys-lightsabers", "baseImg") ?? fallbackBaseImg;

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
      ? getDerivedWeaponStats(item, upgrades)
      : getBaseWeaponStats(item);

    const desiredBaseDamage = derivedStats.baseDamage;
    const desiredCritical = derivedStats.critical;
    const desiredRangedDefence = derivedStats.rangedDefence;

    const currentBaseDamage = item.system?.baseDamage;
    const currentCritical = item.system?.critical;
    const currentRangedDefence = item.system?.rangedDefence;

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

    if (item.img !== desiredImg || needsStatUpdate) {
      await item.update({
        img: desiredImg,
        "system.baseDamage": desiredBaseDamage,
        "system.critical": desiredCritical,
        "system.rangedDefence": desiredRangedDefence
      });
    }

    if (!activeColor) {
      await item.unsetFlag("genesys-lightsabers", "baseImg");
    }

    if (!hasAnyUpgrades) {
      await item.unsetFlag("genesys-lightsabers", "baseStats");
    }
  });
}

function attachModuleApi() {
  const moduleRef = game?.modules?.get(MODULE_ID);
  const moduleApi = moduleRef?.api ?? {};

  if (moduleRef) {
    moduleRef.api = moduleApi;
  }

  globalThis.GenesysLightsabersApi = moduleApi;
  console.log("[genesys-lightsabers] API ready", Object.keys(moduleApi));
}

Hooks.once("ready", attachModuleApi);

Hooks.once("ready", async () => {
  for (const actor of game.actors ?? []) {
    for (const weapon of actor.items.filter(i => i.type === "weapon")) {
      await syncActorWeaponEffect(actor, weapon);
    }
  }
});

Hooks.on("createItem", async (item) => {
  if (item?.type !== "weapon") return;

  const actor = item.parent;
  if (!actor || actor.documentName !== "Actor") return;
  await syncActorWielderEffects(actor);
});

Hooks.on("deleteItem", async (item) => {
  if (item?.type !== "weapon") return;

  const actor = item.parent;
  if (!actor || actor.documentName !== "Actor") return;
  await syncActorWielderEffects(actor);
});

async function syncActorWeaponEffect(actor, weapon) {
  if (!actor || !weapon) return;

  const upgrades = weapon.getFlag(MODULE_ID, "upgrades") || {};
  const wieldMods = collectWielderMods(upgrades);
  const effectChanges = buildWielderEffectChanges(wieldMods);

  const existingEffects = actor.effects.filter(e =>
    e.getFlag(MODULE_ID, WIELDER_MOD_EFFECT_FLAG) &&
    e.getFlag(MODULE_ID, WIELDER_MOD_EFFECT_SOURCE_FLAG) === weapon.id
  );

  const payload = getWielderEffectPayload(weapon, effectChanges);

  const existing = existingEffects[0];

  if (!effectChanges.length) {
    if (existing) await existing.delete();
    return;
  }

  if (!existing) {
    await actor.createEmbeddedDocuments("ActiveEffect", [payload]);
    return;
  }

  if (didWielderPayloadChange(existing, payload)) {
    await actor.updateEmbeddedDocuments("ActiveEffect", [{
      _id: existing.id,
      ...payload
    }]);
  }
}

Hooks.on("updateItem", async (item, changed) => {
  if (item.type !== "weapon") return;

  const actor = item.parent;
  if (!actor || actor.documentName !== "Actor") return;

  await syncActorWeaponEffect(actor, item);
});
