let { SettingSelector, SettingSlider, SettingToggle, ConfigModuleClass, ModuleToggle, getKeyBind, ModuleManager } = global.settingSelection
let { ChatUtils, Blocks, ArrayLists } = global.export

global.modules.push(
    new ConfigModuleClass(
        "X-Ray",
        "Render",
        [
                new SettingToggle("Dirt", false),
                new SettingToggle("Cobblestone", false),
                new SettingToggle("Slab", false),
                new SettingToggle("Stair", false),
                new SettingToggle("Glass", true),
                new SettingToggle("Glass Pane", true),
                new SettingToggle("Ore", true),
                new SettingToggle("Wood", false),
                new SettingToggle("Prismarine", false)
        ],
        [
                "Made by fork"
        ]
    )
)

class XRayClass {
    constructor() {
        this.ModuleName = "X-Ray"
        this.Enabled = false

        this.XRay = Java.type("com.chattriggers.ctjs.polar.XRay")

        getKeyBind("X-Ray","Polar Client - Render", this)

        register("gameUnload", () => {
            if(this.Enabled) {
                this.Enabled = false
                this.XRay.INSTANCE.setEnabled(false)
                
                Client.getMinecraft().field_71438_f.func_72712_a()
            }
        })
    }

    toggle() {
        this.Enabled = !this.Enabled
        this.XRay.INSTANCE.setEnabled(this.Enabled)
        
        if (this.Enabled) this.addBlocks()

        Client.getMinecraft().field_71438_f.func_72712_a()
        ChatUtils.sendModMessage(this.ModuleName + ": " + (this.Enabled ? "&aEnabled": "&cDisabled"))
    }

    // Low effort
    addBlocks() {
        this.XRay.INSTANCE.clear()
        
        if (ModuleManager.getSetting(this.ModuleName, "Dirt")) 
            this.XRay.INSTANCE.addBlock(Blocks.field_150346_d)

        if (ModuleManager.getSetting(this.ModuleName, "Cobblestone")) 
            this.XRay.INSTANCE.addBlock(Blocks.field_150347_e)

        if (ModuleManager.getSetting(this.ModuleName, "Slab")) 
            this.XRay.INSTANCE.addBlocks([Blocks.field_150376_bx, Blocks.field_180389_cP, Blocks.field_150333_U])

        if (ModuleManager.getSetting(this.ModuleName, "Stair")) 
            this.XRay.INSTANCE.addBlocks([Blocks.field_150400_ck, Blocks.field_150487_bG, Blocks.field_150389_bf, Blocks.field_150401_cl, Blocks.field_150481_bH, Blocks.field_150387_bl, Blocks.field_150476_ad, Blocks.field_150370_cb, Blocks.field_180396_cN, Blocks.field_150372_bz, Blocks.field_150485_bF, Blocks.field_150390_bg, Blocks.field_150446_ar])

        if (ModuleManager.getSetting(this.ModuleName, "Glass")) 
            this.XRay.INSTANCE.addBlocks([Blocks.field_150399_cn, Blocks.field_150359_w])

        if (ModuleManager.getSetting(this.ModuleName, "Glass Pane")) 
            this.XRay.INSTANCE.addBlocks([Blocks.field_150410_aZ, Blocks.field_150397_co])

        if (ModuleManager.getSetting(this.ModuleName, "Ore")) 
            this.XRay.INSTANCE.addBlocks([Blocks.field_150365_q, Blocks.field_150482_ag, Blocks.field_150412_bA, Blocks.field_150352_o, Blocks.field_150366_p, Blocks.field_150369_x, Blocks.field_150439_ay, Blocks.field_150449_bY, Blocks.field_150450_ax, Blocks.field_150343_Z])

        if (ModuleManager.getSetting(this.ModuleName, "Wood")) 
            this.XRay.INSTANCE.addBlocks([Blocks.field_150364_r, Blocks.field_150363_s])

        if (ModuleManager.getSetting(this.ModuleName, "Prismarine")) 
            this.XRay.INSTANCE.addBlock(Blocks.field_180397_cI) 
    }
}

global.export.XRay = new XRayClass()