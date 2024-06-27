/* @ Plus @ */
import Skyblock from "BloomCore/Skyblock";
let { SettingSelector, SettingSlider, SettingToggle, ConfigModuleClass, ModuleToggle, getKeyBind, ModuleManager } = global.settingSelection
let { ChatUtils, MiningUtils, NumberUtils, MouseUtils, Utils, ItemUtils, Routes, TimeHelper, Vector, Rotations, MiningBot, registerEventSB, MovementHelper, RaytraceUtils, MathUtils, PolarPathFinder, RenderUtils, overlayManager } = global.export

global.modules.push(
    new ConfigModuleClass(
        "Glacite Commission Macro",
        "Mining",
        [
            new SettingToggle("Shaft Alerts", false),
        ],
        [
            "Does commissions in the glacite tunnels"
        ]
    )
)

class GlaciteCommissionMacro {
    //0.5, 128.0, 200.5
    constructor() {
        this.ModuleName = "Glacite Commission Macro"
        this.Enabled = false

        this.startTime = Date.now()
        this.commissionCount = 0
        this.commissionCounter = new TimeHelper()

        this.OVERLAY_ID = "GLACITE_COMMISSION"
        overlayManager.AddOverlay(this.ModuleName, this.OVERLAY_ID)

        this.shaftAlerts = false
        register("step", () => {
            this.shaftAlerts = ModuleManager.getSetting(this.ModuleName, "Shaft Alerts")
            overlayManager.UpdateOverlayLine(this.OVERLAY_ID, "TIME", `Session Time: ${NumberUtils.timeSince(this.startTime)}`)
        }).setDelay(1)

        getKeyBind("Glacite Commission Macro", "Polar Client - Mining", this)

        this.MACROSTATES = {
            WAITING: 0,
            CLICKPIGEON: 1,
            FINDCOMMISSION: 2,
            SETUPROUTE: 3,
            TRAVELROUTE: 4,
            FINDVEIN: 5,
            TRAVELVEIN: 6,
            MINEVEIN: 7,
            WAITHUB: 8
        };

        this.MOVEMENTS = {
            WALK: 0,
            ETHERWARP: 1,
            AOTE: 2,
            NOTHING: 3
        };

        this.commissionNames = [
            "Onyx Gemstone Collector",
            "Aquamarine Gemstone Collector",
            "Citrine Gemstone Collector",
            "Peridot Gemstone Collector",
            "Tungsten Collector",
            "Umber Collector",
            "Glacite Collector"
        ]
        this.commissions = new Map();
        this.initCommissions();

        this.state = this.MACROSTATES.WAITING;
        this.movement = this.MOVEMENTS.NOTHING;

        this.drill = null;
        this.blueCheese = null;
        this.etherwarp = null;

        this.tickCounter = 0;
        this.timer = new TimeHelper();
        this.etherwarpTimer = new TimeHelper();
        this.commission = new GlaciteCommission("init", [], [])
        this.routeIndex = 0;
        this.currentWaypoint = new Waypoint(["init"], this.MOVEMENTS.NOTHING);
        this.waitOnTransmision = false;
        this.vein = new Vein(["init"], [], []);
        this.travelledVeins = new Set(); //
        this.minedVeins = new Set(); // only resets when going to camp or lobby switch
        this.targetBlockids = new Set([78, 80, 5])

        register("tick", () => {
            if(!this.Enabled) return;

            if(Client.currentGui?.getClassName() === "GuiInventory") {
                MovementHelper.stopMovement();
                MovementHelper.setKey("shift", false);
                Rotations.stopRotate();
                return;
            }

            switch(this.state) {
                case this.MACROSTATES.CLICKPIGEON:
                    MovementHelper.stopMovement();
                    if(this.tickCounter === 2) Player.setHeldItemIndex(this.pigeon.slot);
                    if(this.tickCounter === 4) {
                        ItemUtils.rightClickPacket();
                        return this.setState(this.MACROSTATES.FINDCOMMISSION);
                    }
                    this.tickCounter++

                    break
                case this.MACROSTATES.FINDCOMMISSION:
                    let container = Player.getContainer();
                    if(!this.commission && container && this.tickCounter >= 0) {
                        // make sure everything is loaded correctly
                        if(container.getName() != "Commissions") return;
                        let items = container.getItems();
                        for(let i = 0; i <= 35; i++) if(!items[i]) return;
                        // find the commission
                        let commission = null;
                        for(let i = 0; i < items.length; i++) {
                            let item = items[i];
                            if(!item) continue;
                            if(!item.getName().removeFormatting().startsWith("Commission")) continue;
                            if(Utils.includesLore(item.getLore(), "COMPLETED")) {
                                this.tickCounter = Math.floor(Math.random() * -15) - 5;
                                return container.click(i, false, "LEFT");
                            }
                        }
                        for(let i = 0; i < items.length; i++) {
                            let item = items[i];
                            if(!item) continue;
                            if(!item.getName().removeFormatting().startsWith("Commission")) continue;
                            item.getLore().forEach((text) => {
                                if(this.commissionNames.indexOf(text.removeFormatting()) != -1) {
                                    commission = text.removeFormatting();
                                }
                            })
                        }
                        if(!commission) return;
                        this.commission = this.commissions.get(commission);
                        this.tickCounter = Math.floor(Math.random() * -15) - 5;
                    }
                    if(this.commission && this.tickCounter === 0) {
                        Client.currentGui.close();
                        this.setState(this.MACROSTATES.SETUPROUTE);
                    }

                    this.tickCounter++

                    break
                case this.MACROSTATES.SETUPROUTE:
                    MovementHelper.stopMovement();
                    if(Skyblock.area != "Hub" && Player.getZ() > 217 && ["Tungsten Collector","Umber Collector","Glacite Collector"].toString().includes(this.commission.name)) {
                        return this.setState(this.MACROSTATES.FINDVEIN);
                    }
                    if(this.tickCounter === 5) {
                        ChatLib.say("/warp camp");
                        this.timer.reset();
                    }
                    if(MathUtils.getDistanceToPlayer([0,127,200]).distanceFlat <= 2.0 && this.timer.hasReached(1000)) {
                        return this.setState(this.MACROSTATES.TRAVELROUTE);
                    }

                    this.tickCounter++

                    break
                case this.MACROSTATES.TRAVELROUTE:
                    if(this.movement === this.MOVEMENTS.NOTHING) {
                        Rotations.stopRotate();
                        this.currentWaypoint = this.commission.path[this.routeIndex];
                        if(this.currentWaypoint === undefined) {
                            MovementHelper.stopMovement();
                            this.setState(this.MACROSTATES.FINDVEIN);
                            return;
                        }
                        this.movement = this.currentWaypoint.type;
                        this.routeIndex++
                        this.timer.reset();
                        this.tickCounter = 0;
                        this.etherwarpTimer.reset();
                        this.waitOnTransmision = false;
                    }
                    if(this.movement === this.MOVEMENTS.WALK) {
                        let vector = new Vector(this.currentWaypoint.point[0] + 0.5, Player.getY() + 1.35, this.currentWaypoint.point[2] + 0.5);
                        if(!Rotations.rotate) Rotations.rotateTo(vector, 1.0, true, Utils.getRandomPitch());
                        else Rotations.updateTargetTo(vector, 1.0, true, Utils.getRandomPitch());
                        let yaw = MathUtils.calculateAngles(vector).yaw;
                        MovementHelper.setKey("sprint", true);
                        MovementHelper.setKeysForStraightLine(yaw, false);
                        if(Math.abs(yaw) > 25) MovementHelper.stopMovement();
                        let range = MathUtils.getDistanceToPlayer(vector);
                        if(range.distance < 2.5 && range.distanceFlat < 1.5) {
                            this.movement = this.MOVEMENTS.NOTHING;
                        }
                    } else if(this.movement === this.MOVEMENTS.AOTE) {
                        let vector = new Vector(this.currentWaypoint.point).add(0.5, 0.5, 0.5)
                        if(!this.waitOnTransmision) {
                            this.waitOnTransmision = true;
                            MovementHelper.stopMovement();
                            Player.setHeldItemIndex(this.etherwarp.slot);
                            Rotations.rotateTo(vector);
                            Rotations.onEndRotation(() => {
                                if(this.movement === this.MOVEMENTS.AOTE) ItemUtils.rightClickPacket(1);
                            });
                        } else if(MathUtils.getDistanceToPlayer(vector).distance < 8.0) {
                            this.movement = this.MOVEMENTS.NOTHING;
                        }
                    } else if(this.movement === this.MOVEMENTS.ETHERWARP) {
                        let pos = this.currentWaypoint.getBlockPos();
                        if(this.tickCounter === 0) {
                            MovementHelper.stopMovement();
                            MovementHelper.setKey("shift", true);
                            Player.setHeldItemIndex(this.etherwarp.slot);
                            let point = RaytraceUtils.getPointOnBlock(pos);
                            if(point) {
                                Rotations.rotateTo(new Vector(point))
                                Rotations.onEndRotation(() => {
                                    ItemUtils.rightClickPacket(3);
                                });
                            }
                        } else if(MathUtils.getDistanceToPlayer(pos).distance < 3.0) {
                            MovementHelper.setKey("shift", false);
                            if(this.etherwarpTimer.hasReached(200)) this.movement = this.MOVEMENTS.NOTHING;
                        } else {
                            this.etherwarpTimer.reset()
                        }
                    }

                    if(this.timer.hasReached(5000)) {
                        MovementHelper.stopMovement();
                        MovementHelper.setKey("shift", false);
                        Rotations.stopRotate();
                        this.sendMacroMessage("Retrying!");
                        ChatLib.say("/warp hub");
                        return this.setState(this.MACROSTATES.WAITHUB);
                    }

                    this.tickCounter++

                    break
                case this.MACROSTATES.FINDVEIN:
                    let openSet = new Set(this.commission.locations);
                    while(openSet.size != 0.0) {
                        let closest = null;
                        let lowest;
                        openSet.forEach((point) => {
                            if(this.travelledVeins.has(point) || this.minedVeins.has(point)) return;
                            let range = MathUtils.getDistanceToPlayer(point);
                            let cost = range.distance + (Math.abs(range.differenceY) * 2);
                            if(!closest || cost < lowest) {
                                closest = point;
                                lowest = cost;
                            }
                        })
                        openSet.delete(closest);
                        this.travelledVeins.add(closest);
                        if(!closest) {
                            MovementHelper.stopMovement();
                            ChatLib.say("/warp hub");
                            this.setState(this.MACROSTATES.WAITHUB)
                            return this.sendMacroMessage("There are no veins left on the entire map!");
                        }
                        let vein = this.getVein(new BlockPos(closest[0], closest[1], closest[2]), this.commission.blockIds);
                        if(vein.length != 0.0) {
                            this.vein = new Vein(closest, vein, this.getWalkTargets(this.commission, vein, this.commission.blockIds), this.commission.blockIds);
                            this.vein.filterVeinOnTargets();
                            this.vein.filterVeinForMithril();
                            break;
                        }
                    }
                    if(!this.vein) return;
                    if(this.vein.targets.length === 0.0 || this.vein.positions.length === 0.0) return this.vein = null;
                    let closest = null;
                    let lowest;
                    this.vein.targets.forEach((pos) => {
                        let cost = MathUtils.getDistanceToPlayer(pos).distance;
                        if(!closest || cost < lowest) {
                            closest = pos;
                            lowest = cost;
                        }
                    })
                    this.vein.location = closest;
                    if(!PolarPathFinder.findPath(Utils.getPlayerNode().getBlockPos(), closest)) return;
                    this.setState(this.MACROSTATES.TRAVELVEIN);

                case this.MACROSTATES.TRAVELVEIN:
                    let range = MathUtils.getDistanceToPlayer(this.vein.location)
                    if(PolarPathFinder.currentNode && (range.distanceFlat > 2.0 || range.distance > 4.0)) {
                        let walkVector = new Vector(PolarPathFinder.currentNode.point);
                        MovementHelper.setKeysForStraightLine(MathUtils.calculateAngles(walkVector).yaw, true);
                        let lookVector = new Vector(PolarPathFinder.currentNode.lookPoint);
                        if(!Rotations.rotate) Rotations.rotateTo(lookVector, 1.0, true, Utils.getRandomPitch());
                        else Rotations.updateTargetTo(lookVector, 1.0, true, Utils.getRandomPitch());
                    } else {
                        MovementHelper.stopMovement();
                        Rotations.stopRotate();
                        PolarPathFinder.clearPath();
                        this.setState(this.MACROSTATES.MINEVEIN);
                    }
                    if(this.timer.hasReached(5000)) {
                        this.setState(this.MACROSTATES.FINDVEIN);
                        this.sendMacroMessage("Rescanned path!")
                    }

                    break
                case this.MACROSTATES.MINEVEIN:
                    if(!MiningBot.Enabled) {
                        let name = this.commission.name;
                        MiningBot.setGemstoneTypes(
                            false,
                            false,
                            false,
                            false,
                            false,
                            false,
                            false,
                            false,
                            name === "Onyx Gemstone Collector",
                            name === "Aquamarine Gemstone Collector",
                            name === "Citrine Gemstone Collector",
                            name === "Peridot Gemstone Collector",
                        );
                        MiningBot.setTunnelTypes(
                            name === "Glacite Collector",
                            name === "Tungsten Collector",
                            name === "Umber Collector"
                        );
                        MiningBot.toggle(
                            MiningBot.MACROTYPES.TUNNEL,
                            this.drill,
                            this.blueCheese,
                            this.vein.location,
                            1,
                            !["Tungsten Collector","Umber Collector","Glacite Collector"].toString().includes(this.commission.name)
                        );
                    }
                    if(MiningBot.Enabled && MiningBot.isEmpty()) {
                        MiningBot.stopBot();
                        this.minedVeins.add(this.vein.veinpos);
                        this.setState(this.MACROSTATES.FINDVEIN);
                    }

                    break;
                case this.MACROSTATES.WAITHUB:
                    if(MathUtils.getDistanceToPlayer([-3,69,-70]).distance < 3.0) {
                        if(this.tickCounter === 100) {
                            this.setState(this.MACROSTATES.SETUPROUTE);
                        }
                        return this.tickCounter++;
                    }
                    this.tickCounter = 0;

                    break;
            }
        })

        registerEventSB("death", () => {
            if(!this.Enabled) return;
            MiningBot.stopBot();
            MovementHelper.stopMovement();
            Rotations.stopRotate();
            this.setState(this.MACROSTATES.WAITING);
            Client.scheduleTask(40, () => {
                this.setState(this.MACROSTATES.CLICKPIGEON);
            })
        })

        register("chat", (Event) => {
            if(!this.Enabled) return;
            let chatmsg = ChatLib.getChatMessage(Event, false);
            if(this.commissionNames.some(name => chatmsg.startsWith(name.toUpperCase()))) {
                this.setState(this.MACROSTATES.CLICKPIGEON);

                this.commissionCount++
                overlayManager.UpdateOverlayLine(this.OVERLAY_ID, "COMMS_HOUR", "Commissions/Hour: " + Math.ceil(this.commissionCount / (this.commissionCounter.getTimePassed() / (1000 * 3600))))
                overlayManager.UpdateOverlayLine(this.OVERLAY_ID, "COMMS", "Session Commissions: " + this.commissionCount)
                overlayManager.UpdateOverlayLine(this.OVERLAY_ID, "COMMS_HOTM", "Session HOTM XP: " + (this.commissionCount * 750))
            }
        })

        register("chat", (Event) => {
            if(!this.Enabled) return;
            if(ChatLib.getChatMessage(Event, false).startsWith("BRRR! It's so cold that you can barely feel your fingers.")) {
                MiningBot.stopBot();
                MovementHelper.stopMovement();
                Rotations.stopRotate();
                this.setState(this.MACROSTATES.WAITHUB);
                Client.scheduleTask(5, () => {
                    ChatLib.say("/warp hub");
                    this.sendMacroMessage("Reached 50 cold warped out");
                })
            }
        })

        register("chat", (Event) => {
            if(!this.Enabled) return;
            if(ChatLib.getChatMessage(Event, false).startsWith("WOW! You found a Glacite Mineshaft portal!")) {
                if (this.shaftAlerts) Utils.warnPlayer("Found a Glacite Mineshaft portal!");
                MiningBot.stopBot();
                MovementHelper.stopMovement();
                MovementHelper.setKey("shift", false);
                Rotations.stopRotate();
                this.setState(this.MACROSTATES.FINDVEIN);
            }
        })

        /*
        register("renderWorld", () => {
            if (!this.Enabled) return

            RenderUtils.renderCubes(this.commissions.get("Tungsten Collector").locations, 1, 1, [1, 0, 0])
            if(!this.vein) return;
            let points = []
            this.vein.targets.forEach((pos) => {points.push([pos.x, pos.y, pos.z])})
            RenderUtils.renderCubes(points, 1, 1, [0, 1, 0]);
        })
        */

        register("packetReceived", (Packet, Event) => {
            if(!this.Enabled) return
            this.waitOnTransmision = false;
        }).setFilteredClass(net.minecraft.network.play.server.S08PacketPlayerPosLook)
    }

