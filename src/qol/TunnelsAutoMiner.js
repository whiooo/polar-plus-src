/* @ Plus @ */
let { SettingSelector, SettingSlider, SettingToggle, ConfigModuleClass, ModuleToggle, getKeyBind, ModuleManager } = global.settingSelection;
let { Glacite_Commission_Macro, Glacite_Vein, Glacite_Commission, PolarPathFinder, MovementHelper, MathUtils, Rotations, MiningBot, ItemUtils, RaytraceUtils, MiningUtils } = global.export;
let { ChatUtils, Utils, RenderUtils, MouseUtils } = global.export;
let { TimeHelper, Vector } = global.export;

global.modules.push(
    new ConfigModuleClass(
        "Tunnel Miner",
        "Mining",
        [
            new SettingSelector("Tunnel Route", 0, [
                "Custom - 1",
                "Custom - 2",
                "Custom - 3",
                "Custom - 4",
                "Custom - 5",
                "Custom - 6",
                "Custom - 7",
                "Custom - 8",
                "Custom - 9"
            ]),
            new SettingSelector("Routing Method", 0, [
                "Route based",
                "Closest"
            ]),
            new SettingSelector("Cold Warp Out", 1, [
                "-25",
                "-50",
                "-75",
                "-90"
            ]),
            new SettingToggle("Glacite", true),
            new SettingToggle("Umber", true),
            new SettingToggle("Tungsten", true)
        ]
    )
)

