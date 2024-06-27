let { TeleportFailsafe, Failsafe } = global.export
let { ModuleManager } = global.settingSelection

// TODO implement other checks besides just bedrock
class BlockFailsafe extends Failsafe {
    constructor() {
        super()

        this.RANGE = 6
        this.CHANGE_THRESHOLD = 8
        register("step", () => {
            switch (ModuleManager.getSetting("Auto Vegetable", "Failsafe Sensitivity")) {
                case "Relaxed":
                    this.RANGE = 6
                    this.CHANGE_THRESHOLD = 10
                    break
                case "Normal":
                    this.RANGE = 6
                    this.CHANGE_THRESHOLD = 8
                    break
                case "High":
                    this.RANGE = 8
                    this.CHANGE_THRESHOLD = 8
                    break
                case "Strict":
                    this.RANGE = 8
                    this.CHANGE_THRESHOLD = 6
                    break
            }
        }).setDelay(1)

        this.triggers = [
            // Multi Block Change
            register("packetReceived", (packet) => {
                if (!this.toggle || this.triggered || TeleportFailsafe.isTeleporting()) return

                const blockChanges = packet.func_179844_a().map(b => { return { pos: new BlockPos(b.func_180090_a()), state: b.func_180088_c() } })

                // Checks if one of the blocks is within player mining range
                const playerPos = new BlockPos(Player.getX(), Player.getY() + 0.8, Player.getZ())
                if (!blockChanges.some(b => b.pos.distance(playerPos) <= this.RANGE)) return

                // Check all blocks are changing to the same state
                if (!blockChanges.length || !blockChanges.every(b => b.state === blockChanges[0].state)) return

                // If the change is over max efficient miner, flag
                if (blockChanges.length > this.CHANGE_THRESHOLD && this.toggle) global.export.FailsafeManager.trigger("Block")
            }).setFilteredClass(net.minecraft.network.play.server.S22PacketMultiBlockChange),

            // Block Change
            register("packetReceived", (packet) => {
                if (!this.toggle || this.triggered || TeleportFailsafe.isTeleporting()) return

                // TODO
                // add flag if bedrock
                // subtract flag after time
            }).setFilteredClass(net.minecraft.network.play.server.S23PacketBlockChange)

            // TODO check outgoing mining packets to whitelist individual blocks
        ]
    }
}

global.export.BlockFailsafe = new BlockFailsafe()