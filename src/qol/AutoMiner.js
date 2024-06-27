import Skyblock from "BloomCore/Skyblock";
let { SettingSelector, SettingSlider, SettingToggle, ConfigModuleClass, ModuleToggle, getKeyBind, ModuleManager } = global.settingSelection
let { MathUtils, ChatUtils, ItemUtils, MovementHelper } = global.export 
let { Utils, ArrayLists, BlockStainedGlass, BlockStainedGlassPane, MiningUtils, Vec3, RenderUtils, C07PacketPlayerDigging } = global.export
let { TimeHelper, registerEventSB, mc, Rotations, RaytraceUtils, MouseUtils, KeyBinding, Vector, PolarPathFinder, S2FPacketSetSlot, S30PacketWindowItems } = global.export

global.modules.push(
    new ConfigModuleClass(
        "Auto Miner",
        "Mining",
        [
            // TODO make into multi select
            new SettingSelector("Mining Target", 0, [
                "Mithril",
                "Gold Block",
                "Both"
            ]),
            new SettingSelector("Prismarine Only", false)
        ],
        [
            "Mines blocks for you"
        ]
    )
)

class AutoMinerClass {
    constructor() {
        this.ModuleName = "Auto Miner"
        this.Enabled = false
        this.Blocks = []
        this.ValidBlocks = new ArrayLists
        this.ValidColors = new ArrayLists
        this.BadColors = new ArrayLists

        // false = left, true = right
        this.previousDirection = false
        this.Drill = 0
        this.blueCheese = 0
        this.ENUMStates = {
            WAITING: 1,
            MINING: 2,
            SPEEDBOOST: 3,
            WAITINGSPEEDBOOST: 4
        }
        this.State = this.ENUMStates.WAITING
        this.clicked = false
        this.sides = [[0.5, 0.5, 0.5], [0.5, 0.05, 0.5 ], [0.5, 0.95, 0.5], [0.05, 0.5, 0.5], [0.95, 0.5, 0.5], [0.5, 0.5, 0.05], [0.5, 0.5, 0.95]]
        
        this.Actions = [] // Actions for when no blocks are left to mine
        this.ActionsScan = [] // Actions for when the autominer is done with loading the blocks
        this.miningIds = Utils.makeJavaArray([160, 95, 168, 159, 35])

        getKeyBind("Auto Miner", "Polar Client - Mining", this)

        this.names = ["Goblin","Sentry"]

        // Settings
        this.miningSpeed = 0

        // Variables
        this.current = {polarBlock: null};
        this.previous = null;
        this.whitelist = new ArrayLists;
        this.permBlackList = new ArrayLists;
        this.ticks = 0;
        this.ticksPassed = 0;
        this.moveTimer = new TimeHelper();
        this.clickedTime = new TimeHelper();
        this.mineTimer = new TimeHelper();
        this.totalStuck = 0;
        this.titanium = false;
        this.noBlocks = false;
        this.startedMining = false;
        this.canStartMining = false;
        this.dwarvenMines = false;
        this.gemstoneMacro = false;
        this.gemstoneBlocks = [];
        this.glaciteBlocks = [];
        this.specialCommission = false;
        this.targets;
        this.currentTarget = null;
        this.previousTimer = 0;
        this.canActivateSpeedboost = true;
        this.lookedAtWrongId = false;
        this.presetTicks = false;
        this.ticksWithoutMSB = 10;
        this.ticksWithMSB = 4;

        this.amountBlocks = 0
        this.newAmountBlocks = 0
        this.centerPos = null
        this.platform = false
        this.reachedTarget = 0;
        this.speedBoostTime = 300;
        this.lookAtParticle = false;

        this.stoppedMovement = false
        register("tick", () => {
            if(this.Enabled) {
                if(this.State === this.ENUMStates.MINING) {
                    this.timer++
                    let target = Player.lookingAt()
                    if(Client.currentGui.getClassName() != "null" || target instanceof Entity) {
                        try {
                            //haha easy fix
                            if(target.getClassName() === "EntityOtherPlayerMP") {
                                let found = false
                                if(target instanceof Entity) {
                                    this.names.forEach((name) => {
                                        if(target.getName().includes(name)) found = true
                                    })
                                }
                                if(!found) {
                                    this.current = {polarBlock: null};
                                    MovementHelper.setKey("leftclick", false);
                                    Rotations.stopRotate();
                                    MovementHelper.stopMovement();
                                    return;
                                }
                            }
                        } catch (e) {};
                    }
                    if(!this.clicked && this.canActivateSpeedboost && this.State === this.ENUMStates.MINING) {
                        this.clicked = true;
                        this.clickedTime.reset();
                        this.State = this.ENUMStates.SPEEDBOOST;
                        this.current = {polarBlock: null};
                        MovementHelper.stopMovement();
                        MovementHelper.setKey("leftclick", false);
                        return;
                    }
                    if(this.current.polarBlock) {
                        let block = Player.lookingAt();
                        if(block instanceof Block) {
                            if(block.pos.equals(this.current.polarBlock.pos) && !Client.getMinecraft().field_71442_b.func_181040_m()) {
                                ItemUtils.leftClick();
                            }
                            if(block.pos.equals(this.current.polarBlock.pos)) {
                                this.mineTimer.reset();
                            }
                        }
                        let Vec3Block = new Vec3(this.current.polarBlock.point[0], this.current.polarBlock.point[1], this.current.polarBlock.point[2]);
                        let rangeBlock = MathUtils.getDistanceToPlayer(this.current.polarBlock.point);
                        if(this.moveTimer.hasReached(100)) {
                            if(this.dwarvenMines) {
                                if(Vec3Block.func_72438_d(Player.getPlayer().func_174824_e(1)) < mc.field_71442_b.func_78757_d() && !this.stoppedMovement) {
                                    MovementHelper.stopMovement()
                                } else if(rangeBlock.distanceFlat < 2.0) {
                                    MovementHelper.setKey("s", true)
                                    this.stoppedMovement = false
                                } else {
                                    MovementHelper.setKeysBasedOnYawTemp(MathUtils.calculateAngles(this.current.polarBlock.pos).yaw, false)
                                    this.stoppedMovement = false
                                }
                            } else if(this.gemstoneMacro) {
                                MovementHelper.setKey("shift", true)
                                if(Vec3Block.func_72438_d(Player.getPlayer().func_174824_e(1)) < mc.field_71442_b.func_78757_d()) {
                                    if(!this.stoppedMovement) {
                                        MovementHelper.stopMovement()
                                        this.stoppedMovement = true
                                    }
                                } else if(rangeBlock.distanceFlat < 0.6) {
                                    MovementHelper.setKey("s", true)
                                    this.stoppedMovement = false
                                } else {
                                    MovementHelper.setKeysBasedOnYawTemp(MathUtils.calculateAngles(this.current.polarBlock.pos).yaw, false)
                                    this.stoppedMovement = false
                                }
                            } else if(this.glaciteTunnels) {
                                MovementHelper.setKey("shift", true);
                                if(!this.specialCommission) {
                                    let yaw = MathUtils.calculateAngles(this.current.polarBlock.center).yaw;
                                    if(Vec3Block.func_72438_d(Player.getPlayer().func_174824_e(1)) < 4.5) {
                                        MovementHelper.stopMovement();
                                        if(MathUtils.getDistanceToPlayerEyes(Vec3Block).distance <= 1.5) {
                                            MovementHelper.setKey("s", true);
                                        }
                                        this.reachedTarget = true;
                                    } else if(!this.reachedTarget) {
                                        MovementHelper.setKeysForStraightLine(yaw, false);
                                    } else {
                                        MovementHelper.setKeysForStraightLine(MathUtils.calculateAngles(Vec3Block).yaw)
                                    }
                                } else {
                                    if(!this.currentTarget) {
                                        let lowest = null;
                                        let cost;
                                        this.targets.forEach((pos) => {
                                            let distance = MathUtils.getDistance(pos, this.current.polarBlock.point).distance;
                                            if(!lowest || distance < cost) {
                                                lowest = pos;
                                                cost = distance;
                                            }
                                        })
                                        this.currentTarget = new Vector(lowest).add(0.5, 0.0, 0.5);
                                    }
                                    if((this.currentTarget && Utils.isLookingAtPos(this.current.polarBlock.pos)) || MathUtils.getDistanceToPlayerEyes(this.current.polarBlock.point).distance < 4.0) {
                                        MovementHelper.stopMovement();
                                        this.currentTarget = null;
                                    } else if(this.currentTarget && !this.reachedTarget <= 2.0) {
                                        MovementHelper.setKeysForStraightLine(MathUtils.calculateAngles(this.currentTarget).yaw, false);
                                        this.reachedTarget++;
                                    } else {
                                        MovementHelper.setKeysForStraightLine(MathUtils.calculateAngles(Vec3Block).yaw, false);
                                    }
                                }
                            }
                            this.moveTimer.reset();
                        }

                        if(this.mineTimer.hasReached(1000)) {
                            this.ticksPassed = Infinity;
                            this.totalStuck++;
                        }

                        this.ticksPassed += 1
                        if(this.lookAtParticle) {
                            if(!Rotations.rotate) Rotations.rotateTo(this.current.polarBlock.particle);
                            else Rotations.updateTargetTo(this.current.polarBlock.particle);
                        } else {
                            if(!Rotations.rotate) Rotations.rotateTo(this.current.polarBlock.point);
                            else Rotations.updateTargetTo(this.current.polarBlock.point);
                        }
                        if(!RaytraceUtils.canSeePointMC(this.current.polarBlock.pos, this.current.polarBlock.point) || (this.ticksPassed >= this.ticks && this.timer != this.previousTimer && this.current.size != 1.0) || World.getBlockAt(this.current.polarBlock.pos).type.getID() != this.current.polarBlock.blockId) {
                            this.previousTimer = this.timer
                            this.previous = this.current.polarBlock.pos
                            this.current.polarBlock = null
                        }
                    }
                    if(this.current.polarBlock === null) {
                        this.current = this.nextTarget();
                        // Does this action once when it finds out a new target block
                        if(this.current.polarBlock != null && (!this.glaciteTunnels || this.totalStuck < 2.0)) {
                            this.noBlocks = false
                            this.reachedTarget = 0;
                            this.lookAtParticle = false;
                            this.mineTimer.reset();
                            this.whitelist.add(this.current.polarBlock.pos)
                            if(this.whitelist.size() > 2) this.whitelist.remove(0)
                            if(!ModuleToggle.UseAutoMinerModule && !global.export.ItemFailsafe.triggered) Player.setHeldItemIndex(this.Drill.slot)
                            if(!this.presetTicks) this.ticks = MiningUtils.mineTime(this.miningSpeed, this.current.polarBlock.pos, this.SpeedBoost)
                            else if(this.SpeedBoost) this.ticks = this.ticksWithMSB;
                            else this.ticks = this.ticksWithoutMSB;
                            Rotations.rotateTo(this.current.polarBlock.point);
                            this.ticksPassed = -5;
                            mc.field_71415_G = true
                            MovementHelper.setKey("leftclick", true);
                        } else {
                            MovementHelper.setKey("leftclick", false);
                            this.noBlocks = true
                            // no blocks are left so it notifies
                            this.trigger()
                            return
                        }
                    }
                }
                if(this.State === this.ENUMStates.SPEEDBOOST) {
                    MovementHelper.setKey("leftclick", false);
                    let count1 = 2;
                    let count2 = count1 + 2 + Math.round(Math.random()*2);
                    let count3 = count2 + 2 + Math.round(Math.random()*2);
                    if(this.blueCheese.slot != this.Drill.slot) {
                        Client.scheduleTask(count1, () => {Player.setHeldItemIndex(this.blueCheese.slot)});
                        ItemUtils.rightClick(count2);
                        Client.scheduleTask(count3, () => {Player.setHeldItemIndex(this.Drill.slot)});
                    } else {
                        ItemUtils.rightClick(count1);
                    }
                    this.State = this.ENUMStates.WAITINGSPEEDBOOST;
                }
            }
        })

        register("renderWorld", () => {
            if(this.Enabled && this.current.polarBlock) {
                let pos = this.current.polarBlock.pos
                RenderUtils.renderCube([pos.x, pos.y, pos.z], [0, 0, 1], true, 0.15, 1, 1)
            }
        })

        register("packetReceived", (Packet, Event) => {
            if(!this.Enabled) return;
            if(!this.current.polarBlock) return;
            try {
                const x = Packet.func_149220_d();
                const y = Packet.func_149226_e();
                const z = Packet.func_149225_f();
                const type = Packet.func_179749_a().toString();
                const center = this.current.polarBlock.center;
                const vecEyes = Player.asPlayerMP().getEyePosition(1);
                const vecParticle = new Vector(x + (x - vecEyes.field_72450_a), y + (y - vecEyes.field_72448_b), z + (z - vecEyes.field_72449_c)).toMC();
                const castResult = World.getWorld().func_72933_a(vecEyes, vecParticle);
                if(!castResult) return;
                if(type === "CRIT" && MathUtils.getDistanceToPlayerEyes(Utils.convertToVector(castResult.field_72307_f)).distance < 4.5 && Math.abs(x - center.x) < 0.7 && Math.abs(y - center.y) < 0.7 && Math.abs(z - center.z) < 0.7 && castResult.func_178782_a().equals(this.current?.polarBlock?.pos?.toMCBlock())) {
                    this.current.polarBlock.particle = [x, y, z];
                    this.lookAtParticle = true;
                }
            } catch (error) {
            }
        }).setFilteredClass(net.minecraft.network.play.server.S2APacketParticles);

        register("packetReceived", (Packet, Event) => {
            if(!this.Enabled) return
            
            if (Packet instanceof S2FPacketSetSlot) {
                if (!Packet.func_149174_e()) { return }
                if (!Packet.func_149174_e().toString().toLowerCase().includes("shard") && !Packet.func_149174_e().toString().toLowerCase().includes("pickaxe")) { return }
                cancel(Event)
            }
        
            if (Packet instanceof S30PacketWindowItems) {
                if (Packet.func_148911_c() != 0) { return }
                cancel(Event)
            }
        }).setFilteredClasses([S2FPacketSetSlot.class, S30PacketWindowItems.class])

        this.timer = 0
        this.cancelledBlocks = []
        register("packetSent", (Packet, Event) => {
            if(this.Enabled && this.current.polarBlock) {
                let action = Packet.func_180762_c().toString()
                let pos = Packet.func_179715_a()
                if(new Vec3i(pos.func_177958_n(), pos.func_177956_o(), pos.func_177952_p()).toString() === this.current.polarBlock?.pos?.toString() && action === "START_DESTROY_BLOCK") {
                    this.timer = 0
                    this.ticksPassed = 0
                }
            }
            let pos = new BlockPos(Packet.func_179715_a())
            let posString = pos.toString()
            let index = this.cancelledBlocks.indexOf(posString)
            if(this.Enabled && this.gemstoneMacro && (World.getBlockAt(pos).type.getID() === 4 || index != -1)) {
                Event.setCanceled(true)
                if(index === -1) this.cancelledBlocks.push(posString)
                else this.cancelledBlocks.shift()
            }
        }).setFilteredClasses([C07PacketPlayerDigging])

        // Track mining speed boost

        this.SpeedBoost = false
        register("worldUnload", () => {
            this.SpeedBoost = false
        })

        registerEventSB("onspeedboost", () => {
            this.SpeedBoost = true
            if(this.Enabled && this.State === this.ENUMStates.WAITINGSPEEDBOOST) {
                this.State = this.ENUMStates.MINING;
            }
        })

        registerEventSB("speedboostcooldown", () => {
            if(this.Enabled && this.State === this.ENUMStates.WAITINGSPEEDBOOST) {
                this.State = this.ENUMStates.MINING;
            }
        })

        registerEventSB("speedboostgone", () => {
            this.SpeedBoost = false
        })

        registerEventSB("speedboostready", () => {
            if(this.clickedTime.hasReached(2000)) this.clicked = false
        })
    }