    toggle() {
        this.Enabled = !this.Enabled;
        this.sendMacroMessage(this.Enabled ? "&aEnabled": "&cDisabled");
        if(this.Enabled) {
            if(!MiningUtils.isInGlaciteTunnels()) return this.stopMacro("You are currently not in the Glacite Tunnels", true)
            let miningDrills = MiningUtils.getDrills();
            this.drill = miningDrills.drill;
            this.blueCheese = miningDrills.blueCheese ? miningDrills.blueCheese : miningDrills.drill;
            this.etherwarp = Utils.getItemByName("Aspect of the Void");
            this.pigeon = Utils.getItemByName("Royal Pigeon");
            this.abiphone = Utils.getItemByName("Abiphone");
            if(!this.drill || !this.blueCheese) return this.stopMacro("Missing a mining item", true);
            if(!this.etherwarp) return this.stopMacro("Missing etherwarp", true);
            if(!this.pigeon) return this.stopMacro("Missing royal pigeon", true);

            // Failsafes
            global.export.FailsafeManager.register((cb) => {
                if (this.Enabled) this.toggle()
                cb()
            }, () => {
                if (!this.Enabled) this.toggle()
            }, ["Teleport", "Rotation", "Velocity", "Item"])

            PolarPathFinder.setParams(2.0, 7.0);
            MouseUtils.unGrabMouse()

            this.state = this.MACROSTATES.WAITING;
            new Thread(() => {
                // prepare
                this.setState(this.MACROSTATES.CLICKPIGEON);

                // Overlay
                this.startTime = Date.now()
                this.commissionCounter.reset()
                this.commissionCount = 0

                overlayManager.AddOverlayText(this.OVERLAY_ID, "COMMS_HOUR", "Commissions/Hour: 0")
                overlayManager.AddOverlayText(this.OVERLAY_ID, "COMMS", "Session Commissions: 0")
                overlayManager.AddOverlayText(this.OVERLAY_ID, "COMMS_HOTM", "Session HOTM XP: 0")
                overlayManager.AddOverlayText(this.OVERLAY_ID, "TIME", `Session Time: 0s`)
                overlayManager.EnableOverlay(this.OVERLAY_ID)
            }).start();
        }
        if(!this.Enabled) {
            this.stopMacro();
        }
    }

