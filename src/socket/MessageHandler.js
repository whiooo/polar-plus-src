// TODO Add rank prefixes -> ❅ &6+ ⚠ &2 &3 &1 &0 &8 &e &b

let { ChatUtils } = global.export
let { ModuleManager } = global.settingSelection

class MessageHandler {
    constructor() {
        new KeyBind("Open IRC", Keyboard.KEY_APOSTROPHE, "[IRC]").registerKeyPress(() => Client.setCurrentChatMessage("#"))

        register("step", () => this.unloaded = !ModuleManager.getSetting("Backend Connection", "IRC")).setDelay(1)
    }

    handleMessage(ws, data) {
        switch (data.type) {
            case "IRC":
                this.handleIRCMessage(data)
                break
            case "UPDATE":
                this.handleUpdateMessage(data)
                break
        }
    }

    setupWs(ws) {
        this.ws = ws
        if (this.unloaded) return
        
        register("messageSent", (message, event) => {
            if (!message.startsWith("#")) return
            cancel(event)

            if (this.unloaded) return ChatUtils.sendCustomMessage("IRC", "&cNot connected to Polar2Polar. Try /ct reload.")

            try {
                this.ws.send(JSON.stringify({ 
                    method: "MESSAGE", 
                    data: {
                        type: "IRC",
                        message: message.replaceAll("#", "") 
                    }
                }))
            } catch (e) {
                console.log(e)
                ChatUtils.sendCustomMessage("IRC", "&cAn error occured with the backend connection! Try /ct reload.")
            }
        })
    }

    handleIRCMessage(data) {
        // Weird Fix: Adds invisible character to fix formatting issues
        if (!this.unloaded) 
            ChatLib.chat(`&8[&5IRC&8]&b ${data.username.replaceAll(".", String.fromCharCode(0xD800, 0xDF00) + ".") ?? "Unknown"} &8>&r ${data.message}`)
    }

    handleUpdateMessage(data) {
        const textComponents = []
        textComponents.push(
            new TextComponent("&8[&3Update&8] &f"), 
            new TextComponent(!data.version ? "A new version is now available!" : "Version " + data.version + " is now available!")
        )

        new Message(textComponents).chat()
    }
}

global.export.MessageHandler = new MessageHandler()