    toggle() {
        this.Enabled = !this.Enabled
        if(!ModuleToggle.UseAutoMinerModule) ChatUtils.sendModMessage(this.ModuleName + ": " + (this.Enabled ? "&aEnabled": "&cDisabled"))
        if(this.Enabled) {
            this.current = {polarBlock: null}
            this.amountBlocks = undefined
            if(!ModuleToggle.UseAutoMinerModule) {
                MouseUtils.unGrabMouse()
                this.State = this.ENUMStates.WAITING
                let drills = MiningUtils.getDrills()
                this.Drill = drills.drill
                this.blueCheese = drills.blueCheese
                if(!this.Drill) {
                    this.Enabled = false
                    MouseUtils.reGrabMouse()
                    return
                }
                if(!this.blueCheese) {
                    this.blueCheese = this.Drill
                }
                // selects the type and colors
                this.blueCheese = this.Drill
                this.resetBlocks()
                if(ModuleManager.getSetting(this.ModuleName, "Mining Target") === "Mithril") {
                    if(ModuleManager.getSetting(this.ModuleName, "Prismarine Only")) this.selectBlocks([MiningUtils.IDBlocks.prismarine, MiningUtils.IDBlocks.stone])
                    else this.selectBlocks([MiningUtils.IDBlocks.prismarine, MiningUtils.IDBlocks.stone, MiningUtils.IDBlocks.wool, MiningUtils.IDBlocks.hardened_clay])
                }
                if(ModuleManager.getSetting(this.ModuleName, "Mining Target") === "Gold Block") this.selectBlocks([MiningUtils.IDBlocks.gold_block])
                if(ModuleManager.getSetting(this.ModuleName, "Mining Target") === "Both") this.selectBlocks([MiningUtils.IDBlocks.stained_glass, MiningUtils.IDBlocks.stained_glass_pane, MiningUtils.IDBlocks.prismarine, MiningUtils.IDBlocks.stone, MiningUtils.IDBlocks.wool, MiningUtils.IDBlocks.hardened_clay, MiningUtils.IDBlocks.gold_block])
                this.resetColors()
                this.selectColors(["yellow","red","lime","purple","orange","magenta","lightBlue"])

                new Thread(() => {
                    this.miningSpeed = MiningUtils.getMiningSpeed(this.Drill.slot, this.SpeedBoost)
                    if(this.miningSpeed === -1) {
                        this.Enabled = false
                        MouseUtils.reGrabMouse()
                        return
                    }
                    this.State = this.ENUMStates.MINING
                    this.noBlocks = false
                    this.stoppedMovement = false
                    this.clicked = false
                    this.clickedTime.reset()

                    // Failsafes
                    global.export.FailsafeManager.register((cb) => {
                        if (this.Enabled) this.toggle()
                        cb()
                    }, () => {
                        if (!this.Enabled) this.toggle()
                    })
                }).start()
            } else {
                this.State = this.ENUMStates.WAITING
                this.noBlocks = false
                this.reachedTarget = false;
                this.totalStuck = 0;
                if(this.gemstoneMacro) this.gemstoneBlocks = this.getGemstoneVein(this.centerPos, this.platform)
                Client.scheduleTask(1, () => {
                    this.State = this.ENUMStates.MINING
                    this.clickedTime.reset()
                })
            }
        }
        
        if(!this.Enabled) {
            global.export.FailsafeManager.unregister()
            if(!ModuleToggle.UseAutoMinerModule) {
                MouseUtils.reGrabMouse()
            }
            KeyBinding.func_74510_a(mc.field_71474_y.field_74312_F.func_151463_i(), false);
            this.State = this.ENUMStates.WAITING;
            this.presetTicks = false;
            this.dwarvenMines = false;
            Rotations.stopRotate();
            MovementHelper.stopMovement();
            MovementHelper.setKey("shift", false);
        }
    }

