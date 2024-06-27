let { TeleportFailsafe, Failsafe, Utils } = global.export

class ItemFailsafe extends Failsafe {
    constructor() {
        super()

        this.items = []

        this.triggers = [
            register("worldLoad", this.reset),

            register("step", () => {
                if (!this.toggle || this.triggered || TeleportFailsafe.isTeleporting()) return

                let playerInventory = Player.getInventory()
                if (!playerInventory) return

                this.items.forEach(item => {
                    if (!item || !item.slot) return

                    if (
                        playerInventory.getStackInSlot(item.slot)?.getName() !== item.name && 
                        (item.name.charAt(item.name.length - 3) + item.name.charAt(item.name.length - 2)) !== " x"
                    ) this.scheduleFailsafe()
                })

                playerInventory.getItems().forEach((item, slot) => {
                    if (slot >= 9) return // Only check hotbar
                    if (item?.getID() === 166 || item?.getID() === 7) this.scheduleFailsafe()
                })
            }).setFps(4),

            register("tick", () => {
                if (this.triggered && this.responseTimer.hasReached(this.waitTime)) {
                    if (!TeleportFailsafe.isTeleporting() && this.toggle) global.export.FailsafeManager.trigger("Item")
                    this.triggered = false
                    this.items = []
                }
            }),

            // Disable failsafe while pickonimbus is broken TODO improve detection
            register("chat", (event) => {
                this.toggle = false
                Client.scheduleTask(100, () => this.toggle = true)
            }).setCriteria("Oh no! Your ${msg}"),

            register("packetReceived", (packet) => {
                if (Player.getHeldItemIndex() !== packet.func_149385_c()) this.scheduleFailsafe()
            }).setFilteredClass(net.minecraft.network.play.server.S09PacketHeldItemChange),

            // Monitor items the player switches to during macro (TODO improve)
            register("packetSent", (packet) => {
                const item = Player.getInventory().getStackInSlot(packet.func_149614_c())
                const json = { name: item?.getName(), slot: packet.func_149614_c() }
                if (!item || this.items.includes(json)) return

                this.items.push(json)
            }).setFilteredClass(net.minecraft.network.play.client.C09PacketHeldItemChange)
        ]
    }

    scheduleFailsafe() {
        this.triggered = true
        this.responseTimer.reset()
        this.waitTime = Utils.getRandomInRange(250, 550)
    }

    reset() {
        this.triggered = false
        this.items = []
    }
}

global.export.ItemFailsafe = new ItemFailsafe()