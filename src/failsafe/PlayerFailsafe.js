let { Failsafe, TeleportFailsafe, Rotations, Vector, RaytraceUtils, Utils } = global.export
let { ModuleManager } = global.settingSelection

// Later
// - add some maths to adjust the angle threshold based on distance
// - october's suggestions
// - do custom response then warp away

class PlayerFailsafe extends Failsafe {
    constructor() {
        super()

        this.DISTANCE_THRESHOLD = 30
        this.ANGLE_THRESHOLD = 20
        this.FLAG_THRESHOLD = 4
        this.BLOCK_FLAG_THRESHOLD = 3
        this.lookingTriggersFailsafe = false
        register("step", () => {
            this.lookingTriggersFailsafe = ModuleManager.getSetting("Auto Vegetable", "Looking Triggers Player Failsafe")

            switch (ModuleManager.getSetting("Auto Vegetable", "Failsafe Sensitivity")) {
                case "Relaxed":
                    this.DISTANCE_THRESHOLD = 20
                    this.ANGLE_THRESHOLD = 15
                    this.FLAG_THRESHOLD = 5
                    this.BLOCK_FLAG_THRESHOLD = 4
                    break
                case "Normal":
                    this.DISTANCE_THRESHOLD = 30
                    this.ANGLE_THRESHOLD = 20
                    this.FLAG_THRESHOLD = 4
                    this.BLOCK_FLAG_THRESHOLD = 3
                    break
                case "High":
                    this.DISTANCE_THRESHOLD = 40
                    this.ANGLE_THRESHOLD = 25
                    this.FLAG_THRESHOLD = 3
                    this.BLOCK_FLAG_THRESHOLD = 3
                    break
                case "Strict":
                    this.DISTANCE_THRESHOLD = 50
                    this.ANGLE_THRESHOLD = 30
                    this.FLAG_THRESHOLD = 2
                    this.BLOCK_FLAG_THRESHOLD = 2
                    break
            }
        }).setDelay(1)

        this.playerFlags = new Map()
        this.blockedFlags = 0

        this.NPC_REGEX = /^[0-9A-F]{8}-[0-9A-F]{4}-2[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i

        this.triggers = [
            register("worldLoad", this.reset),

            // TODO improve
            register("chat", (lvl, user, msg) => {
                if (!this.toggle || user.includes(Player.getName())) return // Self
                if (msg.includes(Player.getName())) Utils.warnPlayer("You were mentioned in chat!")
            }).setCriteria("[${lvl}] ${user}: ${msg}"),

            register("attackEntity", (p) => {
                if (this.blockedFlags > 0) this.blockedFlags -= 2
            }),

            // Costly, so run every second
            register("step", () => {
                if (!this.toggle || TeleportFailsafe.isTeleporting()) return

                if (Player.lookingAt()?.getClassName() === "EntityOtherPlayerMP" && !(Client.isInGui() && !Client.isInChat())) this.blockedFlags++
                else if (this.blockedFlags > 0) this.blockedFlags--

                if (this.blockedFlags >= this.BLOCK_FLAG_THRESHOLD) return global.export.FailsafeManager.trigger("Player")

                World.getAllPlayers()
                    .filter(p => p.getName() !== Player.getName() && !p.isInvisible() && p.getUUID().version() !== 2) // NPCs use UUID V2
                    .forEach((p) => {
                        const isLooking = this.isLookingAtPlayer(p)

                        // Subtract flags if not looking
                        if (!isLooking && this.playerFlags.has(p.getName())) 
                            return this.playerFlags.set(p.getName(), Math.max(0, this.playerFlags.get(p.getName()) - 1))
                        else if (!isLooking) return

                        const flags = this.playerFlags.get(p.getName()) ?? 0
                        this.playerFlags.set(p.getName(), flags + 1)

                        if ((flags + 1) % this.FLAG_THRESHOLD === 0) {
                            if (this.lookingTriggersFailsafe) global.export.FailsafeManager.trigger("Player", `${p.getName()} is looking at you!`)
                            else Utils.warnPlayer(`${p.getName()} is ${flags > this.FLAG_THRESHOLD ? "still " : ""}looking at you!`)
                        }   
                    })
            }).setDelay(1)
        ]
    }

    isLookingAtPlayer(p) {
        if (p.distanceTo(Player.asPlayerMP()) > this.DISTANCE_THRESHOLD) return false
        if (!Player.asPlayerMP().canSeeEntity(p)) return false

        const diff = Math.abs(net.minecraft.util.MathHelper.func_76142_g(p.getYaw() - Rotations.getAnglesFromVec(p.getEyePosition(1), new Vector(Player.asPlayerMP()))?.yaw))
        return diff <= this.ANGLE_THRESHOLD
    }

    reset() {
        if (!this.playerFlags) this.playerFlags = new Map()
        this.playerFlags.clear()
        this.blockedFlags = 0
    }
}

global.export.PlayerFailsafe = new PlayerFailsafe()