    /**
     * never to be looked at again
     */
    nextTarget() {
        let playerpos = [Math.floor(Player.getX()), Player.getY(), Math.floor(Player.getZ())]
        let blocks = []
        let totalBlocks = 0
        let totalExist = 0
        if(this.gemstoneMacro || this.glaciteTunnels) {
            (this.glaciteTunnels ? this.glaciteBlocks : this.gemstoneBlocks).forEach((pos) => {
                let block = World.getBlockAt(pos)
                let result = this.checkMineBlock(block, pos, true)
                if(result.exists) totalExist++
                if(result.isVisable) {
                    totalBlocks++
                    blocks.push(new PolarBlock(block, result.point, pos, block.type.getID()))
                }
            })
            if(this.glaciteTunnels) blocks = blocks.filter((block) => Player.getY() + 1.54 - block.pos.y > -4.0);
        } else {
            for(let x = -6; x <= 6; x++) {
                for(let z = -6; z <= 6; z++) {
                    for(let y = -6; y <= 6; y++) {
                        if(x === 0.0 && z === 0.0 && y < 0.0) continue
                        let pos = new BlockPos(playerpos[0] + x, playerpos[1] + y, playerpos[2] + z)
                        let block = World.getBlockAt(pos)
                        let result = this.checkMineBlock(block, pos)
                        if(result.exists) totalExist++
                        if(result.isVisable) {
                            totalBlocks++
                            blocks.push(new PolarBlock(block, result.point, pos, block.type.getID()))
                        }
                    }
                }
            }
        }

        let distanceClosest = 0
        let closest = null
        blocks.forEach((block) => {
            let angle = MathUtils.angleToPlayer(block.point)
            let newDistanceAngle = (angle.pitchAbs*0.3 + angle.yawAbs)
            let newDistanceWorld = (MathUtils.getDistanceToPlayer(block.point).distance * 13.0)
            let newDistance = newDistanceAngle + newDistanceWorld
            let blockCheck = World.getBlockAt(block.pos)
            if(blockCheck.getMetadata() === 4.0 && blockCheck.type.getID() === 1.0 && this.titanium && newDistanceAngle < 90) {
                distanceClosest = 0
                closest = block
            }
            if((angle.pitchAbs + angle.yawAbs) > 115 && ((!this.gemstoneMacro && blocks.length <= 2.0) || (this.gemstoneMacro && totalExist <= 2.0))) return
            if(!closest || newDistance < distanceClosest) {
                distanceClosest = newDistance
                closest = block
            }
        })
        return { polarBlock: closest, size: totalExist };
    }

