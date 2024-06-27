/* @ Plus @ */
import Skyblock from "BloomCore/Skyblock";
let { SettingSelector, SettingSlider, SettingToggle, ConfigModuleClass, ModuleToggle, getKeyBind, ModuleManager } = global.settingSelection
let { ChatUtils, MouseUtils, MathUtils, RenderUtils, PolarPathFinder, ItemUtils, Utils, Vector, TimeHelper, Rotations, PathHelper, MovementHelper } = global.export

global.modules.push(
    new ConfigModuleClass(
        "Combat Macro",
        "Combat",
        [
            new SettingSelector("Target Type", 0, [
                "Revenant",
                "Tarantula",
                "Sven",
                "Ice Walker"
            ]),
            //new SettingSlider("Slayer Tier", 4, 1, 5),

            new SettingSlider("Weapon", 1, 1, 8)
        ], [
            "THIS MACRO IS IN ALPHA!",
            "Always be closely watching and expect bugs!"
        ]
    )
)

// TODO
// - pathfinder antistuck

/*
    mc.gameSettings.keyBindRight.setKeyPressed(direction);
    mc.gameSettings.keyBindLeft.setKeyPressed(!direction);
*/

// by fork
class CombatMacro {
    constructor() {
        this.ModuleName = "Combat Macro"
        this.enabled = false

        getKeyBind("Combat Macro", "Polar Client - Combat", this)

        this.STATES = {
            WALKING: 0,
            HITTING: 1,
            SCANNING: 2,
            WARPING: 3
        }

        this.state = this.STATES.WARPING
        this.attackTimer = new TimeHelper()
        this.attackDelay = Utils.getRandomInRange(80, 120)

        this.targetEntity = null
        this.targetVector = null
        this.targetTimer = new TimeHelper()
        this.lastSeenTimer = new TimeHelper()
        this.switchTimer = new TimeHelper()
        this.targetBlacklist = []

        // Target Info
        this.targetType = "Revenant"
        this.targetOffset = 1.5
        this.targetClass = net.minecraft.entity.monster.EntityZombie.class
        this.bossName = /(Revenant|Atoned) Horror/

        register("attackEntity", () => {
            if (this.state !== this.STATES.HITTING) return

            Client.scheduleTask(1, () => {
                if (this.targetEntity.getEntity().func_110143_aJ() < 1.1) this.state = this.STATES.SCANNING
                else this.targetTimer.reset()
            })
        })

        register("step", () => this.weapon = ModuleManager.getSetting(this.ModuleName, "Weapon") - 1).setDelay(1)

        register("tick", (ticks) => {
            if (!this.enabled) return

            if (this.targetEntity && ticks % 5 === 0) this.targetVector = new Vector(this.targetEntity.getEntity()).add(0, this.targetOffset, 0)

            switch (this.state) {
                case this.STATES.SCANNING:
                    if (this.targetBlacklist.length > 3) this.targetBlacklist.shift()

                    this.targetEntity = this.getNextMob()
                    if (!this.targetEntity) return
                    else this.state = this.STATES.WALKING

                    // TODO add randomization
                    this.targetVector = new Vector(this.targetEntity).add(0, this.targetOffset, 0)
                    break
                case this.STATES.WALKING:
                    if (Client.isInGui() && !Client.isInChat()) {
                        MovementHelper.stopMovement()
                        Rotations.stopRotate()
                        return
                    }

                    // Stop pathfind if target is dead
                    if (this.targetEntity.getEntity().func_110143_aJ() < 1.1 || this.targetEntity.getEntity().field_70128_L) return this.state = this.STATES.SCANNING

                    // Skip pathfind if target is near
                    if (MathUtils.getDistanceToPlayer(this.targetEntity).distance + 0.5657 <= 4) {
                        this.state = this.STATES.HITTING
                        this.targetTimer.reset()
                        return
                    }

                    // Pathfind to target
                    if (this.targetTimer.hasReached(250)) {
                        // Scan for easier target while walking
                        if (PathHelper.pathfinding && this.switchTimer.hasReached(1000)) {
                            const newTarget = this.getClosestVisible()
                            if (!newTarget || MathUtils.getDistance(this.targetEntity, newTarget).distance < 1.5) return this.targetTimer.reset() // Skip re-path if the target hasn't moved significantly

                            if (this.targetEntity.getEntity().func_145782_y() !== newTarget.getEntity().func_145782_y()) this.targetBlacklist.push(this.targetEntity.getEntity().func_145782_y())
                            this.targetEntity = newTarget
                            this.targetTimer.reset()
                            return this.switchTimer.reset()
                        }

                        const pos = Utils.getEntityPathfindLocation(this.targetEntity.getEntity())?.getBlockPos()
                        if (pos && Utils.getPlayerNode()) PathHelper.goto(pos, this.targetVector)
                        this.targetTimer.reset()

                        Client.scheduleTask(4, () => {
                            if (PathHelper.pathfinding) return

                            this.targetBlacklist.push(this.targetEntity.getEntity().func_145782_y())
                            this.state = this.STATES.SCANNING
                        })
                    }
                    break
                case this.STATES.HITTING:
                    // If far switch back to walking
                    if (MathUtils.getDistanceToPlayer(this.targetEntity).distance > 4.5657)
                        return this.state = this.STATES.WALKING

                    MovementHelper.setKey("sprint", false)
                    MovementHelper.setKey("a", false)
                    MovementHelper.setKey("d", false)

                    // Timeout or dead
                    if (Player.asPlayerMP().canSeeEntity(this.targetEntity)) this.lastSeenTimer.reset()
                    if (this.targetTimer.hasReached(2500) || this.lastSeenTimer.hasReached(500) || (this.targetEntity && this.targetEntity.getEntity().func_110143_aJ() < 1.1)) {
                        MovementHelper.setKey("s", false)

                        this.targetBlacklist.push(this.targetEntity.getEntity().func_145782_y())
                        return this.state = this.STATES.SCANNING
                    }

                    if (Client.isInGui() && !Client.isInChat()) {
                        MovementHelper.stopMovement()
                        Rotations.stopRotate()
                        return
                    }

                    // TODO go to death location when boss dies to get loot


                    if (this.attackTimer.hasReached(this.attackDelay)) {
                        this.attackTimer.reset()
                        this.attackDelay = Utils.getRandomInRange(80, 120)

                        if (MathUtils.getDistanceToPlayer(this.targetVector).distanceFlat > 3.0657) MovementHelper.setKey("w", true)
                        else if (MathUtils.getDistanceToPlayer(this.targetVector).distanceFlat < 1.5657) MovementHelper.setKey("s", true)
                        else {
                            MovementHelper.setKey("w", false)
                            MovementHelper.setKey("s", false)
                        }

                        if (Player.getHeldItemIndex() === this.weapon) ItemUtils.leftClick()
                        else Player.setHeldItemIndex(this.weapon)
                    }

                    if (!Rotations.rotate) Rotations.rotateTo(this.targetVector, 5)
                    else Rotations.updateTargetTo(this.targetVector, 5)

                    break
                case this.STATES.WARPING:
                    // TODO rewarp
                    break
            }
        })
    }

