console.log("Hello from the Genesys Lightsabers module! [build 1.0.3]");

const MODULE_ID = "genesys-lightsabers";

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
