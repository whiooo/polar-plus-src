let { SettingSelector, SettingSlider, SettingToggle, ConfigModuleClass, ModuleToggle, getKeyBind, ModuleManager, MovementHelper } = global.settingSelection;

global.modules.push(
    new ConfigModuleClass(
        "Slipless Ice",
        "Extras",
        [
            new SettingToggle("Enabled", false),
            new SettingToggle("Sneak Only", false)
        ],
        [
            "Prevents you from slipping on ice! (Useful for dungeons)",
            "Use at your own risk, this feature could be detected in the future!"
        ]
    )
);

class SliplessIce {
    constructor() {
        this.ModuleName = "Slipless Ice";
        this.Enabled = false;
        this.sneakOnly = false;

        register("step", () => {
            this.Enabled = ModuleManager.getSetting(this.ModuleName, "Enabled");
            this.sneakOnly = ModuleManager.getSetting(this.ModuleName, "Sneak Only");
        }).setFps(1);

        register("tick", () => {
            if (
                this.Enabled &&
                (!this.sneakOnly || sneakBind.isKeyDown()) &&
                !MovementHelper.isKeyDown("w") &&
                !MovementHelper.isKeyDown("a") &&
                !MovementHelper.isKeyDown("s") &&
                !MovementHelper.isKeyDown("d") &&
                World.getBlockAt(Player.getX(), Player.getY() - 1, Player.getZ()).toString().includes("ice")
            ) {
                Player.getPlayer().field_70159_w = 0
                Player.getPlayer().field_70179_y = 0
            }
        });

    }
}

new SliplessIce();