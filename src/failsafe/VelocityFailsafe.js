let { TeleportFailsafe, Failsafe } = global.export
let { ModuleManager } = global.settingSelection

class VelocityFailsafe extends Failsafe {
    constructor() {
        super()

        this.THRESHOLD = 8000
        register("step", () => {
            switch (ModuleManager.getSetting("Auto Vegetable", "Failsafe Sensitivity")) {
                case "Relaxed":
                    this.THRESHOLD = 12000
                    break
                case "Normal":
                    this.THRESHOLD = 8000
                    break
                case "High":
                    this.THRESHOLD = 6000
                    break
                case "Strict":
                    this.THRESHOLD = 4500
                    break
            }
        }).setDelay(1)

        this.triggers = [
            register("packetReceived", (packet) => {
                if (!this.toggle || Player.getPlayer().func_145782_y() !== packet.func_149412_c() || TeleportFailsafe.isTeleporting()) return

                // TODO add check for slime bouncy pads

                if (
                    Math.abs(packet.func_149411_d()) >= this.THRESHOLD ||
                    Math.abs(packet.func_149410_e()) >= this.THRESHOLD ||
                    Math.abs(packet.func_149409_f()) >= this.THRESHOLD
                ) global.export.FailsafeManager.trigger("Velocity")
            }).setFilteredClass(net.minecraft.network.play.server.S12PacketEntityVelocity)
        ]
    }
}

global.export.VelocityFailsafe = new VelocityFailsafe()