    setState(state) {
        this.state = state;
        switch(state) {
            case this.MACROSTATES.CLICKPIGEON:
                this.tickCounter = 0;
                this.travelledVeins.clear();
                this.minedVeins.clear();
                MiningBot.stopBot();
                break;
            case this.MACROSTATES.FINDCOMMISSION:
                this.tickCounter = Math.floor(Math.random() * -15) - 5;
                this.commission = null;
                break;
            case this.MACROSTATES.SETUPROUTE:
                this.tickCounter = 0;
                break;
            case this.MACROSTATES.TRAVELROUTE:
                Utils.makeRandomPitch(5.0, 15.0);
                this.movement = this.MOVEMENTS.NOTHING;
                this.travelledVeins.clear();
                this.routeIndex = 0;
                break;
            case this.MACROSTATES.FINDVEIN:
                Utils.makeRandomPitch(5.0, 15.0);
                this.vein = null;
                this.travelledVeins.clear();
                PolarPathFinder.clearPath();
                break;
            case this.MACROSTATES.TRAVELVEIN:
                this.tickCounter = 0;
                this.timer.reset();
                break;
            case this.MACROSTATES.MINEVEIN:
                break;
            case this.MACROSTATES.WAITHUB:
                this.tickCounter = 0;
                break
        };
    };

