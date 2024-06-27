let { Failsafe, TimeHelper, Vector, registerEventSB } = global.export
let { ModuleManager } = global.settingSelection

class TeleportFailsafe extends Failsafe {
    constructor() {
        super()

        this.itemTeleport = 0
        this.positions = []

        this.teleportTimer = new TimeHelper()
        this.lagBackTimer = new TimeHelper()
        this.warpTimer = new TimeHelper()

        this.NULL_VEC = new Vector(0, 0, 0)
        this.POLAR_COMMANDS = ["/skyblock", "/is", "/l", "/lobby", "/hub"]

        // Death detection
        registerEventSB("death", () => this.reset())

        this.triggers = [
            register("worldLoad", () => this.reset()).setPriority(Priority.HIGHEST),
            register("worldUnload", () => this.reset()).setPriority(Priority.HIGHEST),

            register("tick", () => {
                // TODO check for lag instead of timer
                if (this.teleportTimer.hasReached(3000) && this.itemTeleport > 0) 
                    this.itemTeleport = 0
            }),

            register("packetSent", (packet, event) => {
                if (packet.func_149574_g()) {
                    if (ChatLib.removeFormatting(packet.func_149574_g()?.func_82833_r()).includes("Aspect of the")) {
                        this.itemTeleport++
                        this.teleportTimer.reset()
                    }
                }
            }).setFilteredClass(net.minecraft.network.play.client.C08PacketPlayerBlockPlacement).setPriority(Priority.HIGHEST),

            register("tick", () => {
                if (this.itemTeleport > 0) this.positions = []

                this.positions.push(new Vector(Player.getX(), Player.getY(), Player.getZ()))
                if (this.positions.length > 60) this.positions.shift()
            }),
            
            register("packetSent", (packet) => {
                const cmd = packet.func_149439_c()
                if (cmd.startsWith("/warp") || this.POLAR_COMMANDS.includes(cmd)) this.warpTimer.reset()
            }).setFilteredClass(net.minecraft.network.play.client.C01PacketChatMessage),

            register("packetReceived", (packet) => {
                if (!this.warpTimer.hasReached(1500)) return

                if (this.itemTeleport > 0) {
                    Client.scheduleTask(1, () => {  // TODO adjust with lag? idrk
                        if (this.itemTeleport > 0) this.itemTeleport--
                    })
                    return
                } 

                // Check for other failsafes

                const packetPos = new Vector(packet.func_148932_c(), packet.func_148928_d(), packet.func_148933_e())
                const playerPos = new Vector(Player.getX(), Player.getY(), Player.getZ())
                if (packetPos.equals(playerPos) || packetPos.equals(this.NULL_VEC)) return

                // Lagback check
                if (this.positions.some(pos => pos.getDistance(packetPos) <= 0.15) && playerPos.getDistance(packetPos) >= 0.5) {
                    //ChatLib.chat("&cLagback detected!")
                    this.lagBackTimer.reset()
                    return
                }

                // TODO bedrock box check integration

                if (this.toggle && playerPos.getDistance(packetPos) > 0.1) Client.scheduleTask(5, () => {
                    if (!this.warpTimer.hasReached(1500) || !this.toggle) return
                    global.export.FailsafeManager.trigger("Teleport")
                })
            }).setFilteredClass(net.minecraft.network.play.server.S08PacketPlayerPosLook).setPriority(Priority.HIGH),
        ]
    }

    isTeleporting() {   
        return this.itemTeleport > 0 || !this.warpTimer.hasReached(1500)
    }

    isInLagback() {
        return !this.lagBackTimer.hasReached(300)
    }

    reset() {
        this.itemTeleport = 0
        this.positions = []
        this.warpTimer.reset()
    }
}

global.export.TeleportFailsafe = new TeleportFailsafe()