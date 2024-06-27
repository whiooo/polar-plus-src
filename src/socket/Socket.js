import WebSocket from "WebSocket"

let { SettingSelector, SettingSlider, SettingToggle, ConfigModuleClass } = global.settingSelection
let { ChatUtils } = global.export

global.modules.push(
    new ConfigModuleClass(
        "Backend Connection",
        "Misc",
        [
            new SettingToggle("IRC", true)
        ],
        [
            "Networking settings, for toggling backend features"
        ]
    )
)

class Socket {
    constructor() {
        this.MessageHandler = global.export.MessageHandler
        this.RemoteHandler = global.export.RemoteHandler

        this.ws = new WebSocket("wss://api.polarclient.lol/" + global.DO_NOT_SHARE_POLAR_API_KEY + "/true")

        this.HANDLERS = {
            HEARTBEAT: () => this.ws.send(JSON.stringify({ method: "HEARTBEAT" })),
            MESSAGE: (json) => this.MessageHandler.handleMessage(this.ws, json),
            REMOTE: (json) => this.RemoteHandler.handleCommand(this.ws, json)
        }

        // Handle incoming messages
        this.ws.onMessage = (msg) => {
            const json = JSON.parse(msg)
            if (!json.data) return
            if (!this.HANDLERS[json.method]) return

            this.HANDLERS[json.method](json.data ?? {})
        }

        // Open message
        this.ws.onOpen = () => {
            ChatUtils.sendCustomMessage("Loader", "&2Connected to backend!")
            this.reconnected = 0
        }
        
        // Output messages
        this.ws.onError = (exception) => {
            console.log("[Polar2Polar] " + exception)
        }
        
        // Reconnect
        this.reconnected = 0
        this.ws.onClose = (e) => {
            if (this.unloaded) return
        
            if (this.reconnected < 3) ChatUtils.sendCustomMessage("Loader", "&cAn error occured with the backend connection! Attempting reconnect in 5s!")
            else return ChatUtils.sendCustomMessage("Loader", "&cReconnect failed! Try /ct reload!")

            setTimeout(() => {
                this.reconnected++
                this.ws.reconnect()
            }, 5000)
        }

        this.ws.connect()
        this.MessageHandler.setupWs(this.ws)
        
        // Close on game unload
        this.unloaded = false
        register("gameUnload", () => {
            this.unloaded = true
            this.ws.close()
        })
    }
}

global.export.Socket = new Socket()