    /**
     * @param {BlockPos} start The start position
     * @param {Array<Number>} blockids Filter of the blocks
     */
    getVein(start, blockids) {
        let scanned = new Map();
        let closedSet = new Map();
        let vein = [];
        for(let y = -2; y <= 2; y++) {
            for(let x = -2; x <= 2; x++) {
                for(let z = -2; z <= 2; z++) {
                    let pos = start.add(x, y, z);
                    let openSet = new Map();
                    if(blockids.indexOf(World.getBlockAt(pos).type.getID()) != -1) openSet.set(Utils.blockCode(pos), pos);
                    else this.getNeighbours(pos, blockids).forEach((pos) => {openSet.set(Utils.blockCode(pos), pos)})
                    while(openSet.size != 0.0) {
                        openSet.forEach((pos, hash) => {
                            openSet.delete(hash);
                            closedSet.set(hash, true);
                            if(scanned.has(hash)) return;
                            scanned.set(hash, true);
                            vein.push(pos);
                            this.getNeighbours(pos, blockids).forEach((pos) => {
                                let hash = Utils.blockCode(pos);
                                if(!closedSet.has(hash)) {
                                    openSet.set(hash, pos);
                                }
                            })
                        })
                    }
                    if(vein.length != 0.0) return vein;
                }
            }
        }
        return [];
    }

