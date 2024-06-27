let { SettingSelector, SettingSlider, SettingToggle, ConfigModuleClass, ModuleToggle, getKeyBind, ModuleManager } = global.settingSelection;

global.modules.push(
    new ConfigModuleClass(
        "Mob Hider",
        "Extras",
        [
            new SettingToggle("Enabled", false),
            new SettingToggle("Hide Thysts", true),
            new SettingToggle("Hide Sven Pups", false),
            new SettingToggle("Hide Jerrys", false)
        ],
        [
            "Hides chosen mobs from being rendered",
            "Use at your own risk, this feature could be detected in the future!"
        ]
    )
);

class MobHider {
    constructor() {
        this.ModuleName = "Mob Hider";
        this.Enabled = false;
        this.hideThysts = false;
        this.hideSvenPups = false;
        this.hideJerrys = false;

        register("step", () => {
            this.Enabled = ModuleManager.getSetting(this.ModuleName, "Enabled");
            this.hideThysts = ModuleManager.getSetting(this.ModuleName, "Hide Thysts");
            this.hideSvenPups = ModuleManager.getSetting(this.ModuleName, "Hide Sven Pups");
            this.hideJerrys = ModuleManager.getSetting(this.ModuleName, "Hide Jerrys");
        }).setFps(1);

        this.jerryNames = [
            "Green Jerry",
            "Blue Jerry",
            "Purple Jerry",
            "Golden Jerry"
        ]

        register("renderEntity", (ent, pos, pt, event) => {
            if (!this.Enabled) return;

            if (this.hideThysts && ent.entity instanceof net.minecraft.entity.monster.EntityEndermite) {
                cancel(event);
                ent.entity.func_70106_y();
            } else if (this.hideSvenPups) {
                if (
                    (ent.entity instanceof net.minecraft.entity.passive.EntityWolf || ent.getName().includes("Sven Pup")) &&
                    Scoreboard.getLineByIndex(3).getName().includes("Slay the boss!")
                ) {
                    cancel(event);
                    ent.entity.func_70106_y();
                }
            } else if (this.hideJerrys) {
                if (
                    (!(ent.entity instanceof net.minecraft.entity.passive.EntityVillager) || !ent.getName().includes("Jerry")) &&
                    !this.jerryNames.some(name => ent.getName().includes(name))
                ) return;

                cancel(event);
                ent.entity.func_70106_y();
            }
        })
    }
}

new MobHider();