    checkMineBlock(block, pos, gemstone=false) {
        let found = false
        let lookPoint = null
        let exists = false
        if(((gemstone && this.existsBlock(block)) || (!gemstone && this.isGoodBlock(block))) && !this.whitelist.contains(pos)) {
            exists = true
            this.getLittlePointsOnBlock(pos).forEach((point) => {
                if(!found) {
                    let vec3Point = new Vec3(point[0], point[1], point[2])
                    let rayTraceResult = World.getWorld().func_147447_a(Player.getPlayer().func_174824_e(1), vec3Point, false, false, true)
                    if(rayTraceResult && rayTraceResult.func_178782_a().equals(pos.toMCBlock()) && (vec3Point.func_72438_d(Player.getPlayer().func_174824_e(1)) < mc.field_71442_b.func_78757_d() || gemstone)) {
                        found = true
                        lookPoint = point
                    }
                }
            })
        }
        return { isVisable: found, point: lookPoint, exists: exists } 
    }

    /**
     * @param {Block[]} blocks 
     * @param {Block} block
     * filters the blocks based on their skin color and their block type (it is racist)
     */
    isGoodBlock(block) {
        let IBlock = block.type.mcBlock
        if(this.ValidBlocks.contains(block.type.getID())) {
            // for titanium
            if(block.type.getID() === 1 && block.getMetadata() != 4) {
                return false
            }
            if(IBlock === MiningUtils.MCBlocks.stained_glass) {
                if(this.ValidColors.size() > 0 && !this.ValidColors.contains(block?.getState()?.func_177229_b(BlockStainedGlass.field_176547_a)?.toString())) {
                    return false
                }
            }
            if(IBlock === MiningUtils.MCBlocks.stained_glass_pane) {
                if(this.ValidColors.size() > 0 && !this.ValidColors.contains(block?.getState()?.func_177229_b(BlockStainedGlassPane.field_176245_a)?.toString())) {
                    return false
                }
            }
            return true
        }
        return false
    }