    /**
     * @param {BlockPos} center The center position
     * @param {Array<Number>} blockids Filter of the blocks
     * @returns {Array<BlockPos>}
     */
    getNeighbours(center, blockids) {
        let blocks = []
        for(let y = -1; y <= 1; y++) {
            for(let x = -1; x <= 1; x++) {
                for(let z = -1; z <= 1; z++) {
                    if(x === 0 && y === 0 && z === 0) continue
                    let pos = center.add(x, y, z);
                    if(blockids.indexOf(World.getBlockAt(pos).type.getID()) != -1) {
                        blocks.push(pos);
                    }
                }
            }
        }
        return blocks;
    }

    /**
     * @param {GlaciteCommission} commission commission name
     * @param {Array<BlockPos>} vein
     * @param {Array<Number>} blockids
     */
    getWalkTargets(commission, vein, blockids) {
        let openSet = new Set(vein);
        let scanned = new Map();
        let targets = [];
        if(!["Tungsten Collector","Umber Collector","Glacite Collector"].toString().includes(commission.name)) {
            openSet.forEach((veinpos) => {
                for(let x = -1; x <= 1; x++) {
                    for(let z = -1; z <= 1; z++) {
                        for(let y = -1; y >= -6; y--) {
                            if(y === -2 || y === -3) continue;
                            let pos = veinpos.add(x, y, z);
                            let hash = Utils.blockCode(pos);
                            if(scanned.has(hash)) continue;
                            scanned.set(hash, true);
                            if(!this.isWalkable(pos, blockids)) break;
                            targets.push(pos);
                            break;
                        }
                    }
                }
            })
        } else {
            const sides = {NORTH: 0, SOUTH: 0, EAST: 0, WEST: 0};
            const sidesPos = {NORTH: new Vec3i(0,0,-1), SOUTH: new Vec3i(0,0,1), EAST: new Vec3i(1,0,0), WEST: new Vec3i(-1,0,0)};
            openSet.forEach((veinpos) => {
                let openSides = this.getOpenSides(veinpos);
                for (key in openSides) {
                    if(openSides[key]) {
                        sides[key] += 1;
                    }
                }
            })
            let sidePos = null;
            let highest;
            for(key in sides) {
                if(!sidePos || sides[key] > highest) {
                    sidePos = sidesPos[key];
                    highest = sides[key];
                }
            }
            openSet.forEach((veinpos) => {
                for(let y = 0; y >= -3; y--) {
                    let pos = veinpos.add(sidePos).add(0, y, 0);
                    if(!this.isWalkable(pos, blockids)) continue;
                    targets.push(pos);
                    break;
                }
            })
            if(targets.length === 0.0) return targets;
            let newtargets = [];
            targets.forEach((targetpos) => {
                let pos = targetpos.add(sidePos);
                if(this.isWalkable(pos, blockids)) newtargets.push(pos);
            })
            targets = newtargets;
        }
        return targets;
    }

