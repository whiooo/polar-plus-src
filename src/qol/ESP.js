import Skyblock from "BloomCore/Skyblock"
let { SettingSelector, SettingSlider, SettingToggle, ConfigModuleClass, ModuleToggle, getKeyBind, ModuleManager } = global.settingSelection

let { GuiUtils, RenderUtils } = global.export

global.modules.push(
    new ConfigModuleClass(
        "ESP",
        "Render",
        [
            new SettingToggle("Enabled", false),
            
            // TODO multi select
            new SettingToggle("Corpses", true),
        ],
        [
            "Corpses"
        ]
    )
)

class ESP {
    constructor() {
        this.ModuleName = "ESP"
        this.Enabled = false

        this.renderCorpses = true
        register("step", () => {
            this.Enabled = ModuleManager.getSetting(this.ModuleName, "Enabled")

            this.renderCorpses = ModuleManager.getSetting(this.ModuleName, "Corpses")
        }).setFps(1)

        // Entity scan
        this.entities = []
        register("step", () => {
            let newEntities = []

            // check location
            if (this.renderCorpses && Skyblock.subArea === "Glacite Mineshafts") World.getAllEntitiesOfType(net.minecraft.entity.item.EntityArmorStand).forEach((entity) => {
                if (!entity.isInvisible()) newEntities.push([entity.getX() - 0.5, entity.getY(), entity.getZ() - 0.5])
            })

            this.entities = newEntities
        }).setFps(1)
 
        register("renderWorld", (entity) => {
            if (!this.Enabled) return

            RenderUtils.renderCubes(this.entities, 1, 2)
        })
    }
}

new ESP()