let { SettingSelector, SettingSlider, SettingToggle, ConfigModuleClass, ModuleToggle, getKeyBind, ModuleManager } = global.settingSelection
let { ChatUtils, Vector, TimeHelper, RaytraceUtils, MathUtils, MiningUtils, RenderUtils, registerEventSB, ItemUtils, KeyBinding, MovementHelper, Rotations, Utils, MouseUtils, S2FPacketSetSlot, S30PacketWindowItems } = global.export;

global.modules.push(
    new ConfigModuleClass(
        "Mining Bot",
        "Mining",
        [
            new SettingSelector("Mining Target", 1, [
                "Gold",
                "Mithril",
                "Gemstone"
            ])
        ],
        ["Mines ores and gemstones in Skyblock"]
    )
)

class miningBot {
    constructor() {
        getKeyBind("Mining Bot", "Polar Client - Mining").registerKeyPress(() => this.toggle(this.MACROTYPES.MININGBOT));
        this.ModuleName = "Mining Bot";
        this.Enabled = false;
        this.whitelist = [];

        this.MACROSTATES ={
            WAITING: 0,
            MINING: 1,
            CLICKBOOST: 2,
            WAITBOOST: 3
        }
        this.state = this.MACROSTATES.WAITING;
        this.MACROTYPES = {
            MININGBOT: 0,
            COMMISSION: 1,
            GEMSTONE: 2,
            TUNNEL: 3
        }
        this.GEMSTONEBLOCKS = {
            "opal": {allowed: true, metadata: 0},
            "amber": {allowed: true, metadata: 1},
            "jasper": {allowed: true, metadata: 2},
            "sapphire": {allowed: true, metadata: 3},
            "topaz": {allowed: true, metadata: 4},
            "jade": {allowed: true, metadata: 5},
            "amethyst": {allowed: true, metadata: 10},
            "aquamarine": {allowed: true, metadata: 11},
            "citrine": {allowed: true, metadata: 12},
            "peridot": {allowed: true, metadata: 13},
            "ruby": {allowed: true, metadata: 14},
            "onyx": {allowed: true, metadata: 15}
        }
        this.TUNNELBLOCKS = {
            "glacite": true,
            "umber": true,
            "tungsten": true
        }
        this.type = this.MACROTYPES.MININGBOT;
        this.sides = [[0.5, 0.01, 0.5], [0.5, 0.98, 0.5], [0.01, 0.5, 0.5], [0.98, 0.5, 0.5], [0.5, 0.5, 0.01], [0.5, 0.5, 0.99]];

        this.current;
        this.previous = [];
        this.blocks = [];
        this.ticks = 0;
        this.ticksMined = 0;
        this.tickSpeed = {
            withoutmsb: 10,
            msb: 4
        }
        this.preset = false;
        this.miningSpeed = 0;
        this.speedBoost = false;
        this.speedBoostTicks = {
            swap1: 0,
            click: 0,
            swap2: 0
        }
        this.useSpeedBoost = true;
        this.drill;
        this.bluecheese;
        this.tickCounter = 0;
        this.timer = new TimeHelper();
        this.pressShiftCooldown = new TimeHelper();
        this.click = false;
        this.particleSpawend = false;
        this.clickedBlock = false;
        this.miningTargets = [];
        this.walkTimer = new TimeHelper();
        this.boostCounter = 0;

        //commission
        this.titanium = false;

        //gemstone
        this.lowPing;
        this.blocksInTheWay = [];

        //tunnel
        this.strafeLocations;
        this.gemstoneCommission = false;
        this.strafeYaw;

        this.mc = Client.getMinecraft();
        this.sendClickBlockToController = this.mc.getClass().getDeclaredMethod("func_147115_a", [java.lang.Boolean.TYPE]);
        this.sendClickBlockToController.setAccessible(true);
        this.damagedBlocks = this.mc.field_71438_f.class.getDeclaredField("field_72738_E");
        this.damagedBlocks.setAccessible(true);

        register("tick", () => {
            this.boostCounter++;
            if(!this.Enabled) return;

            if(Client.currentGui.getClassName() != "null") {
                MovementHelper.stopMovement();
                MovementHelper.setKey("shift", false);
                MovementHelper.setKey("leftclick", false);
                Rotations.stopRotate();
                return;
            }

            switch(this.state) {
                case this.MACROSTATES.MINING:
                    ItemUtils.setItemSlot(this.drill.slot);
                    this.tickCounter++;

                    let looking = Player.lookingAt();
                    if(looking instanceof Entity) {
                        if(looking.getName() === "Goblin " || (looking.getName() === "Armor Stand" && looking?.getClassName() != "EntityOtherPlayerMP" )) {
                            MovementHelper.stopMovement();
                            MovementHelper.setKey("leftclick", false);
                            this.click = !this.click;
                            if(this.click && Math.random() > 0.3) ItemUtils.leftClick();
                        }
                        if(looking?.getClassName() === "EntityOtherPlayerMP") {
                            MovementHelper.stopMovement();
                            return;
                        }
                    }

                    if((this.useSpeedBoost || this.boostCounter >= 2440) && (this.type != this.MACROTYPES.TUNNEL || !this.gemstoneCommission)) {
                        this.state = this.MACROSTATES.CLICKBOOST;
                        this.boostCounter = 0;
                        if(this.current) {
                            this.previous.push(this.current.pos);
                            if(this.previous.length === 3.0) this.previous.shift();
                            this.current = null;
                        }
                        return MovementHelper.setKey("leftclick", false);
                    }

                    if(this.current) {
                        if(this.type === this.MACROTYPES.MININGBOT || this.type === this.MACROTYPES.COMMISSION) {
                            if(this.tickCounter >= 2.0) {
                                MovementHelper.setKey("shift", true);
                                let yaw = MathUtils.calculateAngles(this.current.point).yaw;
                                MovementHelper.setKey("d", yaw > 20.0);
                                MovementHelper.setKey("a", yaw < -20.0);
                                let values = MathUtils.getDistanceToPlayerEyes(this.current.point);
                                MovementHelper.setKey("w", values.distance > 3.25 && Math.abs(values.differenceY) <= 2.0);
                                MovementHelper.setKey("s", values.distance < 2.75);
                                if(yaw >= -20.0 && yaw <= 20.0)  MovementHelper.stopMovement();
                                this.tickCounter = 0;
                            }
                        } else if(this.type === this.MACROTYPES.GEMSTONE || (this.type === this.MACROTYPES.TUNNEL && this.gemstoneCommission)) {
                            if(this.tickCounter >= 2.0) {
                                MovementHelper.setKey("shift", true);
                                let yaw = MathUtils.calculateAngles(this.current.point).yaw;
                                let values = MathUtils.getDistanceToPlayerEyes(this.current.point);
                                if(values.distance < 0.7) MovementHelper.setKey("s", true);
                                else if(values.distance > 4.5) MovementHelper.setKeysForStraightLine(yaw, false);
                                else MovementHelper.stopMovement();
                                this.tickCounter = 0;
                            }
                        } else if(this.type === this.MACROTYPES.TUNNEL) {
                            if(this.tickCounter >= 2.0) {
                                let values = MathUtils.getDistanceToPlayerEyes(this.current.point);
                                let yaw = MathUtils.wrapTo180(this.strafeYaw - (Player.getRawYaw() % 360));
                                if(values.distance < 2.0) {
                                    MovementHelper.setKey("d", false);
                                    MovementHelper.setKey("a", false);
                                    MovementHelper.setKey("s", true);
                                    MovementHelper.setKey("w", false);
                                    this.setShift(true);
                                } else if(values.distance > 4.5) {
                                    let closest = null;
                                    let lowest = 0;
                                    this.strafeLocations.forEach(pos => {
                                        let values = MathUtils.getDistance(pos.add(0.5, 0.5, 0.5), this.current.point);
                                        if(!closest || values.distanceFlat < lowest) {
                                            closest = pos.add(0.5, 0.5, 0.5);
                                            lowest = values.distanceFlat;
                                        }
                                    })
                                    MovementHelper.setKeysForStraightLine(MathUtils.calculateAngles(closest).yaw, false);
                                    let flag = Player.getMotionX() === 0.0 && Player.getMotionZ() === 0.0 && Utils.playerIsCollided();
                                    if(!flag) this.walkTimer.reset();
                                    MovementHelper.setKey("space", this.walkTimer.hasReached(1500) && flag);
                                    this.setShift(values.distance < 5.0);
                                } else if(yaw < -80 || yaw > 80) {
                                    MovementHelper.setKey("d", yaw < -80);
                                    MovementHelper.setKey("a", yaw > 80);
                                    MovementHelper.setKey("s", false);
                                    MovementHelper.setKey("w", false);
                                    this.setShift(true);
                                } else {
                                    MovementHelper.stopMovement();
                                }
                                this.tickCounter = 0;
                            }
                        }
                        let visable = true;
                        if(looking instanceof Block) {
                            if(this.current.pos.equals(looking.pos)) {
                                if(!this.clickedBlock) ItemUtils.leftClick() //MovementHelper.onTickLeftClick();
                                this.clickedBlock = Client.getMinecraft().field_71442_b.func_181040_m();
                                MovementHelper.setKey("leftclick", true);
                                if(this.clickedBlock) {
                                    this.ticksMined++;
                                    this.timer.reset();
                                }
                            }
                        }
                        let cast = this.canSeePos(this.current.pos)
                        if(this.type != this.MACROTYPES.GEMSTONE) visable = cast.result;
                        if(cast.result && !this.particleSpawend) this.current.point = cast.point;
                        Rotations.rotateTo(this.current.point);
                        if(Math.abs(Player.getMotionX()) > 0.01 || Math.abs(Player.getMotionZ()) > 0.01) this.timer.reset();
                        let damage = this.getCurrentBlockDamage() ?? 0.0;
                        if((this.ticksMined >= this.ticks && this.miningTargets?.length != 1.0) || (damage >= 9.0 && (this.type != this.MACROTYPES.TUNNEL || !this.gemstoneCommission)) || [0,7].indexOf(World.getBlockAt(this.current.pos).type.getID()) != -1 || !visable || this.timer.hasReached(1000)) {
                            this.previous.push(this.current.pos);
                            if(this.previous.length === 3.0) this.previous.shift();
                            this.current = null;
                        } else {
                            return;
                        }
                    }
                    if(!this.current) {
                        this.current = this.getNextTarget();
                        if(this.current) {
                            this.ticks = (this.preset && this.type === this.MACROTYPES.GEMSTONE) ? (this.speedBoost ? this.tickSpeed.msb : this.tickSpeed.withoutmsb) : MiningUtils.mineTime(this.miningSpeed, this.current.pos, this.speedBoost);
                            this.ticksMined = 0;
                            this.timer.reset();
                            Rotations.rotateTo(this.current.point);
                            MovementHelper.setKey("leftclick", true);
                            Client.getMinecraft().field_71415_G = true;
                            this.particleSpawend = false;
                            this.clickedBlock = false;
                            if(this.type === this.MACROTYPES.TUNNEL) this.ticks = 200;
                            return;
                        }
                    }

                    //no blocks are left
                    this.empty = true;

                    break;
                case this.MACROSTATES.CLICKBOOST:
                    MovementHelper.setKey("leftclick", false);
                    if (this.drill.slot !== this.bluecheese.slot) {
                        this.setSpeedBoostActions(2 + Math.round(Math.random() * 2), 2 + Math.round(Math.random() * 2), 2 + Math.round(Math.random() * 2));
                        Client.scheduleTask(this.speedBoostTicks.swap1, () => Player.setHeldItemIndex(this.bluecheese.slot));
                        Client.scheduleTask(this.speedBoostTicks.click, () => ItemUtils.rightClickPacket());
                        Client.scheduleTask(this.speedBoostTicks.swap2, () => Player.setHeldItemIndex(this.drill.slot));
                        Client.scheduleTask((this.speedBoostTicks.swap2 + 3), () => this.state = this.MACROSTATES.MINING);
                    } else {
                        let click = 2 + Math.round(Math.random() * 2);
                        Client.scheduleTask(click, () => ItemUtils.rightClickPacket());
                        Client.scheduleTask((click + 3), () => this.state = this.MACROSTATES.MINING);
                    }
                    this.state = this.MACROSTATES.WAITBOOST;
                    this.useSpeedBoost = false;
                    break;
            }
        })

        register("packetSent", (packet, event) => {
            if(!this.Enabled || this.type != this.MACROTYPES.GEMSTONE) return;
            let pos = new BlockPos(packet.func_179715_a());
            if(World.getBlockAt(pos).type.getID() === 4.0) {
                cancel(event);
            }
        }).setFilteredClass(net.minecraft.network.play.client.C07PacketPlayerDigging)

        register("packetReceived", (Packet, Event) => {
            if(!this.Enabled || !this.current) return;
            try {
                const x = Packet.func_149220_d();
                const y = Packet.func_149226_e();
                const z = Packet.func_149225_f();
                const type = Packet.func_179749_a().toString();
                const center = new Vector(this.current.pos).add(0.5, 0.5, 0.5);
                const vecEyes = Player.asPlayerMP().getEyePosition(1);
                const vecParticle = new Vector(x + (x - vecEyes.field_72450_a), y + (y - vecEyes.field_72448_b), z + (z - vecEyes.field_72449_c)).toMC();
                const castResult = World.getWorld().func_72933_a(vecEyes, vecParticle);
                if(!castResult) return;
                if(!this.particleSpawend && type === "CRIT" && MathUtils.getDistanceToPlayerEyes(Utils.convertToVector(castResult.field_72307_f)).distance < 4.5 && Math.abs(x - center.x) < 0.7 && Math.abs(y - center.y) < 0.7 && Math.abs(z - center.z) < 0.7 && castResult.func_178782_a().equals(this.current.pos.toMCBlock())) {
                    this.current.point = new Vector(x, y, z);
                    this.particleSpawend = true;
                    Rotations.rotateTo(this.current.point);
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

        registerEventSB("onspeedboost", () => {
            this.speedBoost = true;
            this.boostCounter = 0;
        })

        registerEventSB("speedboostcooldown", () => {
            this.speedBoost = false;
        })

        registerEventSB("speedboostgone", () => {
            this.speedBoost = false;
        })

        registerEventSB("speedboostready", () => {
            this.useSpeedBoost = true;
        })

        register("worldUnload", () => {
            this.speedBoost = false;
            this.useSpeedBoost = false;
            this.boostCounter = 1200;
        })
    }

    toggle(type, ...args) {
        this.Enabled = !this.Enabled;
        this.type = type;
        if(this.type === this.MACROTYPES.MININGBOT) this.sendMacroMessage(this.Enabled ? "&aEnabled": "&cDisabled");
        if(this.Enabled) {
            this.previous = [];
            this.empty = false;
            this.current = null;
            switch(this.type) {
                case this.MACROTYPES.MININGBOT:
                    MouseUtils.unGrabMouse();
                    this.whitelist = this.getMiningBlocks(ModuleManager.getSetting(this.ModuleName, "Mining Target"));
                    let items = MiningUtils.getDrills();
                    this.drill = items.drill;
                    this.bluecheese = items.blueCheese ?? items.drill;
                    if(!this.drill) return this.stopBot("You are missing a mining item in your hotbar!", true);
                    this.state = this.MACROSTATES.WAITING;
                    new Thread(() => {
                        this.miningSpeed = MiningUtils.getMiningSpeed(this.drill.slot, this.speedBoost);
                        if(this.miningSpeed === -1) return this.stopBot(null, true);
                        Client.scheduleTask(2, () => {this.state = this.MACROSTATES.MINING});
                    }).start();
                    break;
                case this.MACROTYPES.COMMISSION:
                    this.whitelist = this.getMiningBlocks("Mithril");
                    this.titanium = args[0];
                    this.miningSpeed = args[1];
                    this.drill = args[2];
                    this.bluecheese = args[3];
                    Player.setHeldItemIndex(this.drill.slot);
                    Client.scheduleTask(1, () => {this.state = this.MACROSTATES.MINING});
                    break;
                case this.MACROTYPES.GEMSTONE:
                    this.whitelist = this.getMiningBlocks("Gemstone");
                    this.drill = args[0];
                    this.bluecheese = args[1];
                    this.blocks = this.getVein(this.getPlatform(!args[2], args[3]), args[3]);
                    this.miningSpeed = args[4];
                    this.preset = args[5];
                    if(this.preset) this.tickSpeed = {withoutmsb: args[6], msb: args[7]};
                    this.lowPing = args[8];
                    this.blocksInTheWay = [];
                    RaytraceUtils.rayTraceBetweenPoints([args[3].x + 0.5, args[3].y + 2.54, args[3].z + 0.5], [args[9].x + 0.5, args[9].y + 0.5, args[9].z + 0.5]).forEach(point => this.blocksInTheWay.push(new BlockPos(point[0], point[1], point[2])));
                    this.sides.unshift([0.5, 0.5, 0.5]);
                    Player.setHeldItemIndex(this.drill.slot);
                    Client.scheduleTask(1, () => {this.state = this.MACROSTATES.MINING});
                    break;
                case this.MACROTYPES.TUNNEL:
                    this.whitelist = this.getMiningBlocks("Tunnels");
                    this.drill = args[0];
                    this.bluecheese = args[1];
                    this.blocks = this.getVein(args[2]);
                    let result = this.getStrafeLocations(this.blocks);
                    this.strafeLocations = result.locations;
                    this.blocks = this.blocks.filter(pos => this.strafeLocations.some(loc => MathUtils.getDistance(loc.add(0, 2, 0), pos).distance < 4.5));
                    this.strafeYaw = result.yaw;
                    this.miningSpeed = args[3];
                    this.gemstoneCommission = args[4];
                    Player.setHeldItemIndex(this.drill.slot);
                    Client.scheduleTask(1, () => {this.state = this.MACROSTATES.MINING});
                    break;
            }
        } else {
            this.stopBot();
            switch(this.type) {
                case this.MACROTYPES.MININGBOT:
                    break;
                case this.MACROTYPES.COMMISSION:
                    break;
                case this.MACROTYPES.GEMSTONE:
                    break;
                case this.MACROTYPES.TUNNEL:
                    break;
            }
        }
    }

    getCurrentBlockDamage() {
        let progress = this.damagedBlocks.get(this.mc.field_71438_f);
        let p = 0;
        progress.forEach((prog, penis) => {
            if(p != 0) return;
            if(new BlockPos(penis.func_180246_b()).equals(this.current.pos)) p = penis.func_73106_e();
        })
        return p;
    }

    setShift(down) {
        if(this.pressShiftCooldown.reachedRandom()) {
            MovementHelper.setKey("shift", down);
            this.pressShiftCooldown.reset();
            this.pressShiftCooldown.setRandomReached(100, 300);
        }
    }

    /**
     * @param {Number} swap1
     * @param {Number} click
     * @param {Number} swap2
     */
    setSpeedBoostActions(swap1, click, swap2) {
        this.speedBoostTicks = {
            swap1: swap1,
            click: swap1 + click,
            swap2: swap1 + click + swap2
        }
    }

    /**
     * @param {Boolean} singleBlock
     * @param {BlockPos} platformCenter
     * @returns {Array<Vector>}
     */
    getPlatform(singleBlock, platformCenter) {
        let platform = [];
        let min = singleBlock ? 0 : -1;
        let max = singleBlock ? 1 : 2;
        for(let x = min; x <= max; x++) {
            for(let z = min; z <= max; z++) {
                platform.push(platformCenter.add(x, 2.54, z));
            }
        }
        return platform;
    }

    /**
     * @param {Array<vec>|BlockPos} platform
     * @param {BlockPos} platformCenter
     * @returns {Array<BlockPos>}
     */
    getVein(platform, platformCenter=[]) {
        let scanned = new Map();
        let closestSet = new Map();
        let playerPos = this.type === this.MACROTYPES.TUNNEL ? platform : Utils.convertToVector(Player.asPlayerMP().getEyePosition(1)).getBlockPos();
        let veins = [];
        for(let y = -3; y <= 7; y++) {
            for(let x = -2; x <= 2; x++) {
                for(let z = -2; z <= 2; z++) {
                    let pos = playerPos.add(x, y, z);
                    if(!this.containsBlock(World.getBlockAt(pos))) continue;
                    let openSet = new Map();
                    let vein = [];
                    this.getNeighbours(pos, openSet).forEach(neighbour => openSet.set(Utils.blockCode(neighbour), neighbour));
                    while(openSet.size != 0.0) {
                        openSet.forEach((pos, hash) => {
                            openSet.delete(hash);
                            closestSet.set(hash, true);
                            if(scanned.has(hash)) return;
                            scanned.set(hash, true);
                            vein.push(pos);
                            this.getNeighbours(pos, closestSet).forEach(neighbour => openSet.set(Utils.blockCode(neighbour), neighbour));
                        })
                    }
                    veins.push(vein);
                }
            }
        }
        if(veins.length === 0.0) return [];
        if(this.type === this.MACROTYPES.GEMSTONE) {
            veins = veins.map(vein => vein.filter(pos => this.canBeReached(pos, platform, platformCenter))).sort((vein1, vein2) => vein2.length - vein1.length);
            let combinedVeins = veins[0];
            if(combinedVeins === undefined) return [];
            veins.forEach((vein, i) => {
                if(i === 0) return;
                vein.forEach(pos => combinedVeins.push(pos));
            })
            return combinedVeins;
        } else if(this.type === this.MACROTYPES.TUNNEL) {
            return veins.sort((vein1, vein2) => vein2.length - vein1.length)[0];
        }
    }

    /**
     * @param {Array<BlockPos>} vein
     */
    getStrafeLocations(vein) {
        const sides = {
            NORTH: {value: 0, pos: new Vec3i(0,0,-1), yaw: 0.0},
            SOUTH: {value: 0, pos: new Vec3i(0,0,1), yaw: 180.0},
            EAST: {value: 0, pos: new Vec3i(1,0,0), yaw: 90.0},
            WEST: {value: 0, pos: new Vec3i(-1,0,0), yaw: -90.0}
        };
        vein.forEach((veinpos) => {
            let openSides = this.getOpenSides(veinpos);
            for (key in openSides) if(openSides[key]) sides[key].value += 1;
        })
        let sideKey = Object.keys(sides).reduce((a, b) => sides[a].value > sides[b].value ? a : b);
        let sidepos = sides[sideKey].pos;
        let locations = [];
        for(let i = 0; i < 2; i++) {
            vein.forEach(pos => {
                for(let y = 0; y >= -3; y--) {
                    let strafepos = pos.add(sidepos).add(0, y, 0);
                    if(Utils.isWalkable(strafepos) && !this.containsBlock(World.getBlockAt(strafepos))) {
                        locations.push(strafepos);
                        break;
                    }
                }
            })
            if(i === 0) {
                vein = locations;
                locations = [];
            }
        }
        return {locations: locations, yaw: sides[sideKey].yaw};
    }

    getOpenSides(pos) {
        return {
            NORTH: World.getBlockAt(pos.add(0,0,-1)).type.getID() === 0.0,
            SOUTH: World.getBlockAt(pos.add(0,0,1)).type.getID() === 0.0,
            EAST: World.getBlockAt(pos.add(1,0,0)).type.getID() === 0.0,
            WEST: World.getBlockAt(pos.add(-1,0,0)).type.getID() === 0.0
        }
    }

    isNearVein() {
        let playerPos = new BlockPos(Math.floor(Player.getX()), Math.round(Player.getY()), Math.floor(Player.getZ()));
        let ids = [1,7,95,160,174];
        for(let x = -1; x <= 1; x++) {
            for(let z = -1; z <= 1; z++) {
                let block = World.getBlockAt(playerPos.add(x, 0, z))
                if(this.containsBlock(block) || (ids.indexOf(block.type.getID()) != -1)) return true;
            }
        }
        return false;
    }

    canBeReached(pos, platform, center) {
        let posCenter = new Vector(pos).add(0.5, 0.5, 0.5);
        let maxDistance = 4.5;
        return platform.some(vector => MathUtils.getDistance(vector, posCenter).distance < maxDistance && (MathUtils.getDistance(posCenter, center).distanceFlat >= 2.0 || vector.y - posCenter.y < 3.0));
    }

    /**
     * @param {BlockPos} parentPos
     * @param {Map} closestSet
     * @returns {Array<BlockPos>}
     */
    getNeighbours(parentPos, closestSet) {
        let neighbours = []
        for(let x = -1; x <= 1; x++) {
            for(let z = -1; z <= 1; z++) {
                for(let y = -1; y <= 1; y++) {
                    let pos = parentPos.add(x, y, z);
                    if(pos.equals(parentPos)) continue;
                    if(closestSet.has(pos.hashCode())) continue;
                    if(!this.containsBlock(World.getBlockAt(pos))) continue;
                    neighbours.push(pos);
                }
            }
        }
        return neighbours;
    }

    /**
     * @returns {MineTarget|null}
     */
    getNextTarget() {
        let playerPos = Utils.convertToVector(Player.asPlayerMP().getEyePosition(1)).getBlockPos();
        let miningTargets = [];
        let target = null;
        let lowestCost = 0;
        if(this.type === this.MACROTYPES.MININGBOT || this.type === this.MACROTYPES.COMMISSION) {
            for(let x = -6; x <= 6; x++) {
                for(let z = -6; z <= 6; z++) {
                    for(let y = -6; y <= 6; y++) {
                        if(x === 0 && z === 0 && y <= 0) continue;
                        let pos = playerPos.add(x, y, z);
                        let block = World.getBlockAt(pos);
                        if((this.previous[0] && this.previous[0].equals(pos)) || (this.previous[1] && this.previous[1].equals(pos))) continue;
                        if(!this.containsBlock(block)) continue;
                        let hit = this.canSeePos(pos);
                        if(hit.result) miningTargets.push(new MineTarget(block, hit.point));
                    }
                }
            }
            if(miningTargets.length === 0.0) return null;
            if(this.type === this.MACROTYPES.COMMISSION && this.titanium) {
                let titanium = miningTargets.filter(miningTarget => miningTarget.blockid === 1 && miningTarget.metadata === 4).filter(miningTarget => Math.abs(MathUtils.calculateAngles(miningTarget.point).yaw) < 90);
                if(titanium.length != 0.0) miningTargets = titanium;
            }
            miningTargets.forEach(mineTarget => {
                let distance = MathUtils.getDistanceToPlayerEyes(mineTarget.point).distance;
                let angles = MathUtils.calculateAngles(mineTarget.point);
                let cost = (distance * 3) + (Math.abs(angles.yaw) + Math.abs(angles.pitch));
                if(!target || cost < lowestCost) {
                    target = mineTarget;
                    lowestCost = cost;
                }
            })
        }
        else if(this.type === this.MACROTYPES.GEMSTONE) {
            if(this.blocks.length === 0.0) return null;
            this.blocks = this.blocks.filter(pos => this.containsBlock(World.getBlockAt(pos)));
            if(this.lowPing) {
                let across = this.getBlocksAcross();
                let foccused = [];
                across.forEach(acros => {if(this.blocks.some(blockpos => blockpos.equals(acros.pos) && ((!this.previous[0]?.equals(acros.pos) && !this.previous[1]?.equals(acros.pos)) || this.blocksInTheWay.some(pos => pos.equals(acros.pos))))) foccused.push(acros)});
                if(foccused.length > 0) target = new MineTarget(World.getBlockAt(foccused[0].pos), Utils.convertToVector(foccused[0].hit));
            }
            if(!target) {
                this.blocks.forEach(pos => {
                    if((this.previous[0]?.equals(pos) || this.previous[1]?.equals(pos)) && !this.blocksInTheWay.some(poss => poss.equals(pos))) return;
                    let result = this.canSeePos(pos, false);
                    if(result.result) miningTargets.push(new MineTarget(World.getBlockAt(pos), result.point));
                })
                miningTargets.forEach(miningTarget => {
                    let angles = MathUtils.calculateAngles(miningTarget.point);
                    let cost = (MathUtils.getDistanceToPlayerEyes(miningTarget.point).distance * 3) + (Math.abs(angles.yaw) + Math.abs(angles.pitch));
                    if(!target || cost < lowestCost) {
                        target = miningTarget;
                        lowestCost = cost;
                    }
                })
            }
        }
        else if(this.type === this.MACROTYPES.TUNNEL) {
            if(this.blocks.length === 0.0) return null;
            this.blocks = this.blocks.filter(pos => this.containsBlock(World.getBlockAt(pos)));
            this.blocks.forEach(pos => {
                if((this.previous[0] && this.previous[0].equals(pos)) || (this.previous[1] && this.previous[1].equals(pos))) return;
                if(pos.y - (Player.getY() + 1.54) > 2.5) return;
                let hit = this.canSeePos(pos, false);
                if(hit.result) miningTargets.push(new MineTarget(World.getBlockAt(pos), hit.point));
            })
            miningTargets.forEach(miningTarget => {
                let distance = MathUtils.getDistanceToPlayerEyes(miningTarget.point).distance;
                let angles = MathUtils.calculateAngles(miningTarget.point);
                let cost = (distance * 30) + (Math.abs(angles.yaw) + Math.abs(angles.pitch));
                if(!target || cost < lowestCost) {
                    target = miningTarget;
                    lowestCost = cost;
                }
            })
        }
        if(target && this.type != this.MACROTYPES.MININGBOT && this.type != this.MACROTYPES.COMMISSION) {
            let angles = MathUtils.calculateAngles(target.point);
            if(this.type === this.MACROTYPES.GEMSTONE && this.inTheWayIncludesBlocks()) return target;
            if(this.blocks.length <= 3.0 && (Math.abs(angles.yaw) + Math.abs(angles.pitch)) > 120) target = null;
        }
        this.miningTargets = miningTargets;
        return target;
    }

    inTheWayIncludesBlocks() {
        for(let i = 0; i < this.blocks.length; i++) {
            let block = this.blocks[i];
            for(let j = 0; j < this.blocksInTheWay.length; j++) {
                if(block.equals(this.blocksInTheWay[j])) return true;
            }
        }
        return false;
    }

    getBlocksAcross() {
        const INTERVAL = 0.1;
        const PLAYER_REACH = 4.5;
        // call this once whenever you'd usually start tick gliding ig?
        let lookvec = Player.getPlayer().func_70040_Z() ;
        let vecX = lookvec.field_72450_a;
        let vecY = lookvec.field_72448_b;
        let vecZ = lookvec.field_72449_c;

        let pX = Player.getX();
        let pY = Player.getY() + Player.getPlayer().func_70047_e();
        let pZ = Player.getZ();
        let tracedPositions = [];
        for (i = 0; i <= Math.ceil(PLAYER_REACH / INTERVAL); i++) {
            let tX = pX + (vecX * (INTERVAL * i))
            let tY = pY + (vecY * (INTERVAL * i))
            let tZ = pZ + (vecZ * (INTERVAL * i))

            let pos = new BlockPos(Math.floor(tX), Math.floor(tY), Math.floor(tZ));
            if(!tracedPositions.some(tracedpos => tracedpos.pos.equals(pos))) {
                tracedPositions.push({hit: [tX, tY, tZ], pos: pos});
            }
        }
        return tracedPositions;
    }

    /**
     * @param {BlockPos} pos
     */
    canSeePos(pos, reachCheck=true) {
        for(let i = 0; i < this.sides.length; i++) {
            let side = this.sides[i];
            let point = [pos.x + side[0], pos.y + side[1], pos.z + side[2]];
            let vector = new Vector(point)
            let castResult = World.getWorld().func_147447_a(Player.getPlayer().func_174824_e(1), vector.toMC(), false, false, true)
            if(castResult && castResult.func_178782_a().equals(pos.toMCBlock()) && (!reachCheck || vector.toMC().func_72438_d(Player.getPlayer().func_174824_e(1)) < 4.5)) {
                return { result: true, point: vector };
            }
        }
        return { result: false };
    }

    getMiningBlocks(settingname) {
        let blocks = [];
        switch(settingname) {
            case "Gold":
                blocks.push(new MiningBlock(41, 0));
                break;
            case "Mithril":
                blocks.push(new MiningBlock(35, 7));
                blocks.push(new MiningBlock(159, 9));
                blocks.push(new MiningBlock(168, 0));
                blocks.push(new MiningBlock(168, 1));
                blocks.push(new MiningBlock(168, 2));
                blocks.push(new MiningBlock(35, 3));
                blocks.push(new MiningBlock(1, 4));
                break;
            case "Gemstone":
                if(this.type === this.MACROTYPES.MININGBOT) this.resetGemstones();
                for(let key in this.GEMSTONEBLOCKS) {
                    let object = this.GEMSTONEBLOCKS[key];
                    if(object.allowed) {
                        blocks.push(new MiningBlock(95, object.metadata));
                        blocks.push(new MiningBlock(160, object.metadata));
                    }
                }
                break;
            case "Tunnels":
                if(this.type === this.MACROTYPES.MININGBOT) this.resetTunnel();
                if(this.TUNNELBLOCKS.glacite) blocks.push(new MiningBlock(174, 0));
                if(this.TUNNELBLOCKS.tungsten) {
                    blocks.push(new MiningBlock(82, 0));
                    blocks.push(new MiningBlock(4, 0));
                }
                if(this.TUNNELBLOCKS.umber) {
                    blocks.push(new MiningBlock(172, 0));
                    blocks.push(new MiningBlock(181, 8));
                    blocks.push(new MiningBlock(159, 12));
                }
                if(this.GEMSTONEBLOCKS.onyx.allowed) {
                    blocks.push(new MiningBlock(95, this.GEMSTONEBLOCKS.onyx.metadata));
                    blocks.push(new MiningBlock(160, this.GEMSTONEBLOCKS.onyx.metadata));
                }
                if(this.GEMSTONEBLOCKS.citrine.allowed) {
                    blocks.push(new MiningBlock(95, this.GEMSTONEBLOCKS.citrine.metadata));
                    blocks.push(new MiningBlock(160, this.GEMSTONEBLOCKS.citrine.metadata));
                }
                if(this.GEMSTONEBLOCKS.peridot.allowed) {
                    blocks.push(new MiningBlock(95, this.GEMSTONEBLOCKS.peridot.metadata));
                    blocks.push(new MiningBlock(160, this.GEMSTONEBLOCKS.peridot.metadata));
                }
                if(this.GEMSTONEBLOCKS.aquamarine.allowed) {
                    blocks.push(new MiningBlock(95, this.GEMSTONEBLOCKS.aquamarine.metadata));
                    blocks.push(new MiningBlock(160, this.GEMSTONEBLOCKS.aquamarine.metadata));
                }
                break;
            case "Custom":
                break;
        }
        return blocks;
    }

    /**
     * This function set which gemstones are allowed and which aren't
     * @param {Boolean} ruby
     * @param {Boolean} amber
     * @param {Boolean} sapphire
     * @param {Boolean} jade
     * @param {Boolean} amethyst
     * @param {Boolean} opal
     * @param {Boolean} topaz
     * @param {Boolean} jasper
     * @param {Boolean} onyx
     * @param {Boolean} aquamarine
     * @param {Boolean} citrine
     * @param {Boolean} peridot
     */
    setGemstoneTypes(ruby, amber, sapphire, jade, amethyst, opal, topaz, jasper, onyx, aquamarine, citrine, peridot) {
        this.GEMSTONEBLOCKS["ruby"].allowed = ruby;
        this.GEMSTONEBLOCKS["amber"].allowed = amber;
        this.GEMSTONEBLOCKS["sapphire"].allowed = sapphire;
        this.GEMSTONEBLOCKS["jade"].allowed = jade;
        this.GEMSTONEBLOCKS["amethyst"].allowed = amethyst;
        this.GEMSTONEBLOCKS["opal"].allowed = opal;
        this.GEMSTONEBLOCKS["topaz"].allowed = topaz;
        this.GEMSTONEBLOCKS["jasper"].allowed = jasper;
        this.GEMSTONEBLOCKS["onyx"].allowed = onyx;
        this.GEMSTONEBLOCKS["aquamarine"].allowed = aquamarine;
        this.GEMSTONEBLOCKS["citrine"].allowed = citrine;
        this.GEMSTONEBLOCKS["peridot"].allowed = peridot;
    }

    resetGemstones() {
        for(let key in this.GEMSTONEBLOCKS) this.GEMSTONEBLOCKS[key].allowed = true;
    }

    setTunnelTypes(glacite, tungsten, umber) {
        this.TUNNELBLOCKS["glacite"] = glacite;
        this.TUNNELBLOCKS["tungsten"] = tungsten;
        this.TUNNELBLOCKS["umber"] = umber;
    }

    resetTunnel() {
        for(let key in this.TUNNELBLOCKS) this.TUNNELBLOCKS[key] = true;
    }

    isEmpty() {
        return this.empty;
    }

    /**
     * @param {Block} block
     */
    containsBlock(block) {
        let metatdata = block.getMetadata();
        let blockid = block.type.getID();
        return this.whitelist.some(miningBlock => miningBlock.equalsNumbers(blockid, metatdata));
    }

    stopBot(msg=null, disableMessage=false) {
        if(msg) this.sendMacroMessage(msg);
        if(disableMessage) this.sendMacroMessage("&cDisabled");
        this.Enabled = false;
        if(this.type === this.MACROTYPES.MININGBOT) MouseUtils.reGrabMouse();
        if(this.type === this.MACROTYPES.GEMSTONE) this.sides.shift();
        MovementHelper.stopMovement();
        MovementHelper.setKey("shift", false);
        MovementHelper.setKey("leftclick", false);
        Rotations.stopRotate();
    }

    sendMacroMessage(msg) {
        ChatUtils.sendModMessage(this.ModuleName + ": " + msg);
    }
}

class MiningBlock {
    constructor(blockid, metadata) {
        this.blockid = blockid;
        this.metadata = metadata;
    }

    /**
     * @param {Block} block
     * @returns {Boolean}
     */
    equals(block) {
        return block.getMetadata() === this.metadata && block.type.getID() === this.blockid;
    }

    /**
     * this function is created to save performance
     * @param {Number} blockid
     * @param {Number} metadata
     * @returns {Boolean}
     */
    equalsNumbers(blockid, metadata) {
        return blockid === this.blockid && metadata === this.metadata;
    }
}

class MineTarget {
    /**
     * @param {Block} block
     * @param {vec} point
     */
    constructor(block, point) {
        this.pos = block.pos;
        this.point = point;
        this.metadata = block.getMetadata();
        this.blockid = block.type.getID();
    }
}

class MineVein {
    /**
     * @param {Array<BlockPos} positions
     */
    constructor(positions) {
        this.positions = positions;
    }
}

global.export.MiningBot = new miningBot();