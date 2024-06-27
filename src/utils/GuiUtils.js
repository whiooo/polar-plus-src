let { ChatUtils, NotificationHandler } = global.export

class GuiUtils {
    constructor() {
        this.defaultTheme = {
            "name": "Default",
            "author": "Farlow",
            "colours": {
              "panel": -15526631,
              "box": -15724013,
              "background": -15987185,
              "selection": -14736599,
              "logo": 15073261,
              "text": -1,
              "accent": 4382965,
              "buttonBackground": -15066080
            }
        }
        this.theme = JSON.parse(FileLib.read("PolarConfigV2", "theme.json") ?? {})

        this.DropShadowColour = new java.awt.Color(this.theme.colours["accent"])
    }

    DrawRoundedRect = (colour, x, y, width, height, radius) => {
        const matrix = Java.type("gg.essential.universal.UMatrixStack").Compat.INSTANCE
    
        matrix.runLegacyMethod(matrix.get(), () => {
            Java.type("gg.essential.elementa.components.UIRoundedRectangle").Companion.drawRoundedRectangle(
                matrix.get(),
                x,
                y,
                x + width,
                y + height,
                radius,
                colour
            )
        })
    }

    GetThemeColour = (key) => {
        return new java.awt.Color(this.theme.colours[key])
    }

    DropShadow = (loops, x, y, width, height, opacity, edgeRadius, clr=this.DropShadowColour) => {
        let r = clr.getRed() / 255
        let g = clr.getGreen() / 255
        let b = clr.getBlue() / 255
    
        GlStateManager.func_179092_a(GL11.GL_GREATER, 0.003921569) // alphaFunc
        GlStateManager.func_179147_l() // enableBlend
        GlStateManager.func_179141_d() // enableAlpha
        
        for (let margin = 0; margin <= loops / 2; margin += 0.5){
            this.DrawRoundedRect(new java.awt.Color(r, g, b, Math.min(0.2, Math.max(0.007, ((opacity - margin) * 1.3)))), x - margin / 2, y - margin / 2, width + margin, height + margin, edgeRadius);
        }
    }

    CreateNewTheme = () => {
        // find valid name
        let x = 1;
        let name = `newtheme-${x}.json`
        while (FileLib.exists(`PolarConfigV2/themes`, `${name}`)){
            x++;
            name = `newtheme-${x}.json`
        }
       
        // Load default theme and update name
        this.defaultTheme.name = `New Theme ${x}`;
    
        // Create new file
        const f = new java.io.File(`config/ChatTriggers/modules/PolarConfigV2/themes/${name}`);
        f.getParentFile().mkdirs();
        f.createNewFile();
          
        // Write to file
        FileLib.write("PolarConfigV2/themes", name, JSON.stringify(this.defaultTheme))
        
        NotificationHandler.SendNotification(`Theme Created!`, `${name}`, 3000)
    
        return name
    }

    SetTheme = (name) => {
        if (FileLib.exists(`PolarConfigV2/themes`, `${name}`)){
            let json = FileLib.read("PolarConfigV2/themes", `${name}`)
            FileLib.write("PolarConfigV2", "theme.json", json)
    
            Client.scheduleTask(5, () => {
                this.theme = JSON.parse(FileLib.read("PolarConfigV2", "theme.json"))
                this.DropShadowColour = new java.awt.Color(this.theme.colours.accent)
                NotificationHandler.SendNotification("Theme Updated", `${this.theme.name} - ${this.theme.author}`, 3000)
            })
        } else ChatUtils.sendModMessage(`Theme ${name} does not exist..`)
    }

    GetHudConfig = (name) => {
        let config = JSON.parse(FileLib.read("PolarConfigV2", "guiconfig.json"))
        if (!config.hud[name]) {
            NotificationHandler.SendNotification(`${name} config`, "none found. creating", 3000)
            
            config.hud[name] = {
                "x": 0.05 + (Object.keys(config.hud).length * 0.125),
                "y": 0.1
            }
    
            FileLib.write("PolarConfigV2", "guiconfig.json", JSON.stringify(config))
        }
        
    
        return config.hud[name]
    }
}

global.export.GuiUtils = new GuiUtils()