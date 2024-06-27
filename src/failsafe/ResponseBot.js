let { TimeHelper, MovementHelper, Rotations, ChatUtils, Utils, overlayManager } = global.export

// TODO

// fixes:
// prevent jumping randomly or walking off (store blocks previously on and check if about to go off and cancel movements)
// check for jump boost and apply fix?
// attempt to exit inventories if they are opened (maybe warn to press escape key in a time)

// add response validation before running, use backup otherwise
// fine tune score algorithm so it always picks good responses (blocks to jump on etc)
// add animation for typing chat messages
// make crouching more smart (prevent quick presses) so it isn't always crouching

class ResponseBot {
    constructor() {
        this.actions = []
        this.currentAction = null
        this.backupResponse = null
        this.playingSpecialAction = false

        this.duration = 12000
        this.timeHelper = new TimeHelper()

        this.OFFSETS = {
            pos: [0, 0, 0],
            forward: [0, 0, -1],
            back: [0, 0, 1],
            left: [-1, 0, 0],
            right: [1, 0, 0]
        }

        this.OPEN_SURROUNDINGS = {
            down: {
                pos: 1,
                forward: 1,
                back: 1,
                left: 1,
                right: 1
            },

            up: {
                pos: 1,
                forward: 1,
                back: 1,
                left: 1,
                right: 1
            }
        }

        this.MOVEMENT_KEYS = {
            forward: (state) => MovementHelper.setKey("w", state),
            backward: (state) => MovementHelper.setKey("s", state),
            left: (state) => MovementHelper.setKey("a", state),
            right: (state) => MovementHelper.setKey("d", state),
            jump: (state) => MovementHelper.setKey("space", state),
            sneak: (state) => MovementHelper.setKey("shift", state)
        }

        this.MESSAGES = []
        register("step", () => {
            // Load response messages
            this.MESSAGES = []
            if (!FileLib.exists("PolarConfigV2", "responseMessages.txt")) FileLib.append("PolarConfigV2", "responseMessages.txt", "")
            else FileLib.read("PolarConfigV2", "responseMessages.txt")?.replaceAll("\"", "")?.split("\n")?.filter(msg => msg)?.forEach(msg => this.MESSAGES.push(msg))

            // Load backup response
            if (!this.backupResponse)
                new Thread(() => this.backupResponse = this.fetchResponse(this.OPEN_SURROUNDINGS)).start()
        }).setDelay(60)

        this.ACTIONS = {
            item: () => {
                const items = Player.getInventory().getItems().map((value, slot) => { return { value, slot } }).splice(0, 9).filter(n => n.value)
                if (!items.length) return this.ACTIONS[this.getRandomAction()]() // Backup action

                const item = items[Math.floor(Math.random() * items.length)]
                if (!item) return this.ACTIONS[this.getRandomAction()]() // Backup action

                const previousSlot = Player.getHeldItemIndex()

                // Swap to random slot
                Client.scheduleTask(0, () => this.pause(false))
                Client.scheduleTask(Math.round(Utils.getRandomInRange(500, 700) / 50), () => Player.setHeldItemIndex(item.slot))
                Client.scheduleTask(Math.round(Utils.getRandomInRange(750, 900) / 50), () => this.unpause())

                // Swap back
                const swapBackTime = Math.round(Utils.getRandomInRange(1100, 2500) / 50)
                Client.scheduleTask(swapBackTime, () => this.pause(false))
                Client.scheduleTask(swapBackTime + Math.round(Utils.getRandomInRange(500, 700) / 50), () => Player.setHeldItemIndex(previousSlot))
                Client.scheduleTask(swapBackTime + Math.round(Utils.getRandomInRange(750, 900) / 50), () => {
                    this.playingSpecialAction = false
                    this.unpause()
                })
            },

            inventory: () => {
                Client.scheduleTask(0, () => this.pause())
                Client.scheduleTask(Math.round(Utils.getRandomInRange(500, 700) / 50), () => Client.getMinecraft().func_147108_a(new net.minecraft.client.gui.inventory.GuiInventory(Player.getPlayer())))
                Client.scheduleTask(Math.round(Utils.getRandomInRange(1600, 1750) / 50), () => Client.currentGui.close())
                Client.scheduleTask(Math.round(Utils.getRandomInRange(1800, 2000) / 50), () => this.unpause())
            },

            swing: () => {
                if (!Client.isInGui() && !Client.isInChat()) Player.getPlayer().func_71038_i()

                if (Math.random() >= 0.6) Client.scheduleTask(Math.round(Utils.getRandomInRange(800, 2500) / 50), () => {
                    if (!Client.isInGui() && !Client.isInChat())
                        Player.getPlayer().func_71038_i()
                })
            },

            chat: () => {
                if (!this.MESSAGES?.length) return this.ACTIONS[this.getRandomAction()]() // Backup action

                const selectedMessage = this.MESSAGES[Math.floor(Math.random() * this.MESSAGES.length)]

                // Calculate time to type message
                const wpm = Utils.getRandomInRange(50, 115)
                const typeTime = ((selectedMessage.length / wpm) * 1000) + Utils.getRandomInRange(700, 1000) // Add time for opening chat etc

                // "Type" message
                Client.scheduleTask(0, () => this.pause())
                Client.scheduleTask(Math.round(typeTime / 50), () => ChatLib.command(`ac ${selectedMessage}`))
                Client.scheduleTask(Math.round(typeTime / 50) + Math.round(Utils.getRandomInRange(300, 500) / 50), () => this.unpause())
            }
        }

        register("packetSent", () => {
            if (!this.isPlayback) return

            if (this.timeHelper.isPaused && !Client.isInGui() && !this.playingSpecialAction) this.unpause()
            if ((Client.isInGui() && !Client.isInChat()) || this.timeHelper.isPaused) return this.pause()

            if (!this.currentAction || this.timeHelper.hasReached(this.currentAction?.time ?? 0))
                this.currentAction = this.actions.shift()

            // Set rotations with sensitivity fix and slight randomness
            const sensFix = Rotations.applySensitivity({
                yaw: Player.getRawYaw() + net.minecraft.util.MathHelper.func_76142_g(this.currentAction.yaw + Math.random() / 10 - Player.getYaw()),
                pitch: this.currentAction.pitch + Math.random() / 20
            })
            Player.getPlayer().field_70177_z = sensFix.yaw
            Player.getPlayer().field_70125_A = sensFix.pitch

            // Finished playback
            if (!this.actions.length) this.end()

            // Set movement keys
            Object.entries(this.MOVEMENT_KEYS).forEach(([key, value]) => {
                if (this.currentAction.keys?.[key]) value(true)
                else value(false)
            })
        }).setFilteredClass(net.minecraft.network.play.client.C03PacketPlayer)
    }