class TunnelsAutoMiner {
    constructor() {

        getKeyBind("Tunnel Miner", "Polar Client - Mining", this)

        this.ModuleName = "Tunnel Miner";
        this.Enabled = false;

        this.MACROSTATES = {
            WAITING: 0,
            FINDVEIN: 1,
            TRAVELVEIN: 2,
            MINEVEIN: 3,
            WAITHUB: 4,
            WAITCAMP: 5,
            WAITWARPOUT: 6
        };
        this.state = this.MACROSTATES.WAITING;

        this.MOVEMENTS = {
            WALK: 0,
            ETHERWARP: 1,
            NOTHING: 2
        };
        this.movement = this.MOVEMENTS.NOTHING;

        this.miningData = {
            GLACITE: [new BlockData(174, 0)],
            UMBER: [new BlockData(159, 12), new BlockData(172, 0), new BlockData(181, 8)],
            TUNGSTEN: [new BlockData(82, 0), new BlockData(4, 0)]
        }
        this.allTargets = [new BlockData(174, 0), new BlockData(159, 12), new BlockData(172, 0), new BlockData(181, 8), new BlockData(82, 0), new BlockData(4, 0)];

        this.timer = new TimeHelper();
        this.etherwarpTimer = new TimeHelper();
        this.currentVein = new MinerVein(); //place holder for vsc
        this.blockTargets = [];
        this.coldThreshold = 0;
        this.tickCounter = 0;
        
        register("tick", () => {
            if(!this.Enabled) return;

            switch(this.state) {
                case this.MACROSTATES.FINDVEIN:
                    let nextNumber = this.currentVein.number + 1 === this.route.length ? 0 : this.currentVein.number + 1;
                    let vein = this.getVein(new Vector(this.route[nextNumber]).getBlockPos(), this.blockTargets);
                    let targets = this.getTargets(vein);
                    vein = this.filterVeinOnTargets(vein, targets);
                    if(vein.length === 0.0) {
                        this.sendMacroMessage("Skipped next vein because it was already mined");
                        return this.currentVein.number = nextNumber; //so it will continue to the next vein
                    }
                    if(targets.length === 0.0) return this.stopMacro("Your next vein didn't have a location to stand next too", true);
                    this.currentVein = new MinerVein(new Vector(this.route[nextNumber]).getBlockPos(), nextNumber, targets, vein);
                    let closest = null;
                    let lowest;
                    this.currentVein.targets.forEach((pos) => {
                        let distance = MathUtils.getDistanceToPlayer(pos).distance
                        if(!closest || distance < lowest) {
                            closest = pos;
                            lowest = distance;
                        }
                    })
                    this.currentVein.setPathFindPos(closest);
                    if(PolarPathFinder.findPath(Utils.getPlayerNode().getBlockPos(), closest)) {
                        PolarPathFinder.setParams(2.0, 6.0);
                        this.setState(this.MACROSTATES.TRAVELVEIN);
                    }

                    break;
                case this.MACROSTATES.TRAVELVEIN:
                    if(PolarPathFinder.currentNode && MathUtils.getDistanceToPlayer(this.currentVein.pathfindPos).distance > 3.0) {
                        MovementHelper.setKey("sprint", true);
                        MovementHelper.setKeysForStraightLine(MathUtils.calculateAngles(new Vector(PolarPathFinder.currentNode.point)).yaw, true);
                        if(!Rotations.rotate) Rotations.rotateTo(new Vector(PolarPathFinder.currentNode.lookPoint), 1.0, true, Utils.getRandomPitch());
                        else Rotations.updateTargetTo(new Vector(PolarPathFinder.currentNode.lookPoint), 1.0, true, Utils.getRandomPitch());
                    } else {
                        MovementHelper.stopMovement();
                        MovementHelper.setKey("shift", true);
                        Rotations.stopRotate();
                        PolarPathFinder.clearPath();
                        this.setState(this.MACROSTATES.MINEVEIN);
                    }

                    break;
                case this.MACROSTATES.MINEVEIN:
                    if(!MiningBot.Enabled) {
                        MiningBot.setGemstoneTypes(false, false, false, false, false, false, false, false, false, false, false, false);
                        MiningBot.setTunnelTypes(
                            ModuleManager.getSetting(this.ModuleName, "Glacite"),
                            ModuleManager.getSetting(this.ModuleName, "Tungsten"),
                            ModuleManager.getSetting(this.ModuleName, "Umber"),
                        )
                        MiningBot.toggle(
                            MiningBot.MACROTYPES.TUNNEL,
                            this.drill,
                            this.blueCheese,
                            this.currentVein.location,
                            100,
                            false
                        )
                        this.currentVein.targets = MiningBot.strafeLocations;
                    }
                    if(MiningBot.Enabled && MiningBot.isEmpty()) {
                        MiningBot.stopBot();
                        this.setState(this.MACROSTATES.FINDVEIN);
                    }

                    break;
                case this.MACROSTATES.WAITHUB:
                    if(MathUtils.getDistanceToPlayer([-3,69,-70]).distance < 5.0) {
                        if(this.tickCounter === 100) {
                            ChatLib.say("/warp camp");
                            this.setState(this.MACROSTATES.WAITCAMP);
                        }
                        this.tickCounter++;
                    } else this.tickCounter = 0;

                    break;
                case this.MACROSTATES.WAITCAMP:
                    if(MathUtils.getDistanceToPlayer([0,127,200]).distance < 5.0) {
                        if(this.tickCounter === 60) {
                            this.currentVein = new MinerVein(null, this.route.length - 1, [], []); //so it goes to the next number when it checks
                            this.setState(this.MACROSTATES.FINDVEIN);
                        }
                        this.tickCounter++;
                    } else this.tickCounter = 0;
                    break;
                case this.MACROSTATES.WAITWARPOUT:
                    if(Math.abs(Player.getMotionX()) < 0.01 && Math.abs(Player.getMotionZ()) < 0.01 && Math.abs(Player.getMotionY()) < 0.08) {
                        if(this.tickCounter === 100) {
                            ChatLib.say("/warp camp");
                            this.setState(this.MACROSTATES.WAITCAMP);
                        }
                        this.tickCounter++;
                    } else this.tickCounter = 0;
                    break;
            }
        })

        register("chat", (Event) => {
            // messages
            // BRRR! It's getting really cold in here! But you've got to keep moving...
            // BRRR! It's so cold that you can barely feel your fingers. Moving is getting difficult...
            // BRRR! Your movement slows to a crawl as the cold threatens to take over. Time to get out of here...
            // BRRR! You're freezing! All you can think about is getting out of here to a warm campfire...
            if(!this.Enabled) return;
            let msg = ChatLib.getChatMessage(Event, false);
            let maxCold = ModuleManager.getSetting(this.ModuleName, "Cold Warp Out");
            if(
                (msg.startsWith("BRRR! It's getting really cold in here! But you've got to keep moving...") && maxCold === "-25") ||
                (msg.startsWith("BRRR! It's so cold that you can barely feel your fingers. Moving is getting difficult...") && maxCold === "-50") ||
                (msg.startsWith("BRRR! Your movement slows to a crawl as the cold threatens to take over. Time to get out of here...") && maxCold === "-75") ||
                (msg.startsWith("BRRR! You're freezing! All you can think about is getting out of here to a warm campfire...") && maxCold === "-90")
            ) {
                if(this.state !== this.MACROSTATES.WAITCAMP) {
                    MovementHelper.stopMovement();
                    Rotations.stopRotate();
                    this.sendMacroMessage("Cold threshold reached and warping out!");
                    this.setState(this.MACROSTATES.WAITCAMP);
                    MiningBot.stopBot();
                    Client.scheduleTask(20, () => {
                        ChatLib.say("/warp camp");
                    })
                }
            }
        })

        register("worldUnload", () => {
            if(this.Enabled) {
                if(this.state === this.MACROSTATES.WAITCAMP || this.state === this.MACROSTATES.WAITHUB || this.state === this.MACROSTATES.WAITWARPOUT) return;
                MiningBot.stopBot(); //also cancel's all movement
                PolarPathFinder.clearPath(); //remove's pathfinding points
                this.tickCounter = 0;
                this.state = this.MACROSTATES.WAITWARPOUT;
                this.sendMacroMessage("Detected warpout, warping back in 5 seconds!");
            }
        })

        register("step", () => {
            if(!MiningUtils.isInGlaciteTunnels()) return;
            this.route = Utils.getConfigFile("tunnelroutes/" + this.getAccessKey(ModuleManager.getSetting(this.ModuleName, "Tunnel Route")) + ".txt");
        }).setDelay(1);

        this.route = []
        register("command", (...args) => {
            this.route = this.edit(String(args.shift()).toLocaleUpperCase(), args, this.route);
            Utils.writeConfigFile("tunnelroutes/" + this.getAccessKey(ModuleManager.getSetting(this.ModuleName, "Tunnel Route")) + ".txt", this.route);
        }).setName("tunnelminer");

        register("renderWorld", () => {
            if(!MiningUtils.isInGlaciteTunnels()) return;
            RenderUtils.renderCordsWithNumbers(this.route, [0, 0, 1], 0.2, true);
            if(this.currentVein.location === undefined) return
            let points = []
            this.currentVein.targets.forEach((pos) => {points.push([pos.x, pos.y, pos.z])})
            RenderUtils.renderCubes(points, 1, 1, [0, 1, 0]);
        })
    }