    isBadBlock(block) {
        let IBlock = block.type.mcBlock
        if(IBlock === MiningUtils.MCBlocks.stained_glass) {
            if(this.BadColors.size() > 0 && this.BadColors.contains(block?.getState()?.func_177229_b(BlockStainedGlass.field_176547_a)?.toString())) {
                return true
            }
        }
        if(IBlock === MiningUtils.MCBlocks.stained_glass_pane) {
            if(this.BadColors.size() > 0 && this.BadColors.contains(block?.getState()?.func_177229_b(BlockStainedGlassPane.field_176245_a)?.toString())) {
                return true
            }
        }
        return false
    }

    existsBlock(block) {
        let blockId = block.type.getID()
        return (blockId != 0.0 && blockId != 7.0)
    }

    emptyVein() {
        return this.noBlocks
    }

    getLittlePointsOnBlock(pos) {
        let returnArray = []
        this.sides.forEach(side => {
            x = side[0]
            y = side[1]
            z = side[2]
            returnArray.push([pos.x + x, pos.y + y, pos.z + z])
        })
        return returnArray
    }

    /**
     * 
     * @param {BlockPos} centerPos 
     * @param {boolean} [platform=false]
     * @returns {BlockPos[]}
     */
    getGemstoneVein(centerPos, platform=false) {
        let Veins = []
        let closestSet = new Map()
        let platformPositions = []
        if(platform) {
            for(let x = -1; x <= 2; x++) {
                for(let z = -1; z <= 2; z++) {
                    platformPositions.push(new Vec3i(centerPos.x + x, centerPos.y + 2.54, centerPos.z + z))
                }
            }
        } else {
            for(let x = 0; x <= 1; x++) {
                for(let z = 0; z <= 1; z++) {
                    platformPositions.push(new Vec3i(centerPos.x + x, centerPos.y + 2.54, centerPos.z + z))
                }
            }
        }
        let scanned = new Map()
        for(let y = -3; y <= 7; y++) {
            for(let x = -5; x <= 5; x++) {
                for(let z = -5; z <= 5; z++) {
                    let pos = centerPos.add(new Vec3i(x,y,z))
                    let blockId = World.getBlockAt(pos).type.getID()
                    if(blockId === 160.0 || blockId === 95.0) {
                        let openSet = new Map()
                        let vein = []
                        this.getGemstonesAround(pos, platformPositions).forEach((pos) => {
                            openSet.set(this.getHash(pos), pos)
                        })
                        while(openSet.size != 0.0) {
                            openSet.forEach((pos) => {
                                let hash = this.getHash(pos)
                                openSet.delete(hash)
                                closestSet.set(hash, true)
                                if(!scanned.has(hash)) {
                                    scanned.set(hash, true)
                                    vein.push(pos)
                                    this.getGemstonesAround(pos, platformPositions).forEach((veinPos) => {
                                        let veinHash = this.getHash(veinPos)
                                        if(!closestSet.has(veinHash)) {
                                            openSet.set(veinHash, veinPos)
                                        }
                                    })
                                }
                            })
                        }
                        Veins.push(vein)
                    }
                }
            }
        }
        if(Veins.length > 0) {
            let secondHighest = 0
            let secondVein = null
            let highest = 0
            let highestVein = null
            Veins.forEach((vein) => {
                let goodVeins = vein.length - 1
                vein.forEach((cord) => {
                    if(this.isGoodBlock(World.getBlockAt(cord))) goodVeins++
                })
                if(!highestVein || goodVeins > highest) {
                    if(highestVein && highest > secondHighest && highest >= 6) {
                        secondHighest = highest
                        secondVein = highestVein
                    }
                    highest = goodVeins
                    highestVein = vein
                } else if((!secondVein || goodVeins > secondHighest) && goodVeins >= 6) {
                    secondHighest = goodVeins
                    secondVein = vein
                }
            })
            if(secondVein) {
                secondVein.forEach((pos) => {
                    highestVein.push(pos)
                })
            }

            return highestVein
        }
        return []
    }