    pause(unsneak=true) {
        if (this.timeHelper.isPaused) return // Already paused

        this.timeHelper.pause()
        unsneak ? MovementHelper.unpressKeys() : MovementHelper.stopMovement()
    }

    unpause() {
        this.timeHelper.unpause()
    }

    end(cb=true) {
        this.isPlayback = false

        // Stop all movement
        Client.scheduleTask(5, () => {
            ChatUtils.sendCustomMessage("AutoVegetable", "&2Response finished!")
            overlayManager.DisableOverlay("FAILSAFES")

            MovementHelper.unpressKeys()
            if (cb) this.cb?.()
        })
    }

    scanSurroundings() {
        const playerPos = [Player.getX(), Player.getY(), Player.getZ()].map(x => Math.round(x))

        const surroundings = this.OPEN_SURROUNDINGS

        Object.entries(this.OFFSETS).forEach(([key, offset]) => {
            for (let y = 0; y <= 1; y++) {
                let block = World.getBlockAt(playerPos[0] + offset[0], playerPos[1] + offset[1], playerPos[2] + offset[2])

                surroundings[y === 0 ? "down" : "up"][key] = this.isBlockSolid(block) ? 0 : 1
            }
        })

        return surroundings
    }

    isBlockSolid(block) {
        // Random blocks I could think of causing issues (should add crops eventually)
        return !["minecraft:air", "minecraft:snow_layer", "minecraft:carpet", "minecraft:sapling", "minecraft:ladder"].includes(block.type.getRegistryName())
    }