    // north 0,0,-1 south 0,0,1  east 1,0,0 west -1,0,0
    getOpenSides(pos) {
        return {
            NORTH: World.getBlockAt(pos.add(0,0,-1)).type.getID() === 0.0,
            SOUTH: World.getBlockAt(pos.add(0,0,1)).type.getID() === 0.0,
            EAST: World.getBlockAt(pos.add(1,0,0)).type.getID() === 0.0,
            WEST: World.getBlockAt(pos.add(-1,0,0)).type.getID() === 0.0
        }
    }

    /**
     * ported from java to js because it could find the "public" class.
     * @param {BlockPos} pos
     * @param {Array<Number>} blockids
     */
    isWalkable(pos) {
        let block = World.getBlockAt(pos);
        let MCBlock = block.type.mcBlock;
        if(MCBlock.func_149688_o().func_76224_d() || (!MCBlock.func_149688_o().func_76220_a() && block.type.getID() != 78) || !this.targetBlockids.has(block.type.getID())) return false;
        let totalHeight = 0.0;
        let blockType1 = World.getBlockAt(pos.add(0, 1, 0)).type
        let blockType2 = World.getBlockAt(pos.add(0, 2, 0)).type
        let blockType3 = World.getBlockAt(pos.add(0, 3, 0)).type
        if(blockType1.getID() != 0.0) totalHeight += blockType1.mcBlock.func_149669_A();
        if(blockType2.getID() != 0.0) totalHeight += blockType2.mcBlock.func_149669_A();
        if(blockType3.getID() != 0.0) totalHeight += blockType3.mcBlock.func_149669_A();
        return totalHeight < 0.6;
    }