    /**
     * @param {BlockPos} gemstonePos
     * @param {BlockPos} centerPos 
     * @param {Boolean} [platform=false]
     */
    getGemstonesAround(gemstonePos, centerCords) {
        let veinPositions = []
        let centerPlatform = centerCords[0]
        for(let y = -1; y <= 1; y++) {
            for(let x = -1; x <= 1; x++) {
                for(let z = -1; z <= 1; z++) {
                    if(x === 0 && y === 0 && z === 0) continue
                    let pos = gemstonePos.add(new Vec3i(x,y,z))
                    let blockId = World.getBlockAt(pos).type.getID()
                    if(blockId != 160.0 && blockId != 95.0) continue
                    if(this.isBadBlock(World.getBlockAt(pos))) continue
                    let posCenter = [pos.x + 0.5, pos.y + 0.5, pos.z + 0.5]
                    if(y === 1.0) posCenter[1] -= 0.5
                    for(let i = 0; i < centerCords.length; i++) {
                        let calc = MathUtils.getDistance(centerCords[i], posCenter)
                        if(calc.distance < 4.5 && (calc.differenceY <= 3 || MathUtils.getDistance(centerPlatform, posCenter).distanceFlat > 2.0)) {
                            veinPositions.push(pos)
                            break
                        }
                    }
                }
            }
        }
        return veinPositions
    }