    fetchResponse(surroundings) {
        try {
            return JSON.parse(FileLib.getUrlContent(
                `https://api.polarclient.lol/module/response?key=${global.DO_NOT_SHARE_POLAR_API_KEY}&surroundings=${FileLib.encodeBase64(surroundings)}`
            ))
        } catch (e) {
            if (this.backupResponse) ChatUtils.sendCustomMessage("AutoVegetable", `Error occured during response generation. Using backup response!`)

            return this.backupResponse
        }
    }

    findOptimalResponse(cb=()=>{}) {
        const target = this.scanSurroundings()
        const selectedResponse = this.fetchResponse(target)
        if (!selectedResponse) return ChatUtils.sendCustomMessage("AutoVegetable", `Error occured during response generation. No backup response available!`) // TODO add validation

        // Set variables
        this.actions = selectedResponse.actions
        this.duration = selectedResponse.duration ?? 12000

        // Wait for response timer
        const remainingTime = global.export.FailsafeManager.responseWaitTime - global.export.FailsafeManager.startTimer.getTimePassed()
        if (remainingTime > 0) Thread.sleep(remainingTime)

        // Align with start position (roughly)
        const startPos = new net.minecraft.util.Vec3((Math.floor(Player.getX()) + selectedResponse.start.x), Player.getY(), (Math.floor(Player.getZ()) + selectedResponse.start.z))
        const angles = Rotations.getAngles(startPos)

        // Set keys to go vaguely to start pos
        Client.scheduleTask(0, () => {
            MovementHelper.setKey("sneak", true)
            MovementHelper.setKeysForStraightLine(net.minecraft.util.MathHelper.func_76142_g(angles.yaw), false)
        })

        // Stop alignment but don't unsneak
        Client.scheduleTask(3, () => {
            MovementHelper.stopMovement()
        })

        // Align with start angles
        Rotations.rotateToAngles(selectedResponse.start.yaw, selectedResponse.start.pitch)

        // Start playback
        Rotations.onEndRotation(() => {
            this.currentAction = this.actions.shift()
            this.timeHelper.reset()
            this.isPlayback = true

            // Schedule actions at strategic times throughout response
            this.scheduleRandomActions()
        })

        this.cb = cb
    }

    scheduleRandomActions() {
        const minStart = this.duration / 10

        const actionTimes = []
        if (Math.random() <= 0.6) {
            actionTimes.push(Utils.getRandomInRange(minStart, this.duration - (this.duration / 5)))
        } else {
            let num1, num2
            do {
                num1 = Utils.getRandomInRange(minStart, this.duration - (this.duration / 5))
                num2 = Utils.getRandomInRange(minStart, this.duration - (this.duration / 5))
            } while (Math.abs(num1 - num2) <= this.duration / 4)

            actionTimes.push(
                num1,
                num2
            )
        }

        actionTimes.forEach(time => {
            const selectedAction = this.getRandomAction()

            // Schedule action
            setTimeout(() => {
                // GUI Check
                if (Client.isInGui() && !Client.isInChat()) return

                if (this.isPlayback && !this.timeHelper.isPaused && !this.playingSpecialAction) {
                    this.playingSpecialAction = true
                    this.ACTIONS[selectedAction]()
                }
            }, time)
        })
    }

    getRandomAction() {
        const actions = Object.keys(this.ACTIONS)
        return actions[Math.floor(Math.random() * actions.length)]
    }
}

global.export.ResponseBot = new ResponseBot()