    toggle() {
        this.Enabled = !this.Enabled;
        this.sendMacroMessage(this.Enabled ? "&aEnabled": "&cDisabled");
        if(this.Enabled) {
            MouseUtils.unGrabMouse();
            if(!MiningUtils.isInGlaciteTunnels()) return this.stopMacro("You are currently not in the Glacite Tunnels", true)
            let miningDrills = MiningUtils.getDrills();
            this.drill = miningDrills.drill;
            this.blueCheese = miningDrills.blueCheese ? miningDrills.blueCheese : miningDrills.drill;
            this.etherwarp = Utils.getItemByName("Aspect of the Void");
            if(!this.drill || !this.blueCheese) return this.stopMacro("Missing a mining item", true);
            if(!this.etherwarp) return this.stopMacro("Missing etherwarp", true);
            
            this.blockTargets = [];
            if(ModuleManager.getSetting(this.ModuleName, "Glacite")) this.miningData.GLACITE.forEach(data => this.blockTargets.push(data));
            if(ModuleManager.getSetting(this.ModuleName, "Umber")) this.miningData.UMBER.forEach(data => this.blockTargets.push(data));
            if(ModuleManager.getSetting(this.ModuleName, "Tungsten")) this.miningData.TUNGSTEN.forEach(data => this.blockTargets.push(data));
            this.coldThreshold = ModuleManager.getSetting(this.ModuleName, "Cold Threshold");
            
            let current = this.getNearest();
            if(!current) return this.stopMacro("Your route is empty", true);
            this.currentVein = new MinerVein(null, this.route.length - 1, [], []); //so it goes to the next number when it checks

            // Failsafes
            global.export.FailsafeManager.register((cb) => {
                if (this.Enabled) this.toggle()
                cb()
            }, () => {
                if (!this.Enabled) this.toggle()
            }, ["Rotation", "Teleport", "Velocity", "Item"])

            this.setState(this.MACROSTATES.WAITING);
            new Thread(() => {
                //prepare stuff fork
                ChatLib.say("/warp camp");
                this.setState(this.MACROSTATES.WAITCAMP);
            }).start();
        }
        if(!this.Enabled) {
            this.stopMacro();
        }
    }