    /**
     * @param {BlockPos} pos 
     */
    getHash(pos) {
        return pos.hashCode()
    }

    /**
     * resets and makes you select the values you want
     * @param {Array} IBlockStates
     */
    selectBlocks(IBlockStates) {
        for(let i = 0; i < IBlockStates.length; i++) {
            this.ValidBlocks.add(IBlockStates[i])
        }
    }
    resetBlocks() {
        this.ValidBlocks = new ArrayLists
    }

    /**
     * Selects valid gemstone colours
     * @param {Array} Colors 
     */
    selectColors(Colors) {
        for(let i = 0; i < Colors.length; i++) {
            this.ValidColors.add(Colors[i])
        }
    }

    resetColors() {
        this.ValidColors = new ArrayLists
    }

    selectBadColors(Colors) {
        for(let i = 0; i < Colors.length; i++) {
            this.BadColors.add(Colors[i])
        }
    }

    resetBadColors() {
        this.BadColors = new ArrayLists
    }

    // Runs when there are no blocks anymore to mine
    trigger() {
        let actions = this.Actions
        this.Actions = []
        for(let i = 0; i < actions.length; i++) {
            actions[i]()
        }
    }

    addTrigger(Callback) {
        this.Actions.push(Callback)
    }

    triggerScan() {
        for(let i = 0; i < this.ActionsScan.length; i++) {
            this.ActionsScan[i]()
        }
    }

