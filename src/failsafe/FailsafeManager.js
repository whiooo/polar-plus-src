let { TimeHelper, ChatUtils, NotificationUtils, ResponseBot, Utils, overlayManager } = global.export
let { ModuleManager, getKeyBind } = global.settingSelection

class FailsafeManager {
    constructor() {
        this.failsafes = {
            "Rotation": global.export.RotationFailsafe,
            "Teleport": global.export.TeleportFailsafe,
            "Velocity": global.export.VelocityFailsafe,
            "Player": global.export.PlayerFailsafe,
            "Block": global.export.BlockFailsafe,
            "Item": global.export.ItemFailsafe
        }

        this.triggerAction = (cb) => cb()
        this.postAction = () => {}

        // Cancel Response Logic
        this.cancelBind = getKeyBind("Cancel Response", "Polar Client - Failsafes")
        this.cancelBind.registerKeyPress(() => {
            // Disable overlay on click
            if (!ResponseBot.isPlayback && this.startTimer.hasReached(this.responseWaitTime)) return overlayManager.DisableOverlay(this.OVERLAY_ID)

            ChatUtils.sendCustomMessage("AutoVegetable", "&cUser cancelled response!")
            ResponseBot.end(false)
        })

        // Overlay
        this.OVERLAY_ID = "FAILSAFES"
        this.startTimer = new TimeHelper()

        overlayManager.AddOverlay("Auto Vegetable", this.OVERLAY_ID)
        overlayManager.AddOverlayText(this.OVERLAY_ID, "ESCAPE_ALERT", `Press ${Keyboard.getKeyName(this.cancelBind.getKeyCode())} to stop movement!`)
        overlayManager.AddOverlayBar(this.OVERLAY_ID, "RESPONSE_TIMER", 0, `Responding in ${(this.responseWaitTime / 1000).toFixed(2)}s...`)

        // MAYBE (LAG)???
        register("step", () => {
            if (this.startTimer.getTimePassed() >= (ResponseBot.duration + this.responseWaitTime + 1000)) return

            if (this.startTimer.hasReached(this.responseWaitTime)) {
                const remaining = ResponseBot.duration - this.startTimer.getTimePassed() + this.responseWaitTime + 1000 // 1s buffer
                if (remaining <= 0) {
                    overlayManager.DisableOverlay(this.OVERLAY_ID)
                    return
                }

                overlayManager.UpdateOverlayBar(this.OVERLAY_ID, "RESPONSE_TIMER", remaining / ResponseBot.duration, `${(remaining / 1000).toFixed(2)}s Remaining...`)
                return
            }

            const remaining = (this.responseWaitTime - this.startTimer.getTimePassed())
            overlayManager.UpdateOverlayLine(this.OVERLAY_ID, "ESCAPE_ALERT", `Press ${Keyboard.getKeyName(this.cancelBind.getKeyCode())} to stop movement!`)
            overlayManager.UpdateOverlayBar(this.OVERLAY_ID, "RESPONSE_TIMER", remaining / this.responseWaitTime, `Responding in ${(remaining / 1000).toFixed(2)}s...`)
        }).setFps(100)

        // Update Settings
        this.failsafesEnabled = true
        this.responsesEnabled = true
        this.responseWaitTime = 2000
        this.overlay = true
        this.failsafeSensitivity = "Normal"
        register("step", () => {
            this.failsafesEnabled = ModuleManager.getSetting("Auto Vegetable", "Failsafes Enabled")
            this.responsesEnabled = ModuleManager.getSetting("Auto Vegetable", "Responses Enabled")
            this.responseWaitTime = ModuleManager.getSetting("Auto Vegetable", "Response Delay")
            this.overlay = ModuleManager.getSetting("Auto Vegetable", "Response Overlay")
            this.failsafeSensitivity = ModuleManager.getSetting("Auto Vegetable", "Failsafe Sensitivity")
        }).setDelay(1)

        register("command", (...args) => {
            if (args?.[0] !== "changedpassword") return
            this.trigger("Test")
        }).setName("testav")

        register("command", () => {
            ChatUtils.sendCustomMessage("AutoVegetable", "&cFailsafes Enabled!")
            this.register((cb) => {
                this.postAction()
                overlayManager.DisableOverlay(this.OVERLAY_ID)
            }, () => {})
        }).setName("testfailsafes")
    }

    // Sets failsafes to the ones elected in options
    register(triggerAction, postAction, options=Object.keys(this.failsafes)) {
        this.unregister()

        options.forEach(option => this.failsafes[option]?.setToggled(true))
        this.triggerAction = triggerAction
        this.postAction = postAction
    }

    unregister() {
        Object.values(this.failsafes).forEach(failsafe => failsafe.setToggled(false))
    }

    // Alert user of a failsafe trigger
    trigger(failsafe, message="Failsafe triggered!") {
        if (!this.checkFailsafesActive()) return
        this.unregister() // Disable all failsafes

        this.alertUser(failsafe, message)

        // Response Bot
        if (!this.responsesEnabled) return
        this.startTimer.reset()

        overlayManager.UpdateOverlayBar(this.OVERLAY_ID, "RESPONSE_TIMER", 0, `Responding in ${this.responseWaitTime}s...`)
        if (this.overlay) overlayManager.EnableOverlay(this.OVERLAY_ID)

        // Let macros handle stopping themselves, then continue to response
        this.triggerAction(() => {
            ChatUtils.sendCustomMessage("AutoVegetable", "&2Starting response!")
            new Thread(() => {
                ResponseBot.findOptimalResponse(() => {
                    this.postAction()
                    overlayManager.DisableOverlay(this.OVERLAY_ID)
                })
            }).start()
        }) 
    }

    // Helper Methods

    checkFailsafesActive() {
        if (!this.failsafesEnabled) return false
        if (ResponseBot.isPlayback || this.startTimer.getTimePassed() <= this.responseWaitTime) return false // Don't trigger failsafes while responding

        return !global.export.TeleportFailsafe.isTeleporting() && !global.export.AutoReconnect.isReconnecting()
    }

    alertUser(failsafe, message) {
        ChatUtils.sendCustomMessage("AutoVegetable", `&c${failsafe} ${message}`)
        
        Utils.warnPlayer(`Failsafe Triggered: ${failsafe}\nInstance: ${Player.getName()}`)
    }

    getAudioSource() {
        const src = ModuleManager.getSetting("Auto Vegetable", "Failsafe Audio")?.toLowerCase() ?? "tave"
        return `${src}-check.ogg`
    }
}

global.export.FailsafeManager = new FailsafeManager()