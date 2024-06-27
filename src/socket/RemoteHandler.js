let { ChatUtils } = global.export

class RemoteHandler {
    constructor() {
        register("command", () => {
            this.abortExit = true
            ChatUtils.sendCustomMessage("Remote", "&6Aborting exit...")
        }).setName("abortexit")

        register("chat", (cmd) => {
            if (!this.commandSent) return
            this.commandSent = false

            ChatLib.command(cmd, true)
        }).setCriteria("Unknown command. Type \"/help\" for help. ('${cmd}')")
    }

    handleCommand(ws, data) {
        switch (data.type) {
            case "TOGGLE":
                this.handleToggleCommand(ws, data)
                break
            case "STATUS":
                this.handleStatusCommand(ws, data)
                break
            case "RECONNECT":
                this.handleReconnectCommand(ws, data)
                break
            case "DISCONNECT":
                this.handleDisconnectCommand(ws, data)
                break
            case "QUIT":
                this.handleQuitCommand(ws, data)
                break
            case "COMMAND":
                this.handleCustomCommand(ws, data)
                break
            case "KEYPRESS":
                this.handleKeyPressCommand(ws, data)
                break
            case "AUTOREST":
                this.handleAutoRestCommand(ws, data)
                break
        }
    }

    doScreenshot(ws, data) {
        Client.scheduleTask(0, () => {
            const mc = Client.getMinecraft()
            const name = java.util.UUID.randomUUID().toString().replace("-", "")

            net.minecraft.util.ScreenShotHelper.func_148259_a(mc.field_71412_D, name, mc.field_71443_c, mc.field_71440_d, mc.func_147110_a())

            // Upload in new thread
            new Thread(() => {
                Thread.sleep(1000) // Wait for screenshot to save
                try {
                    const file = new java.io.File(mc.field_71412_D, `screenshots/${name}`)
                    const img = java.nio.file.Files.readAllBytes(file.toPath())

                    const encoded = java.util.Base64.getEncoder().encodeToString(img)
                    ws.send(JSON.stringify({ method: "REMOTE", data: { type: "SCREENSHOT", imageToken: data.imageToken, image: encoded } }))

                    file.deleteOnExit()
                } catch (e) {
                    ChatUtils.sendCustomMessage("Remote", "&cFailed to take screenshot!")
                    ws.send(JSON.stringify({ method: "REMOTE", data: { type: "SCREENSHOT", imageToken: data.imageToken, image: null } }))
                }
            }).start()
        })
    }

    handleToggleCommand(ws, data) {
        ChatUtils.sendCustomMessage("Remote", "&cToggle not implemented yet!")

        this.doScreenshot(ws, data)
        ws.send(JSON.stringify({ method: "REMOTE", data: { type: "TOGGLE", token: data.imageToken } }))

        /*
        const moduleInstance = global[module]

        if (!moduleInstance) return ChatUtils.sendCustomMessage("Remote", "&cModule not found!")

        moduleInstance.unloaded = state
        FileLib.write("PolarConfigV2", module, state.toString())
        ChatUtils.sendCustomMessage("Remote", "&a" + module + " has been " + (state ? "&cdisabled" : "&aenabled") + "&r.")
        */
    }

    handleStatusCommand(ws, data) {
        // TODO include macro data
        
        this.doScreenshot(ws, data)
        ws.send(JSON.stringify({ method: "REMOTE", data: { type: "STATUS", token: data.imageToken } }))
    }

    // TODO add failsafes for commands failing
    handleReconnectCommand(ws, data) {
        // TODO stop macros then delay

        Client.disconnect()
        setTimeout(() => Client.connect("mc.hypixel.net"), 3500)
        setTimeout(() => ChatLib.command("skyblock"), 12000)

        setTimeout(() => {
            this.doScreenshot(ws, data)
            ws.send(JSON.stringify({ method: "REMOTE", data: { type: "RECONNECT", token: data.imageToken } }))
        }, 13000)
    }

    handleDisconnectCommand(ws, data) {
        World.getWorld().func_72882_A() // sendQuittingDisconnectingPacket

        this.doScreenshot(ws, data)
        ws.send(JSON.stringify({ method: "REMOTE", data: { type: "DISCONNECT", token: data.imageToken } }))
    }

    handleQuitCommand(ws, data) {
        setTimeout(() => {
            if (this.abortExit) {
                this.abortExit = false
                return ChatUtils.sendCustomMessage("Remote", "&aExit aborted!")
            }
            ws.send(JSON.stringify({ method: "REMOTE", data: { type: "QUIT" } }))
            ws.close()
            
            Java.type("net.minecraftforge.fml.common.FMLCommonHandler").instance().exitJava(0, false)
        }, 5000)
        
        ChatUtils.sendCustomMessage("Remote", "&cQuitting in 5s...")
        ChatUtils.sendCustomMessage("Remote", "&fTo abort, type /abortexit!")
    }

    handleCustomCommand(ws, data) {
        const { command } = data
        ChatLib.command(command)

        this.commandSent = true
        Client.scheduleTask(20, () => this.commandSent = false)

        this.doScreenshot(ws, data)
        ws.send(JSON.stringify({ method: "REMOTE", data: { type: "COMMAND", token: data.imageToken } }))
    }

    handleKeyPressCommand(ws, data) {
        if (data.key) {
            const prev = Client.getMinecraft().field_71415_G

            Client.getMinecraft().field_71415_G = true
            net.minecraft.client.settings.KeyBinding.func_74507_a(Keyboard.getKeyIndex(data.key.toUpperCase()))
            Client.getMinecraft().field_71415_G = prev
        }
        
        this.doScreenshot(ws, data)
        ws.send(JSON.stringify({ method: "REMOTE", data: { type: "KEYPRESS", token: data.imageToken } }))
    }

    handleAutoRestCommand(ws, data) {
        ChatUtils.sendCustomMessage("Remote", "&cAutoRest not implemented yet!")

        // TODO this doesn't need image so do something
        ws.send(JSON.stringify({ method: "REMOTE", data: { type: "AUTOREST", token: "status_image"  } }))
    }
}

global.export.RemoteHandler = new RemoteHandler()