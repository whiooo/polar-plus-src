let { SettingSelector, SettingSlider, SettingToggle, ConfigModuleClass, ModuleToggle, getKeyBind, ModuleManager } = global.settingSelection

let { ChatUtils, GuiUtils, TimeHelper, AutoReconnect } = global.export

global.modules.push(
    new ConfigModuleClass(
        "Lobby Hopper",
        "Misc",
        [
            new SettingSlider("Max Lobby Day", 3, 0, 10),
            new SettingToggle("Route Scanner", false)
        ],
        [
            "Swaps between CH lobbies until it finds a lobby under the specified day",
            "Route scanner will attempt to check your route if the chunks are loaded"
        ]
    )
)

class lobbyHopper {
    constructor() {
        this.ModuleName = "Lobby Hopper"

        this.enabled = false
        this.warpCooldown = new TimeHelper()

        getKeyBind(this.ModuleName, "Polar Client - Misc").registerKeyPress(() => {
            this.enabled = !this.enabled
            this.warpCooldown.reset()

            if (this.enabled) this.sendMacroMessage(`§9Beginning search for a lobby under ${this.lobbyDay} days!`)
            else {
                this.sendMacroMessage("§cStopping search!")
                AutoReconnect.end(false)
            }
        })

        // Settings
        this.lobbyDay = ModuleManager.getSetting(this.ModuleName, "Max Lobby Day")
        this.routeScanner = ModuleManager.getSetting(this.ModuleName, "Route Scanner")
        register("step", () => {
            this.lobbyDay = ModuleManager.getSetting(this.ModuleName, "Max Lobby Day")
            this.routeScanner = ModuleManager.getSetting(this.ModuleName, "Route Scanner")
        }).setDelay(1)
         
        // Continues the search or exits
        this.rcCallback = () => {
            if (!this.enabled) return

            const day = this.getLobbyDay()
            if (day <= this.lobbyDay) {
                global.export.NotificationUtils.sendAlert(`Found a day ${this.getLobbyDay()} lobby!`)
                this.sendMacroMessage(`§aFound a day ${day} lobby!`)

                if (this.routeScanner) ChatLib.command("scanroute", true)

                this.enabled = false
            } else if (!AutoReconnect.isReconnecting()) {
                AutoReconnect.start(AutoReconnect.LOCATIONS.ISLAND)
                AutoReconnect.onFinish(() => this.warpCooldown.reset())
            }
        }

        register("step", () => {
            if (!this.enabled || !this.warpCooldown.hasReached(3000) || AutoReconnect.isReconnecting()) return

            AutoReconnect.start(AutoReconnect.LOCATIONS.CH)
            AutoReconnect.onFinish(this.rcCallback)
        }).setDelay(1)
    }

    getLobbyDay() {
        return Math.floor(World.getTime() / 24000)
    }

    sendMacroMessage(msg) {
        ChatUtils.sendModMessage(this.ModuleName + ": " + msg)
    }
}

new lobbyHopper()