    initCommissions() {
        this.commissionNames.forEach((name) => {
            if(name === "Peridot Gemstone Collector") {
                this.commissions.set(name, new GlaciteCommission(name, Routes.peridot, [
                    new Waypoint([-16,145,236], this.MOVEMENTS.ETHERWARP),
                    new Waypoint([-42,145,260], this.MOVEMENTS.WALK),
                    new Waypoint([-31,152,295], this.MOVEMENTS.WALK),
                    new Waypoint([-41,147,306], this.MOVEMENTS.WALK),
                    new Waypoint([-50,145,306], this.MOVEMENTS.WALK)
                ], [95, 160]))
            } else if(name === "Citrine Gemstone Collector") {
                this.commissions.set(name, new GlaciteCommission(name, Routes.citrine, [
                    new Waypoint([-16,145,236], this.MOVEMENTS.ETHERWARP),
                    new Waypoint([-39,142,259], this.MOVEMENTS.WALK),
                    new Waypoint([-49,142,246], this.MOVEMENTS.WALK),
                    new Waypoint([-79,142,242], this.MOVEMENTS.WALK),
                    new Waypoint([-87,142,262], this.MOVEMENTS.WALK)
                ], [95, 160]))
            } else if(name === "Onyx Gemstone Collector") {
                this.commissions.set(name, new GlaciteCommission(name, Routes.onyx, [
                    new Waypoint([-13,120,227], this.MOVEMENTS.ETHERWARP),
                    new Waypoint([-13,121,245], this.MOVEMENTS.WALK),
                    new Waypoint([-19,122,258], this.MOVEMENTS.WALK),
                    new Waypoint([-15,122,273], this.MOVEMENTS.WALK),
                    new Waypoint([-30,121,284], this.MOVEMENTS.WALK),
                    new Waypoint([-44,120,288], this.MOVEMENTS.WALK),
                    new Waypoint([-43,124,318], this.MOVEMENTS.WALK),
                    new Waypoint([-25,125,327], this.MOVEMENTS.WALK),
                    new Waypoint([-13,126,341], this.MOVEMENTS.WALK),
                    new Waypoint([-22,129,358], this.MOVEMENTS.WALK),
                    new Waypoint([-20,131,382], this.MOVEMENTS.WALK)
                ], [95, 160]))
            } else if(name === "Aquamarine Gemstone Collector") {
                this.commissions.set(name, new GlaciteCommission(name, Routes.aquamarine, [
                    new Waypoint([-3,147,239], this.MOVEMENTS.ETHERWARP),
                    new Waypoint([4,151,259], this.MOVEMENTS.AOTE),
                    new Waypoint([21,143,268], this.MOVEMENTS.WALK),
                    new Waypoint([47,138,264], this.MOVEMENTS.WALK),
                    new Waypoint([82,148,303], this.MOVEMENTS.AOTE),
                    new Waypoint([77,148,320], this.MOVEMENTS.WALK),
                    new Waypoint([100,150,333], this.MOVEMENTS.WALK)
                ], [95, 160]))
            } else if(name === "Tungsten Collector") {
                this.commissions.set(name, new GlaciteCommission(name, Routes.thungsten, [
                    new Waypoint([12,120,253], this.MOVEMENTS.AOTE),
                    new Waypoint([11,119,255], this.MOVEMENTS.WALK),
                    new Waypoint([30,118,267], this.MOVEMENTS.AOTE)
                ], [4, 82]));
            } else if(name === "Umber Collector") {
                this.commissions.set(name, new GlaciteCommission(name, Routes.umber, [
                    new Waypoint([12,120,253], this.MOVEMENTS.AOTE),
                    new Waypoint([11,119,255], this.MOVEMENTS.WALK),
                    new Waypoint([30,118,267], this.MOVEMENTS.AOTE)
                ], [172, 159, 181]));
            } else if(name === "Glacite Collector") {
                this.commissions.set(name, new GlaciteCommission(name, Routes.glacite, [
                    new Waypoint([12,120,253], this.MOVEMENTS.AOTE),
                    new Waypoint([11,119,255], this.MOVEMENTS.WALK),
                    new Waypoint([30,118,267], this.MOVEMENTS.AOTE)
                ], [174]));
            }
        })
    }