    toggle() {
        this.enabled = !this.enabled
        this.sendMacroMessage(this.enabled ? "&aEnabled": "&cDisabled")

        if (this.enabled) {
            this.batphone = Utils.findItem("Maddox Batphone")
            if (!this.batphone) return this.stopMacro(true, "Please get a maddox batphone first!")

            this.targetType = ModuleManager.getSetting(this.ModuleName, "Target Type")
            switch (this.targetType) {
                case "Revenant":
                    this.bossName = /(Revenant|Atoned) Horror/
                    this.targetClass = Java.type("net.minecraft.entity.monster.EntityZombie").class
                    this.targetOffset = 1.5
                    break
                case "Tarantula":
                    this.bossName = /Tarantula Broodfather/
                    this.targetClass = Java.type("net.minecraft.entity.monster.EntitySpider").class
                    this.targetOffset = 0.2
                    break
                case "Sven":
                    this.bossName = /Sven Packmaster/
                    this.targetClass = Java.type("net.minecraft.entity.passive.EntityWolf").class
                    this.targetOffset = 0.2
                    break
                case "Ice Walker":
                    this.bossName = null
                    this.targetClass = Java.type("net.minecraft.client.entity.EntityOtherPlayerMP").class
                    this.targetOffset = 1.5
                    break
            }

            MouseUtils.unGrabMouse()
            // TODO failsafes

            if (this.targetType === "Revenant" && Skyblock.subArea !== "Coal Mine") ChatLib.command("warp crypt")
            Client.scheduleTask(20, () => this.state = this.STATES.SCANNING)
        } else this.stopMacro()
    }

