let { TeleportFailsafe, Failsafe, Utils, TimeHelper } = global.export
let { ModuleManager } = global.settingSelection

// TODO -> beat interpolation
class RotationFailsafe extends Failsafe {
    constructor() {
        super()
        
        // Settings
        this.THRESHOLD = 0.19
        this.FLAG_THRESHOLD = 5
        register("step", () => {
            switch (ModuleManager.getSetting("Auto Vegetable", "Failsafe Sensitivity")) {
                case "Relaxed":
                    this.THRESHOLD = 0.25
                    this.FLAG_THRESHOLD = 6
                    break
                case "Normal":
                    this.THRESHOLD = 0.21
                    this.FLAG_THRESHOLD = 5
                    break
                case "High":
                    this.THRESHOLD = 0.19
                    this.FLAG_THRESHOLD = 3
                    break
                case "Strict":
                    this.THRESHOLD = 0.15
                    this.FLAG_THRESHOLD = 2
                    break
            }
        }).setDelay(1)

        // new test shit
        this.totalYawChange = 0
        this.totalPitchChange = 0
        this.packetTimer = new TimeHelper()

        this.flagTimer = new TimeHelper()
        this.flags = 0

        this.triggers = [
            register("packetReceived", (packet) => {
                // isInLagback fixes false flags from being stuck in blocks
                if (!this.toggle || this.triggered || TeleportFailsafe.isTeleporting() || TeleportFailsafe.isInLagback()) return 

                const dYaw = Math.abs(net.minecraft.util.MathHelper.func_76142_g(packet.func_148931_f() - Player.getRawYaw()))
                const dPitch = Math.abs(packet.func_148930_g() - Player.getPitch())

                if (dYaw === 360) return // || Player.getPlayer().field_70737_aN >= 5 -> Return if player has just been damaged

                if (this.packetTimer.hasReached(1000)) {
                    this.totalYawChange = dYaw
                    this.totalPitchChange = dPitch
                    this.packetTimer.reset()
                } else {
                    this.totalYawChange += dYaw
                    this.totalPitchChange += dPitch
                    this.packetTimer.reset()
                }

                if (this.totalYawChange >= this.THRESHOLD * 180 || this.totalPitchChange >= this.THRESHOLD * 90) {
                    this.triggered = true
                    this.responseTimer.reset()
                    this.waitTime = Utils.getRandomInRange(450, 750)
                } else if (dYaw >= 5 || dPitch >= 3) { // Small Rotation Check
                    //ChatLib.chat("&cSmall Rotation Detected! &7(" + dYaw.toFixed(2) + ", " + dPitch.toFixed(2) + ")")
                    this.flagTimer.reset()
                    this.flags++

                    if (this.flags >= this.FLAG_THRESHOLD) {
                        this.triggered = true
                        this.responseTimer.reset()
                        this.waitTime = Utils.getRandomInRange(250, 550)
                    }
                }
            }).setFilteredClass(net.minecraft.network.play.server.S08PacketPlayerPosLook),
    
            // Response
            register("tick", () => {
                if (!this.toggle) return

                // Clear flags after no more rotations
                if (this.flagTimer.hasReached(1500)) {
                    this.flags = 0
                    this.flagTimer.reset()
                }
    
                // Trigger failsafe
                if (this.triggered && this.responseTimer.hasReached(this.waitTime)) {
                    if (!TeleportFailsafe.isTeleporting() && this.toggle) global.export.FailsafeManager.trigger("Rotation")
                    this.reset()
                }
            })
        ]
    }

    reset() {
        this.triggered = false
    
        this.flags = 0
        this.flagTimer.reset()
        this.responseTimer.reset()
    }
}

global.export.RotationFailsafe = new RotationFailsafe()