    addTriggerScan(Callback) {
        this.ActionsScan.push(Callback)
    }

    setGemstoneMacro(boolean) {
        this.gemstoneMacro = boolean;
    }

    setGlaciteTunnels(boolean) {
        this.glaciteTunnels = boolean;
    }

    setDwarvenMines(boolean) {
        this.dwarvenMines = boolean;
    }

    /**
     * @param {BlockPos} pos 
     */
    setVeinPosition(pos) {
        this.veinPos = pos;
    }

    /**
     * @param {Array<BlockPos>} positions 
     */
    setGlaciteTunnelPositions(positions) {
        this.glaciteBlocks = positions;
    }

    /**
     * @param {Boolean} boolean 
     * @param {Array<BlockPos>} targets 
     */
    setSpecialCommission(boolean, targets) {
        this.specialCommission = boolean;
        this.targets = targets;
    }

    setPlatform(boolean) {
        this.platform = boolean
    }

    setCenterPosition(pos) {
        this.centerPos = pos
    }

    setTicks(enable, ticksWithoutMSB, ticksWithMSB) {
        this.presetTicks = enable;
        this.ticksWithoutMSB = ticksWithoutMSB;
        this.ticksWithMSB = ticksWithMSB;
    }
}

class PolarBlock {
    constructor(block, point, pos, blockId) {
        this.block = block;
        this.point = point;
        this.pos = pos;
        this.blockId = blockId;
        this.center = new Vector(pos).add(0.5, 0.5, 0.5);
        this.particle;
    }
}

global.export.AutoMiner = new AutoMinerClass()