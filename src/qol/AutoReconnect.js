import Skyblock from "BloomCore/Skyblock"
let { TimeHelper, ChatUtils, ItemUtils, MathUtils, PathHelper, MovementHelper, Rotations, Vector } = global.export

/*

- reconnect to server if necessary
- implement into comm macro (on worldLoad) and rc toggle

*/

// ch pass -> 87 198 -100

// TODO add overlay
class AutoReconnect {
    constructor() {
        this.LOCATIONS = {
            UNKNOWN: "skyblock",

            ISLAND: "is",
            HUB: "warp hub",

            MINES: "warp mines",
            FORGE: "warp forge",
            CAMP: "warp camp",

            CH: "warp ch",
            NUCLEUS: "warp nucleus",
        }

        // Converts SB location to this.LOCATIONS
        this.CURRENT_LOCATIONS = {
            "Private Island": this.LOCATIONS.ISLAND,
            "Hub": this.LOCATIONS.HUB,

            "Dwarven Mines": this.LOCATIONS.MINES,
            "The Forge": this.LOCATIONS.FORGE,

            "Crystal Hollows": this.LOCATIONS.CH,
            "Crystal Nucleus": this.LOCATIONS.NUCLEUS,

            "Dwarven Base Camp": this.LOCATIONS.CAMP,
        }

        this.reconnecting = false
        this.target = null
        this.finishActions = []

        this.reconnectTimer = new TimeHelper()
        this.joinAttempts = 0

        register("step", () => {
            const location = this.getCurrentLocation()
            if (location === this.target) return this.end() // Success
            else if (this.joinAttempts > 3) return this.end(false) // Fail

            // Reconnect Delay
            if (!this.reconnecting || !this.reconnectTimer.hasReached(3000 * Math.max(1, this.joinAttempts ** 2))) return // Exponential backoff
            
            ChatLib.command(location !== this.LOCATIONS.UNKNOWN ? this.target : location)
            this.reconnectTimer.reset()
            this.joinAttempts++
        }).setFps(4)

        // Reset attempts on successful world change
        register("worldLoad", () => this.joinAttempts = 0)

        // Limbo detection (and recovery)
        register("chat", () => {
            if (this.reconnecting) ChatLib.command("l")
        }).setCriteria("Use /lobby first!")

        // No scroll detection
        register("chat", (event) => {
            if (!this.reconnecting) return
            if (this.target !== this.LOCATIONS.NUCLEUS) return this.end(false)
            cancel(event)

            // Visit a portal island
            
            ChatUtils.sendModMessage("You haven't unlocked this fast travel destination! Visiting a Portal Island...")
            let prevTarget = this.target ?? this.LOCATIONS.NUCLEUS
            let prevActions = this.finishActions ?? []
            this.finishActions = []

            if (!Skyblock.subArea.includes("Implodent")) ChatLib.command("visit implodent")
            Client.scheduleTask(20, () => {
                if (Player.getContainer()?.getName() !== "Visit Implodent") return

                Player.getContainer().click(11)
            })

            Client.scheduleTask(40, () => {
                if (!(Client.isInGui() && !Client.isInChat())) MovementHelper.setKeysForStraightLine(MathUtils.calculateAngles(new Vector(-8, 99, 50)).yaw, false)

                this.start(prevTarget)
                this.onFinish(() => MovementHelper.stopMovement())
                prevActions.forEach((a) => this.onFinish(a))
            })
        }).setCriteria("You haven't unlocked this fast travel destination!")

        // CH pass detection
        register("chat", (event) => {
            if (!this.reconnecting) return
            cancel(event)

            ChatUtils.sendModMessage("You do not have an active Crystal Hollows pass! Travelling to Dwarven Mines...")
            let prevTarget = this.target ?? this.LOCATIONS.CH
            let prevActions = this.finishActions ?? []
            this.finishActions = []

            this.end(false)
            this.start(this.LOCATIONS.MINES)

            this.onFinish(() => {
                PathHelper.followPath([[6, 199, -121], [32, 200, -112], [56, 199, -108], [75, 197, -98], [86, 197, -98]])
                PathHelper.onFinish(() => {
                    Rotations.rotateTo(new Vector(88.5, 199, -98.5))
                    Rotations.onEndRotation(() => { // TODO improve pass buy
                        ItemUtils.rightClick()
                        Client.scheduleTask(20, () => {
                            if (Player.getContainer()?.getName() !== "Crystal Hollows") return
                            Player.getContainer().click(22)

                            this.start(prevTarget)
                            prevActions.forEach((a) => this.onFinish(a))
                            ChatUtils.sendModMessage("Bought pass! Travelling to CH...")
                        })
                    })
                })
            })
        }).setCriteria("You do not have an active Crystal Hollows pass!")

        // Test Commands

        // Area Test
        register("command", () => ChatUtils.sendModMessage(Skyblock.area + " -> " + Skyblock.subArea)).setName("testarea")

        // RC Test
        register("command", () => {
            this.start(this.LOCATIONS.HUB)
            this.onFinish(() => ChatUtils.sendModMessage("Finished RC Test!"))
        }).setName("testrc")
    }

    start(target) {
        this.reconnecting = true
        this.target = target
    }

    onFinish(cb) {
        this.finishActions.push(cb)
    }

    end(success=true) {
        this.joinAttempts = 0
        this.reconnecting = false
        this.target = null

        if (!success) return ChatUtils.sendModMessage("&cFailed to reconnect...")

        this.finishActions.forEach((cb) => cb())
        this.finishActions = []
    }

    isReconnecting() {
        return this.reconnecting || PathHelper.pathfinding
    }

    getCurrentLocation() {
        return this.CURRENT_LOCATIONS[Skyblock.subArea] ?? this.CURRENT_LOCATIONS[Skyblock.area] ?? this.LOCATIONS.UNKNOWN
    }

    getCurrentArea() {
        return this.CURRENT_LOCATIONS[Skyblock.area] ?? this.LOCATIONS.UNKNOWN
    }
}

global.export.AutoReconnect = new AutoReconnect()