    setState(state) {
        this.state = state;
        switch(state) {
            case this.MACROSTATES.FINDVEIN:
                break;
            case this.MACROSTATES.TRAVELVEIN:
                Utils.makeRandomPitch(5.0, 15.0);
                break;
            case this.MACROSTATES.MINEVEIN:
                break;
            case this.MACROSTATES.WAITHUB:
                this.tickCounter = 0;
                break;
            case this.MACROSTATES.WAITCAMP:
                this.tickCounter = 0;
                break;
        }
    }

    /**
     * @param {BlockPos} pointPos 
     * @param {Array<BlockData>} blockDatas 
     * @returns {Array<BlockPos>}
     */
    getVein(pointPos, blockDatas) {
        let scanned = new Map();
        let vein = [];
        for(let y = -2; y <= 2; y++) {
            for(let x = -2; x <= 2; x++) {
                for(let z = -2; z <= 2; z++) {
                    let pos = pointPos.add(x,y,z);
                    if(!this.checkBlockDatas(World.getBlockAt(pos), blockDatas)) continue;
                    let openSet = new Map();
                    openSet.set(Utils.blockCode(pos), pos);
                    while(openSet.size != 0.0) {
                        openSet.forEach((pos, hash) => {
                            openSet.delete(hash);
                            if(scanned.has(hash)) return;
                            scanned.set(hash, true);
                            vein.push(pos);
                            this.getAround(pos, blockDatas).forEach((pos) => {
                                let hash = Utils.blockCode(pos);
                                if(!scanned.has(hash)) openSet.set(hash, pos);
                            });
                        })
                    }
                    return vein;
                }
            }
        }
        return [];
    }

    /**
     * @param {BlockPos} parentPos
     * @param {Array<BlockData>} blockDatas 
     */
    getAround(parentPos, blockDatas) {
        let blocks = [];
        for(let y = -1; y <= 1; y++) {
            for(let x = -1; x <= 1; x++) {
                for(let z = -1; z <= 1; z++) {
                    if(x === 0 && y === 0 && z === 0) continue
                    let pos = parentPos.add(x,y,z);
                    if(this.checkBlockDatas(World.getBlockAt(pos), blockDatas)) blocks.push(pos);
                }
            }
        }
        return blocks;
    }

    /**
     * @param {Block} block 
     * @param {Array<BlockData>} blockDatas 
     */
    checkBlockDatas(block, blockDatas) {
        for(let i = 0; i < blockDatas.length; i++) {
            if(blockDatas[i].equals(block)) {
                return true;
            }
        }
        return false;
    }

    /**
     * @param {Array<BlockData>} blockDatas
     * @returns {Array<Number>}
     */
    getBlockIds(blockDatas) {
        let ids = [];
        blockDatas.forEach(data => ids.push(data.blockid));
        return ids;
    }

    /**
     * @param {Array<BlockPos>} vein
     * @param {Array<BlockData>} blockDatas 
     */
    getTargets(vein) {
        let openSet = new Set(vein);
        let targets = [];
        const sides = {NORTH: 0, SOUTH: 0, EAST: 0, WEST: 0};
        const sidesPos = {NORTH: new Vec3i(0,0,-1), SOUTH: new Vec3i(0,0,1), EAST: new Vec3i(1,0,0), WEST: new Vec3i(-1,0,0)};
        openSet.forEach((veinpos) => {
            let openSides = this.getOpenSides(veinpos);
            for (key in openSides) if(openSides[key]) sides[key] += 1;
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
                if(!this.isWalkable(pos)) continue;
                targets.push(pos);
                break;
            }
        })
        if(targets.length === 0.0) return targets;
        let newtargets = [];
        targets.forEach((targetpos) => {
            for(let y = 0; y >= -3; y--) {
                let pos = targetpos.add(sidePos).add(0,y,0);
                if(this.isWalkable(pos)) {
                    newtargets.push(pos);
                    break
                }
            }
        })
        targets = newtargets;
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
     */
    isWalkable(pos) {
        let block = World.getBlockAt(pos);
        let MCBlock = block.type.mcBlock;
        if(MCBlock.func_149688_o().func_76224_d() || (!MCBlock.func_149688_o().func_76220_a() && block.type.getID() != 78) || this.checkBlockDatas(block, this.allTargets)) return false;
        let totalHeight = 0.0;
        let blockType1 = World.getBlockAt(pos.add(0, 1, 0)).type
        let blockType2 = World.getBlockAt(pos.add(0, 2, 0)).type
        let blockType3 = World.getBlockAt(pos.add(0, 3, 0)).type
        if(blockType1.getID() != 0.0) totalHeight += blockType1.mcBlock.func_149669_A();
        if(blockType2.getID() != 0.0) totalHeight += blockType2.mcBlock.func_149669_A();
        if(blockType3.getID() != 0.0) totalHeight += blockType3.mcBlock.func_149669_A();
        return totalHeight < 0.6;
    }
    