    sendMacroMessage(msg) {
        ChatUtils.sendModMessage(this.ModuleName + ": " + msg);
    }

    stopMacro(msg=null, disableMessage=false) {
        if(msg) this.sendMacroMessage(msg);
        if(disableMessage) this.sendMacroMessage("&cDisabled");
        global.export.FailsafeManager.unregister();
        MouseUtils.reGrabMouse()
        overlayManager.DisableOverlay(this.OVERLAY_ID);
        MiningBot.stopBot();
        PolarPathFinder.resetParams();
        MovementHelper.stopMovement();
        MovementHelper.setKey("shift", false);
        Rotations.stopRotate();
        PolarPathFinder.clearPath();
        this.Enabled = false;
    }
}

class GlaciteCommission {
    /**
     * @param {String} name The commission name
     * @param {Array<number>} locations You want it to be in the format [x,y,z]
     * @param {Array<Waypoint>} path The path which it takes to get to an area, empty if it needs to pathfind
     * @param {Array<Number>} blockIds All the blockids that can be mined
     */
    constructor(name, locations, path, blockIds) {
        this.name = name;
        this.locations = locations;
        this.path = path;
        this.blockIds = blockIds;
    }
}

global.export.Glacite_Commission = GlaciteCommission;

class Waypoint {
    /**
     * @param {Array<number>} point You want it to be in the format [x,y,z]
     * @param {number} type The one in this.MOVEMENTS
     */
    constructor(point, type) {
        this.point = point;
        this.type = type;
    }

    /**
     * @returns {BlockPos}
     */
    getBlockPos() {
        return new BlockPos(this.point[0], this.point[1], this.point[2]);
    }
}

global.export.Glacite_Waypoint = Waypoint;

class Vein {
    /**
     * @param {Array<number>|BlockPos} veinpos In the format [x,y,z]
     * @param {Array<BlockPos>} positions All the positions of the vein
     * @param {Array<BlockPos>} targets All the positions that the path finder can get to as an end position
     * @param {Array<number>} blockIds Contains all the blockid's of the vein
     */
    constructor(veinpos, positions, targets, blockIds) {
        this.veinpos = veinpos;
        this.positions = positions;
        this.targets = targets;
        this.blockIds = blockIds;
        this.location;
    }

    /**
     * @returns {Array<BlockPos>}
     */
    getExistingBlocks() {
        return this.positions.filter(pos => this.blockIds.indexOf(World.getBlockAt(pos).type.getID()) != -1);
    }

    filterVeinOnTargets() {
        let scanned = [];
        this.targets.forEach((targetpos) => {
            this.positions.forEach((veinpos) => {
                if(scanned.indexOf(veinpos) != -1) return;
                if(MathUtils.getDistance(new Vector(targetpos).add(0.5, 2.5, 0.5), new Vector(veinpos).add(0.5, 0.5, 0.5)).distance <= 4.0) {
                    scanned.push(veinpos);
                }
            })
        })
        this.positions = scanned;
    }

    filterVeinForMithril() {
        let positions = [];
        this.positions.forEach((pos) => {
            let block = World.getBlockAt(pos)
            if(block.type.getID() === 159.0 && block.getMetadata() === 9.0) return;
            positions.push(pos);
        })
        this.positions = positions;
    }
}

global.export.Glacite_Vein = Vein;

global.export.Glacite_Commission_Macro = new GlaciteCommissionMacro();