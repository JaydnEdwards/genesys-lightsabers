console.log("Hello from the Genesys Lightsabers module!");

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
        green: "modules/genesys-lightsabers/assets/lightsabers/short/iw_shortsbr_003.png",
        yellow: "modules/genesys-lightsabers/assets/lightsabers/short/iw_shortsbr_004.png",
        violet: "modules/genesys-lightsabers/assets/lightsabers/short/iw_shortsbr_005.png",
        cyan: "modules/genesys-lightsabers/assets/lightsabers/short/iw_shortsbr_008.png",
        silver: "modules/genesys-lightsabers/assets/lightsabers/short/iw_shortsbr_010.png",
        orange: "modules/genesys-lightsabers/assets/lightsabers/short/iw_shortsbr_007.png",
        viridian: "modules/genesys-lightsabers/assets/lightsabers/short/iw_shortsbr_009.png"
    }
    
}

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

  function getCrystalColourFromName(name) {
    const lowerName = String(name ?? "").toLowerCase();
    for (const colour of crystalColours) {
      if (lowerName.includes("crystal") && lowerName.includes(colour)) {
        return colour;
      }
    }
    return null;
  }

  if (html[0].dataset.glCrystalDropBound === "1") return;
  html[0].dataset.glCrystalDropBound = "1";

  html[0].addEventListener("drop", async (event) => {
    const dropData = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    if (!dropData) return;

    const dropped = await Item.implementation.fromDropData(dropData);
    if (!dropped) return;

    const colour = dropped.type === "gear" ? getCrystalColourFromName(dropped.name) : null;
    if (!colour) return;

    const qualityName = colour.charAt(0).toUpperCase() + colour.slice(1) + " Crystal";
    const currentQualities = Array.isArray(weapon.system.qualities)
      ? foundry.utils.deepClone(weapon.system.qualities)
      : [];

    console.log("existing quality sample", weapon.system.qualities?.[0]);

    const filtered = currentQualities.filter((quality) => {
      const qName = String(quality?.name ?? quality?.label ?? "").toLowerCase();
      return !crystalQualityNames.has(qName);
    });

    const crystalQuality = {
      name: qualityName,
      description: "",
      isRated: true,
      rating: 1
    };
    filtered.push(crystalQuality);

    const variant = getWeaponVariant(weapon);
    const fallbackBaseImg = baseImages[variant] ?? baseImages.single ?? weapon.img;
    const baseImg = weapon.getFlag("genesys-lightsabers", "baseImg") ?? fallbackBaseImg;
    const crystalImg = crystalImages[variant]?.[colour] ?? null;

    const updateData = { "system.qualities": filtered };
    if (crystalImg) updateData.img = crystalImg;

    await weapon.update(updateData);
    await weapon.setFlag("genesys-lightsabers", "baseImg", baseImg);

    await weapon.setFlag("genesys-lightsabers", "activeCrystal", {
      sourceGearId: dropped.id,
      sourceGearName: dropped.name,
      colour,
      qualityName,
      image: crystalImg,
      variant
    });

    console.log("[genesys-lightsabers] applied crystal", qualityName, "to", weapon.name);
  });
});

if (!globalThis.GLS_WEAPON_CRYSTAL_WATCHER) {
  globalThis.GLS_WEAPON_CRYSTAL_WATCHER = true;

  Hooks.on("updateItem", async (item, changed) => {
    if (item.type !== "weapon") return;

    if (!foundry.utils.hasProperty(changed, "system.qualities")) return;

    const active = item.getFlag("genesys-lightsabers", "activeCrystal");
    if (!active) return;

    const stillHasCrystal = weaponHasCrystalQuality(item);
    if (stillHasCrystal) return;

    const variant = getWeaponVariant(item);
    const fallbackBaseImg = baseImages[variant] ?? baseImages.single ?? item.img;
    const baseImg = item.getFlag("genesys-lightsabers", "baseImg") ?? fallbackBaseImg;
    const updateData = {};
    if (baseImg) updateData.img = baseImg;

    if (Object.keys(updateData).length > 0) await item.update(updateData);

    await item.unsetFlag("genesys-lightsabers", "activeCrystal");
    await item.unsetFlag("genesys-lightsabers", "baseImg");

    console.log("[genesys-lightsabers] crystal removed from weapon", item.name);
  });
}