    /**
     * @param {Array<BlockPos>} vein 
     * @param {Array<BlockPos>} targets 
     */
    filterVeinOnTargets(vein, targets) {
        let goodVein = [];
        let scanned = new Map()
        targets.forEach((targetpos) => {
            let center = new Vector(targetpos).add(0.5, 1.52, 0.5);
            vein.forEach((pos) => {
                let hash = Utils.blockCode(pos);
                if(scanned.has(hash)) return;
                if(MathUtils.getDistance(center, new Vector(pos).add(0.5, 0.5, 0.5)).distance < 4.0) {
                    scanned.set(hash, true);
                    goodVein.push(pos);
                }
            })
        })
        return goodVein;
    }

    /**
     * @returns {Object|null}
     */
    getNearest() {
        let closest = null;
        let lowest;
        this.route.forEach((point, index) => {
            let distance = MathUtils.getDistanceToPlayer(point).distance;
            if(!closest || distance < lowest) {
                closest = {pos: new BlockPos(point[0], point[1], point[2]), number: index};
                lowest = distance;
            }
        })
        return closest;
    }

    /**
     * @param {String} action 
     * @param {Array<String>} args 
     * @param {Array<[x,y,z]>} route 
     * @returns {Array<[x,y,z]>}
     */
    edit(action, args, route) {
        switch(action) {
            case "ADD":
                let point = [Math.floor(Player.getX()), Math.floor(Player.getY() - 1), Math.floor(Player.getZ())]
                if(!args[0]) route.push(point);
                else route.splice(parseInt(args[0])-1, 0, point);
                return route;
            case "REMOVE":
                if(!args[0]) route.pop();
                else route.splice(parseInt(args[0])-1, 1);
                return route;
            case "CLEAR":
                return [];
            default:
                this.sendMacroMessage(action + " is not a valid edit action");
                return route;
        }
    }

    getAccessKey(name) {
        return "custom" + name.slice(-1)
    }

    sendMacroMessage(message) {
        ChatUtils.sendModMessage(this.ModuleName + ": " + message);
    }

    stopMacro(msg=null, disableMessage=false) {
        if(msg) this.sendMacroMessage(msg);
        if(disableMessage) this.sendMacroMessage("&cDisabled");
        global.export.FailsafeManager.unregister();
        MiningBot.stopBot();
        MouseUtils.reGrabMouse();
        PolarPathFinder.clearPath();
        PolarPathFinder.setParams(2.0, 4.0);
        MovementHelper.stopMovement();
        Rotations.stopRotate();
        this.Enabled = false;
    }
}

class MinerVein {
    /**
     * @param {BlockPos} location arraylist location
     * @param {Number} number Index number
     * @param {Array<BlockPos>} targets all the walkpoint for the auto miner
     * @param {Array<BlockPos>} positions all the locations of the vein that can be mined
     */
    constructor(location, number, targets, positions) {
        this.location = location;
        this.number = number;
        this.targets = targets;
        this.positions = positions;
        this.pathfindPos;
    }

    /**
     * @param {BlockPos} pos 
     */
    setPathFindPos(pos) {
        this.pathfindPos = pos;
    }
}

class BlockData {
    /**
     * easy to compare blocks to eachother
     * @param {Number} blockid the blockid of the block
     * @param {Number} metadata the metadata of the block
     */
    constructor(blockid, metadata) {
        this.blockid = blockid;
        this.metadata = metadata;
    }

    /**
     * @param {Block} block 
     * @returns {boolean}
     */
    equals(block) {
        return block.getMetadata() === this.metadata && block.type.getID() === this.blockid;
    }
}

new TunnelsAutoMiner();