    sendMacroMessage(message) {
        ChatUtils.sendModMessage(this.ModuleName + ": " + message)
    }

    getNextMob() {
        // TODO miniboss prio
        let target = this.getClosestVisible()
        let highScore = null
        if (!target) this.getTargetMobs().forEach((mob) => {
            const score = this.getMobScore(mob)

            if (!target || score > highScore) {
                target = mob
                highScore = score
            }
        })

        return target
    }

    getClosestVisible() {
        if (this.bossName && this.isBossSpawned()) return this.getSlayerBoss()

        let target = null
        let lowestDist = null
        this.getTargetMobs().forEach((mob) => {
            const dist = MathUtils.getDistanceToPlayer(mob).distance + 0.5657

            if (Player.asPlayerMP().canSeeEntity(mob) && !this.targetBlacklist.includes(mob.getEntity().func_145782_y()) && (!target || lowestDist > dist)) {
                target = mob
                lowestDist = dist
            }
        })

        return target
    }

    getMobScore(e) {
        let score = 0
        if (this.targetBlacklist.includes(e.getEntity().func_145782_y())) return -Infinity

        const distance = MathUtils.getDistanceToPlayer(e).distance + 0.5657
        if (distance < 5) score += 50
        else if (distance < 10) score += 25
        else if (distance < 15) score += 10
        else score += (25 * 1.2^(-distance + 15) + 10)

        if (Player.asPlayerMP().canSeeEntity(e)) score *= 2

        return score
    }

    getTargetMobs() {
        return World.getAllEntitiesOfType(this.targetClass).filter(e =>
            e.canBeCollidedWith() &&
            e.getEntity().func_110143_aJ() > 1.1 &&
            !e.isInvisible() &&
            (e.getY() < 61 || this.targetType !== "Revenant") && // Crypt Only
            ((e.getX() > -40 && e.getX() < 45) || this.targetType !== "Ice Walker") // Walker Only TODO improve
        )
    }

    getSlayerBoss() {
        const stand = World.getAllEntitiesOfType(net.minecraft.entity.item.EntityArmorStand).find(s => this.bossName?.test(s.getName().removeFormatting()))
        if (!stand) return null

        const bossPlayer = World.getAllEntitiesOfType(net.minecraft.entity.item.EntityArmorStand).find(s => s.getName().removeFormatting().includes(Player.getName()) && MathUtils.getDistance(stand, s).distance < 0.5)
        if (!bossPlayer) return null

        return World.getAllEntitiesOfType(this.targetClass).find(e => !e.isInvisible() && e.getEntity().func_110143_aJ() > 1.1 && MathUtils.getDistance(e, bossPlayer).distance < 2.5)
    }

    isBossSpawned() {
        return Scoreboard.getLines().some(l => l.getName().removeFormatting().includes("Slay the boss!"))
    }

    stopMacro(message=null) {
        this.enabled = false

        MouseUtils.reGrabMouse()
        MovementHelper.stopMovement()
        Rotations.stopRotate()
        if (PathHelper.pathfinding) PathHelper.end(false)

        if (message) this.sendMacroMessage(message)
        else this.sendMacroMessage("&cDisabled")
    }
}

new CombatMacro()