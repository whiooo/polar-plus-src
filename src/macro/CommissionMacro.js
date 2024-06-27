import Skyblock from "BloomCore/Skyblock";
import Async from "Async"
let { SettingSelector, SettingSlider, SettingToggle, ConfigModuleClass, ModuleToggle, getKeyBind, ModuleManager } = global.settingSelection
let { ChatUtils, NumberUtils, MathUtils, TimeHelper, Rotations, ItemUtils, aStarPolar, MovementHelper, MiningUtils, GuiInventory } = global.export
let { S08PacketPlayerPosLook, Vec3, RenderUtils, Vector, PolarPathFinder, Utils, S2DPacketOpenWindow, S30PacketWindowItems, overlayManager, MouseUtils, mc, registerEventSB, MiningBot } = global.export
global.modules.push(
    new ConfigModuleClass(
        "Commission Macro",
        "Mining",
        [
            new SettingSlider("Weapon Slot (Goblin)", 1, 1, 9),
            new SettingToggle("Pigeonless", true)
        ],
        [
            "Does Dwarven Mines commissions without an etherwarp item"
        ]
    )
)

class commissionMacro {
    constructor() {
        this.ModuleName = "Commission Macro"
        this.Enabled = false

        // Create Overlay
        this.OVERLAY_ID = "COMMISSION"
        overlayManager.AddOverlay(this.ModuleName, this.OVERLAY_ID)

        this.key = getKeyBind("Commission Macro","Polar Client - Mining", this)
   

        this.MacroStates = {
            WAITING: 0,
            MINING: 1,
            WALKINGTOPOINTS: 2,
            WALKINGTOCOMM: 4,
            AOTVING: 5,
            KILLING: 6,
            WALKINGSLAYERROUTE: 7,
            WALKINGTOSLAYERMOB: 8,
            WARPINGFORGE: 9,
            CLAIMINGCOMM: 10,
            GOBLINSLAYER: 11,
            ICEWALKERSLAYER: 12,
            TRAVERSING: 13,
            TRYCLAIM: 14,
            SWAPPINGPICKAXE: 15,
            REFUELING: 16,
            SELLING: 17
        }
        this.state = this.MacroStates.WAITING

        this.MacroActions = {
            WAITING: 0,
            AOTVING: 1,
            HITTING: 2,
            WALKING: 3,
            WAITINGONS08: 4,
            GETTINGCOMM: 5,
            MOVINGTOLOCATION: 6,
            SCANNINGPICKAXE: 7,
            PUTTINGPICKAXE: 8,
            WAITINGPUTTINGPICKAXE: 9,
            WAITCHECKINGPICKAXE: 10,
            CHECKINGPICKAXE: 11,
            WAITSCANNINGPICKAXE: 12,
            NPCINTERACTSELL: 14,
            NPCSELLING: 15,
            SCANPATH: 16,
            SCANNINGPATH: 17,
            MOVE: 18,
            WARP: 19
        }
        this.action = this.MacroActions.WAITING

        this.routeTarget
        this.newCommission
        
        this.aspectOfTheVoid
        this.drill
        this.goblinSlot

        this.npcClaim = [
            [
                new Point(-3,157,-51,true), new Point(0,157,-29,true),
                new Point(9,154,-19,true), new Point(20,149,-5,true),
                new Point(41,135,15,false)
            ],
            [
                new Point(10,150,-16,true), new Point(13,145,-11,false),
                new Point(27,142,0,false), new Point(41,136,17,false)
            ]
        ]

        // 15.5 70.0 -71.8125
        this.npcSell = [
            new Point(-1,69,-71,false), new Point(14,69,-72,false)
        ]

        this.npcRefuel = [
            new Point(-2,149,-69,false), new Point(-5,147,-60,false),
            new Point(-4,150,-45,true), new Point(-5,147,-36,false),
            new Point(-7,145,-21,false)
        ]

        this.Commissions = [
            new Commission(false, false, new Data(["Royal Mines Titanium","Royal Mines Mithril"], {
                splitRoute: [
                    new Point(74,140,37,true), new Point(107,157,41,true),
                    new Point(130,154,31,false)
                ],
                routes: {
                    route1: [
                        new Point(166,150,35,false), new Point(177,150,52,false),
                        new Point(174,150,77,false), new Point(167,149,88,false)
                    ],
                    route2: [
                        new Point(145,152,34,false), new Point(160,150,34,false),
                        new Point(165,168,23,true), new Point(169,161,17,false)
                    ]
                },
                fromForge: false
            })),
            new Commission(false, false, new Data(["Cliffside Veins Mithril","Cliffside Veins Titanium"], {
                splitRoute: [
                    new Point(37,128,33,false), new Point(31,128,39,false)
                ],
                routes: {
                    route1: [
                        new Point(25,129,32,false), new Point(26,129,26,false) 
                    ],
                    route2: [
                        new Point(-1,128,50,false), new Point(-17,127,40,false),
                        new Point(-13,127,32,false)
                    ]
                },
                fromForge: false
            })),
            new Commission(false, false, new Data(["Upper Mines Titanium","Upper Mines Mithril"], {
                splitRoute: [
                    new Point(-6,159,-12,true), new Point(-49,188,-34,true),
                    new Point(-58,164,-40,true), new Point(-73,158,-39,false),
                    new Point(-93,159,-56,false), new Point(-112,167,-69,false)
                ],
                routes: {
                    route1: [
                        new Point(-112,166,-75,false)
                    ],
                    route2: [
                        new Point(-122,171,-71,false), new Point(-124,170,-76,false)
                    ],
                    route3: [
                        new Point(-122,171,-71,false), new Point(-134,173,-60,false),
                        new Point(-123,176,-51,false), new Point(-115,181,-63,false),
                        new Point(-95,187,-67,false), new Point(-76,188,-71,false)
                    ]
                },
                fromForge: true
            })),
            new Commission(false, false, new Data(["Rampart's Quarry Titanium","Rampart's Quarry Mithril","Titanium Miner","Mithril Miner"], {
                splitRoute: [
                    new Point(-6,159,-12,true), new Point(-49,188,-34,true),
                    new Point(-58,164,-40,true), new Point(-73,158,-39,false),
                ],
                routes: {
                    route1: [
                        new Point(-75,181,-54,true), new Point(-70,170,-60,false)
                    ],
                    route2: [
                        new Point(-90,154,-32,false), new Point(-106,150,-19,false),
                        new Point(-114,149,-35,false)
                    ],
                    route3: [
                        new Point(-96,152,-27,false), new Point(-107,148,-5,false),
                        new Point(-91,148,-11,false), new Point(-88,147,-14,false)
                    ]
                },
                fromForge: true
            })),
            new Commission(false, false, new Data(["Lava Springs Mithril","Lava Springs Titanium"], {
                splitRoute: [
                    new Point(5,148,-35,true), new Point(9,144,-24,false),
                    new Point(32,203,-9,true), new Point(43,198,-11,true),
                    new Point(43,197,-13,false)
                ],
                routes: {
                    route1: [
                        new Point(62,197,-16,false), new Point(69,220,-27,true),
                        new Point(70,209,-29,false)
                    ],
                    route2: [
                        new Point(55,196,-17,false), new Point(50,198,-26,false)
                    ],
                    route3: [
                        new Point(56,219,-29,true), new Point(53,214,-29,false)
                    ]
                },
                fromForge: true
            })),
            new Commission(true, false, new Data(["Goblin Slayer"], {
                splitRoute: [
                    new Point(-3,128,68,true), new Point(0,128,117,false),
                    new Point(0,128,149,false), new Point(-28,128,162,false),
                    new Point(-66,137,152,false), new Point(-86,140,147,false),
                    new Point(-105,145,138,false), new Point(-125,147,149,false),
                    new Point(-137,144,142,false)
                ],
                fromForge: false
            })),
            new Commission(true, false, new Data(["Glacite Walker Slayer"], {
                splitRoute: [
                    new Point(-3,128,68,true), new Point(0,128,117,false),
                    new Point(0,128,149,false)
                ],
                fromForge: false
            }))
        ]
        this.commissionNames = ["Royal Mines Titanium","Royal Mines Mithril","Goblin Slayer","Glacite Walker Slayer","Lava Springs Mithril","Lava Springs Titanium","Rampart's Quarry Titanium","Rampart's Quarry Mithril","Titanium Miner","Mithril Miner","Upper Mines Titanium","Upper Mines Mithril","Cliffside Veins Mithril","Cliffside Veins Titanium"]
        
        this.trashItems = [
            "Mithril",
            "Rune", 
            "Glacite",
            "Goblin"
        ]

        this.goblinNames = Utils.makeJavaArray(["Goblin ", "Weakling ", "Murderlover "])
        this.forgeTimer = new TimeHelper();
        this.travelTimer = new TimeHelper();
        this.lookTimer = new TimeHelper();
        this.mobTimer = new TimeHelper();
        this.retargetTimer = new TimeHelper();
        this.lastSeenTimer = new TimeHelper();
        this.walkTimer = new TimeHelper();
        this.interactNpc = new TimeHelper();
        this.sellTimer = new TimeHelper();
        this.claimTimer = new TimeHelper();
        this.menuCooldown = new TimeHelper();
        this.mobId = 0
        this.startedKilling = false;
        this.lastMobPosition = new BlockPos(0,0,0);
        this.mobTimer = new TimeHelper();
        this.mobWhitelist = []
        this.click = true
        this.claimCommission = false
        this.scanLocation = false
        this.canHit = false
        this.pickaxeTimer = new TimeHelper();
        this.refueling = false
        this.commissionCounter = new TimeHelper();
        this.sellingToNpc = false
        this.lastCommissionNames = ["",""];

        this.route = []
        this.routeTarget = null
        this.routeIndex = 0

        this.lookCooldown = new TimeHelper()
        this.walkToNpc = false

        this.commissionCount = 0
        this.startTime = Date.now()

        this.mobpos = null;
        register("renderWorld", () => {
            if(this.route.length > 0) {
                RenderUtils.renderCordsWithNumbers(this.route)
            }
            if(this.mobpos) RenderUtils.renderCube([this.mobpos.x, this.mobpos.y, this.mobpos.z], [0,1,0], true, 0.2, 1, 1);
        })

        // Update Commissions Overlay

        this.commissions = []
        register("step", () => {
            if (!this.Enabled) return

            try {
                let tabItems = TabList.getNames()

                let startIndex, commiecount
            
                tabItems.forEach((item, index) => {
                    if(item?.removeFormatting()?.startsWith("Commissions")) startIndex = index
                })
            
                for (i = 1; i <= 5; i++){
                    if (tabItems[startIndex + i + 1].removeFormatting() === "") {
                        commiecount = i
                        break
                    }
                }
            
                this.commissions = []
                for (i = 1; i <= commiecount; i++) {
                    let c = tabItems[startIndex + i]
                    let n = c.removeFormatting().split(":")
                    let p
                    if (n[1].includes("DONE")){
                        p = 1
                    } else {
                        p = parseFloat(n[1].replace(" ", "").replace("%", "")) / 100
                    }

                    this.commissions.push({
                        name: n[0],
                        progress: p
                    })


                    overlayManager.AddOverlayBar(this.OVERLAY_ID, i.toString(), p, n[0])
                }
            } catch (e) {}

            overlayManager.UpdateOverlayLine(this.OVERLAY_ID, "TIME", `Session Time: ${NumberUtils.timeSince(this.startTime)}`)
        }).setDelay(1)

        register("tick", () => {
            if(this.Enabled) {
                if(this.state === this.MacroStates.TRAVERSING) {
                    // lobby -> mines -> forge
                    // mines -> forge
                    // hub -> forge
                    let lobby = [-150,69,147]
                    let mines = [-49,200,-122]
                    let hub = [-3,70,-70]
                    if(MathUtils.distanceToPlayer(lobby).distance < 10.0) {
                        if(this.travelTimer.hasReached(5000)) {
                            ChatLib.say("/skyblock")
                            this.travelTimer.reset()
                        }
                        return
                    }
                    if(MathUtils.distanceToPlayer(mines).distance < 10.0) {
                        if(this.travelTimer.hasReached(5000)) {
                            if(this.sellingToNpc) {
                                ChatLib.say("/warp hub")
                                this.travelTimer.reset()
                                return
                               }
                            ChatLib.say("/warp forge")
                            this.state = this.MacroStates.WARPINGFORGE
                            this.forgeTimer.reset()
                            this.travelTimer.reset()
                        }
                        return
                    }
                    if(MathUtils.distanceToPlayer(hub).distance < 10.0) {
                        if(this.travelTimer.hasReached(5000)) {
                            if(this.sellingToNpc) {
                                this.state = this.MacroStates.WALKINGTOPOINTS
                                this.action = this.MacroActions.SCANPATH
                                this.clearRoute()
                                this.route = this.npcSell
                                MovementHelper.setCooldown()
                                this.walkTimer.reset()
                                this.travelTimer.reset() 
                                return
                            }
                            ChatLib.say("/warp forge")
                            this.state = this.MacroStates.WARPINGFORGE
                            this.forgeTimer.reset()
                            this.travelTimer.reset()
                        }
                        return
                    }
                    this.travelTimer.reset()
                }

                if(this.state === this.MacroStates.WARPINGFORGE) {
                    // forge spawn 0.5 149 -68.5
                    if(this.forgeTimer.hasReached(1000)) {
                        this.state = this.MacroStates.WALKINGTOPOINTS
                        this.action = this.MacroActions.SCANPATH
                        this.walkTimer.reset()
                        MovementHelper.setCooldown()
                        if(this.refueling) {
                            this.clearRoute()
                            this.route = this.npcRefuel
                        } else if(this.claimCommission) {
                            // sets the route that gets used to walk across
                            this.clearRoute()
                            if(this.pigeonless) this.route = this.npcClaim[Math.floor(Math.random()*this.npcClaim.length)]
                            else this.route = []
                            this.claimCommission = false
                        }
                        ChatUtils.sendModMessage("Warped to the forge")
                        this.walkTimer.reset();
                        this.newCommission.mining = false;
                        return
                    }
                    if(MathUtils.distanceToPlayerFeet([0.5,149, -68.5]).distance < 3.0) {
                        return
                    }
                    this.forgeTimer.reset()
                }

                if(this.state === this.MacroStates.WALKINGTOPOINTS) {
                    if(Client.currentGui.getClassName() != "null") {
                        return MovementHelper.stopMovement();
                    }
                    Player.setHeldItemIndex(this.aspectOfTheVoid.slot)
                    if(this.action === this.MacroActions.SCANPATH) {
                        this.routeTarget = this.route[this.routeIndex]
                        this.action = this.MacroActions.WARP
                        this.walkTimer.reset()
                        Utils.makeRandomPitch(5.0, 15.0)
                        Rotations.stopRotate()
                        if(this.routeTarget === undefined) {
                            this.processLastPoint();
                            MovementHelper.stopMovement();
                            return
                        }
                    }
                    if(this.routeTarget.etherwarp) {
                        return
                    }
                    else if(this.routeTarget.aotv) {
                        MovementHelper.stopMovement()
                        MovementHelper.setKey("space", false)
                        let targetPoint = this.route[this.routeIndex]
                        let targetVector = new Vector(targetPoint.x + 0.5, targetPoint.y + 0.5, targetPoint.z + 0.5)
                        if(MathUtils.getDistanceToPlayer(targetVector).distance < 8.0) {
                            this.routeIndex++
                            this.action = this.MacroActions.SCANPATH
                        } else if(this.action === this.MacroActions.WARP) {
                            Rotations.rotateTo(targetVector, 5.0)
                            Rotations.onEndRotation(() => {
                                Client.scheduleTask(1, () => {
                                    ItemUtils.rightClickPacket();
                                })
                            })
                            this.action = this.MacroActions.WAITINGONS08
                        }
                    } else {
                        let vector = new Vector(this.routeTarget.x, this.routeTarget.y, this.routeTarget.z);
                        let point = vector.add(0.5, 0.5, 0.5);
                        let range = MathUtils.getDistanceToPlayer(point);
                        if(range.distance < 2.5 && range.distanceFlat < 1.5) {
                            this.action = this.MacroActions.SCANPATH;
                            this.routeIndex++
                            return
                        }
                        if(!Rotations.rotate) Rotations.rotateTo([point.x, Player.getY() + 1.45, point.z], 1.0, true, Utils.getRandomPitch());
                        else Rotations.updateTargetTo([point.x, Player.getY() + 1.45, point.z], 1.0, true, Utils.getRandomPitch());
                        MovementHelper.setKey("sprint", true);
                        MovementHelper.setKeysForStraightLine(MathUtils.calculateAngles(point).yaw, true);
                        if(Player.getMotionY() > 0.0 || Math.abs(MathUtils.calculateAngles(point).yaw) > 20) MovementHelper.stopMovement(); 
                        if(this.routeIndex + 1 === this.route.length && this.newCommission.mining) {
                            MovementHelper.setKey("sprint", false);
                            if (range.distance < 8.0 && range.distanceFlat < 3.0 && (point.y - 1.5) === Math.round(Player.getY() - 1)) {
                                MovementHelper.setKey("shift", true);
                            } else {
                                MovementHelper.setKey("shift", false);
                            }
                        }
                    }

                    if(this.walkTimer.hasReached(10000)) {
                        this.sendMacroMessage("Travelling took too long.")
                        MovementHelper.stopMovement()
                        MovementHelper.setKey("shift", false)
                        this.state = this.MacroStates.TRAVERSING
                        this.newCommission = new Commission(false, true)
                        this.claimCommission = true
                        ChatLib.say("/l")
                        this.travelTimer.reset()
                    }
                }

                if(this.state === this.MacroStates.TRYCLAIM) {
                    if(this.walkToNpc) {
                        if(!Rotations.rotate) Rotations.rotateTo([42.5, 136, 22.5])
                        if(MathUtils.getDistanceToPlayer(42.5, 134.5, 22.5).distanceFlat <= 2.0) {
                            MovementHelper.stopMovement()
                            this.walkToNpc = false
                        } else {
                            MovementHelper.setKeysForStraightLine(MathUtils.calculateAngles([42.5, 136, 22.5]).yaw, false)
                        }
                    } else if(this.interactNpc.hasReached(1000)) {
                        this.interactNpc.reset()
                        if(this.interactWithNpc(42.5, 134.5, 22.5)) {   
                            this.firstCommissionCheck = true
                            this.state = this.MacroStates.CLAIMINGCOMM
                            this.menuCooldown.reset()
                        }
                    }
                    if(this.claimTimer.hasReached(6000)) {
                        this.sendMacroMessage("Took too long to claim the commission.")
                        MovementHelper.stopMovement()
                        this.state = this.MacroStates.WARPINGFORGE
                        this.forgeTimer.reset()
                        this.newCommission = new Commission(false, true)
                        this.claimCommission = true
                        ChatLib.say("/warp forge")
                    }
                }

                if(this.state === this.MacroStates.CLAIMINGCOMM) {
                    if(Player.getContainer()?.getName() === "Commissions") {
                        if(!this.menuCooldown.hasReached(1000)) return
                        // collecting completed commissions
                        let Inventory = Player.getContainer()
                        for(let i = 9; i < 17; i++) {
                            let stack = Inventory.getStackInSlot(i)
                            if(stack) {
                                let lore = stack.getLore()
                                for(let t = 0; t < lore.length; t++) {
                                    if(lore[t].includes("COMPLETED")) {
                                        Inventory.click(i,false,"LEFT")
                                        this.inventoryIsLoaded = false
                                        this.menuCooldown.reset()
                                        return
                                    }
                                }
                            }
                        }
                        let InventoryItems = Player.getContainer().getItems()
                        for(let i = 0; i <= 35; i++) {
                            if(InventoryItems[i] === null) return
                        }
                        let commissions = []
                        for(let i = 9; i < 17; i++) {
                            let stack = Inventory.getStackInSlot(i)
                            if(stack) {
                                for(let t = 0; t < this.Commissions.length; t++) {
                                    let lore = stack.getLore()
                                    for(let r = 0; r < lore.length; r++) {
                                        if(this.state != this.MacroStates.CLAIMINGCOMM) break
                                        let loreText = lore[r].removeFormatting()
                                        let index = this.Commissions[t].data.Names.indexOf(loreText)
                                        // checks if the commission is included in the given names
                                        if(index != -1 && !loreText.removeFormatting().includes("Golden Goblin")) {
                                            let commissionName = this.Commissions[t].data.Names[index]
                                            this.Commissions[t].data.Name = commissionName
                                            let commissionCost = 0
                                            if(commissionName.includes("Titanium")) commissionCost = 0
                                            if(commissionName.includes("Mithril")) commissionCost = 10
                                            if(commissionName.includes("Glacite Walker")) commissionCost = 20
                                            if(commissionName.includes("Goblin")) commissionCost =  30
                                            commissions.push({
                                                commission: this.Commissions[t],
                                                cost: commissionCost
                                            })
                                            break
                                        }
                                    }
                                } 
                            }
                        }
                        let lowestCost = null
                        let commission = null
                        commissions.forEach((newCommission) => {
                            if(!commission || newCommission.cost < lowestCost) {
                                commission = newCommission.commission
                                lowestCost = newCommission.cost
                            }
                        })
                        if(commission) {
                            this.newCommission = commission
                            this.clearRoute()
                            this.route = this.newCommission.data.Data.splitRoute
                            this.claimCommission = false
                            this.walkTimer.reset()
                            Client.currentGui.close()
                            ChatUtils.sendModMessage("Current Commission: " + this.newCommission.data.Name)
                            if(!this.newCommission.isSlayer) this.scanLocation = true
                            if(!this.newCommission.data.Data.fromForge && this.pigeonless) {
                                this.state = this.MacroStates.WALKINGTOPOINTS
                                this.action = this.MacroActions.SCANPATH
                                return
                            }
                            if(this.pigeonless) {
                                ChatLib.say("/warp forge")
                                this.forgeTimer.reset()
                            }
                            let newNames = [this.newCommission.data.Names[0], this.newCommission.data.Names[1]].toString()
                            let lastNames = this.lastCommissionNames.toString()
                            if(!this.pigeonless && lastNames === newNames) {
                                this.state = this.MacroStates.MINING
                                return
                            }
                            if(!this.pigeonless) {
                                if(!this.newCommission.data.Data.fromForge) this.route = this.npcClaim[Math.floor(Math.random()*this.npcClaim.length)].concat(this.newCommission.data.Data.splitRoute)
                                ChatLib.say("/warp forge")
                                this.forgeTimer.reset()
                            }
                            this.state = this.MacroStates.WARPINGFORGE
                        }
                    } else {
                        this.menuCooldown.reset()
                    }
                    if(this.claimTimer.hasReached(6000)) {
                        this.sendMacroMessage("Took too long to claim the commission.")
                        MovementHelper.stopMovement()
                        this.state = this.MacroStates.WARPINGFORGE
                        this.forgeTimer.reset()
                        this.newCommission = new Commission(false, true)
                        this.claimCommission = true
                        ChatLib.say("/warp forge")
                    }
                }

                if(this.state === this.MacroStates.MINING) {
                    if(!MiningBot.Enabled) {
                        MiningBot.toggle(
                            MiningBot.MACROTYPES.COMMISSION,
                            this.newCommission?.data?.Name?.toString()?.toLowerCase()?.includes("titanium"),
                            this.miningSpeed,
                            this.drill,
                            this.drill //I don't give a fuck about bluecheese
                        )
                    }
                }

                if(this.state === this.MacroStates.GOBLINSLAYER || this.state === this.MacroStates.ICEWALKERSLAYER) {
                    let slayerMobs;
                    if(this.state === this.MacroStates.GOBLINSLAYER) {
                        if (!global.export.ItemFailsafe.triggered) Player.setHeldItemIndex(this.goblinSlot.slot)
                        slayerMobs = this.getGoblins()
                    }
                    if(this.state === this.MacroStates.ICEWALKERSLAYER) {
                        if (!global.export.ItemFailsafe.triggered) Player.setHeldItemIndex(this.pickaxe.slot)
                        slayerMobs = this.getIceWalkers()
                    }
                    if(this.mobWhitelist.length >= 3.0) this.mobWhitelist.shift();
                    
                    if(Client.currentGui.getClassName() != "null") {
                        MovementHelper.stopMovement();
                        Rotations.stopRotate();
                        return
                    }

                    let closest = this.retargetTimer.hasReached(1000) ? null : World.getWorld().func_73045_a(this.mobId)
                    if(closest instanceof net.minecraft.client.entity.EntityOtherPlayerMP) {
                        if(closest.func_110143_aJ() > 1.1) closest = new Entity(closest);
                        else closest = null;
                    }
                    if(!closest) {
                        let lowest;
                        slayerMobs.forEach((mob) => {
                            let cost = MathUtils.getDistanceToPlayer(mob).distance
                            if(!closest || cost < lowest) {
                                closest = mob;
                                lowest = cost;
                            }
                        })
                    }

                    if(!closest) {
                        //do stuff
                        if(this.state === this.MacroStates.ICEWALKERSLAYER) {
                            Rotations.rotateTo([0,127,160]);
                            MovementHelper.stopMovement();
                        }
                        if(this.state === this.MacroStates.GOBLINSLAYER) {
                            if(!PolarPathFinder.currentNode) PolarPathFinder.findPath(Utils.getPlayerNode().getBlockPos(), new BlockPos(-134,143,142));
                            if(PolarPathFinder.currentNode && MathUtils.getDistanceToPlayer([-134,143,142]).distance > 5.0) {
                                MovementHelper.setKeysForStraightLine(MathUtils.calculateAngles(PolarPathFinder.currentNode.point).yaw);
                                if(!Rotations.rotate) Rotations.rotateTo(new Vector(PolarPathFinder.currentNode.lookPoint));
                                else Rotations.updateTargetTo(new Vector(PolarPathFinder.currentNode.lookPoint));
                            } else {
                                MovementHelper.stopMovement();
                            }
                        }
                        return;
                    } else {
                        PolarPathFinder.clearPath();
                    }

                    let vectorTarget = new Vector(closest).add(0.0, 1.5, 0.0);
                    if(!Rotations.rotate || this.mobId != closest.getEntity().func_145782_y()) {
                        Rotations.rotateTo(vectorTarget);
                        if(this.mobId != closest.getEntity().func_145782_y()) {
                            this.mobTimer.reset();
                            this.retargetTimer.reset();
                            this.lastSeenTimer.reset();
                            this.startedKilling = false;
                        }
                    } else {
                        Rotations.updateTargetTo(vectorTarget);
                    }
                    this.mobId = closest.getEntity().func_145782_y();
                    let range = MathUtils.getDistanceToPlayer(vectorTarget);
                    if(range.distanceFlat < 2.5) {
                        MovementHelper.stopMovement();
                        this.startedKilling = true;
                        if(this.mobTimer.hasReached(2000) || range.differenceY + 1.5 > 2 || range.differenceY + 1.5 < -5) {
                            this.mobWhitelist.push(this.mobId);
                            this.mobId = -10
                        } else if(range.differenceY + 1.5 < -2) {
                            MovementHelper.setKey("space", true);
                        }
                    } else {
                        MovementHelper.setKey("sprint", true);
                        MovementHelper.setKeysForStraightLine(MathUtils.calculateAngles(vectorTarget).yaw);
                        if(!this.startedKilling) this.mobTimer.reset();
                    }
                    if(range.distance < 5.0) {
                        this.click = !this.click;
                        if(this.click && Math.random() > 0.3) ItemUtils.leftClick();
                    }
                    if(Player.asPlayerMP().canSeeEntity(closest)) {
                        this.lastSeenTimer.reset();
                    } else if(this.lastSeenTimer.hasReached(250)) {
                        this.mobWhitelist.push(this.mobId);
                        this.mobId = -10
                    }
                }

                if(this.state === this.MacroStates.SWAPPINGPICKAXE) {
                    if(this.action === this.MacroActions.WAITSCANNINGPICKAXE && this.pickaxeTimer.hasReached(1000)) {
                        this.action = this.MacroActions.SCANNINGPICKAXE
                    }
                    if(this.action === this.MacroActions.WAITINGPUTTINGPICKAXE && this.pickaxeTimer.hasReached(1000)) {
                        this.action = this.MacroActions.PUTTINGPICKAXE
                    }
                    if(this.action === this.MacroActions.WAITCHECKINGPICKAXE && this.pickaxeTimer.hasReached(1000)) {
                        this.action = this.MacroActions.CHECKINGPICKAXE
                    }
                    if(this.action === this.MacroActions.SCANNINGPICKAXE) {
                        this.pickaxeIndex = undefined
                        let isIceWalkerWeapon = (this.drill.slot === this.pickaxe.slot)
                        if(this.checkPickaxe(isIceWalkerWeapon)) {
                            return
                        }
                        Player.getContainer().getItems().forEach((item, slot) => {
                            if(item?.getName()?.toString()?.includes("2000")) {
                                this.pickaxeIndex = slot
                            }
                        })
                        if(this.pickaxeIndex === undefined) {
                            this.stopMacroWithWarning("Didn't find a new Pickonimbus!")
                            return
                        }
                        mc.func_147108_a(new GuiInventory(Player.getPlayer()))
                        this.action = this.MacroActions.WAITINGPUTTINGPICKAXE
                        this.pickaxeTimer.reset()
                    }
                    if(this.action === this.MacroActions.PUTTINGPICKAXE) {
                        Player.getContainer().click(this.pickaxeIndex, true, "LEFT")
                        this.action = this.MacroActions.WAITCHECKINGPICKAXE
                        this.pickaxeTimer.reset()
                    }
                    if(this.action === this.MacroActions.CHECKINGPICKAXE) { 
                        let isIceWalkerWeapon = (this.drill.slot === this.pickaxe.slot)
                        if(this.checkPickaxe(isIceWalkerWeapon)) {
                            Client.currentGui.close()
                            return
                        } else {
                            this.stopMacroWithWarning("Something went wrong somehow report this!")
                        }
                    }
                }

                if(this.state === this.MacroStates.REFUELING) {
                    this.state = this.MacroStates.WAITING
                    MiningUtils.startRefuel(this.drill)
                    this.interactWithNpc(-6.5, 145.0, -18.5)
                    MiningUtils.onReFuelDone((succes) => {
                        this.refueling = false
                        if(!succes) {
                            this.stopMacroWithWarning("No fuel found")
                            return
                        }
                        let drills = MiningUtils.getDrills()
                        this.drill = drills.drill
                        this.blueCheeseSlot = drills.blueCheese
                        if(!this.drill) {
                            this.sendMacroMessage("Unable to find new drill, please report this issue.")
                            return
                        }
                        if(!this.blueCheeseSlot) this.blueCheeseSlot = this.drill
                        this.state = this.MacroStates.WARPINGFORGE
                        this.claimCommission = true
                        this.newCommission = new Commission(false, true)
                        ChatLib.say("/warp forge")
                        this.forgeTimer.reset()
                    })
                }

                if(this.state === this.MacroStates.SELLING) {
                    if(this.action === this.MacroActions.NPCINTERACTSELL) {
                        this.sendMacroMessage("Selling items...")
                        this.interactWithNpc(15.5, 70.0, -71.8125)
                        this.sellTimer.reset()
                        this.action = this.MacroActions.NPCSELLING
                    }
                    if(this.action === this.MacroActions.NPCSELLING) {
                        if(Player.getContainer()?.getName() === "Farm Merchant" && this.sellTimer.hasReached(600)) {
                            let found = false
                            Player.getContainer().getItems().forEach((item, slot) => {
                                if(found) return
                                if(!item) return
                                if(slot > 53) {
                                    let name = item.getName().removeFormatting()
                                    for(let i = 0; i < this.trashItems.length; i++) {
                                        if(name.includes(this.trashItems[i]) && !name.includes("Drill") && !name.includes("Pickaxe") && !name.includes("Tasty")) {
                                            Player.getContainer().click(slot, false, "LEFT")
                                            this.sellTimer.reset()
                                            found = true
                                            continue
                                        }
                                    }
                                }
                            })
                            if(!found) {
                                Client.currentGui.close()
                                this.state = this.MacroStates.WAITING
                                this.sellingToNpc = false
                                Client.scheduleTask(20, () => {
                                    if(!this.Enabled) return
                                    this.state = this.MacroStates.WARPINGFORGE
                                    this.newCommission = new Commission(false, true)
                                    this.claimCommission = true
                                    ChatLib.say("/warp forge")
                                    this.forgeTimer.reset() 
                                })
                            }
                        }
                    }
                }
            }
        })

        register("worldUnload", () => {
            if(this.Enabled && this.state != this.MacroStates.WARPINGFORGE && this.state != this.MacroStates.TRAVERSING) {
                if(this.state === this.MacroStates.MINING) {
                    MiningBot.stopBot();
                }
                MovementHelper.stopMovement()
                this.state = this.MacroStates.TRAVERSING
                this.newCommission = new Commission(false, true)
                this.claimCommission = true
                this.travelTimer.reset()
            }
        })

        register("chat", (Event) => {
            if(!this.Enabled) return
            let msg = ChatLib.getChatMessage(Event, false)
            if(msg.startsWith("Oh no!")) {
                this.state = this.MacroStates.SWAPPINGPICKAXE
                this.action = this.MacroActions.WAITSCANNINGPICKAXE
                this.pickaxeTimer.reset()
                MiningBot.stopBot();
            }
        })

        register("command", () => {
            if(this.Enabled) {
                this.sellingToNpc = true
                this.state = this.MacroStates.TRAVERSING
                ChatLib.say("/warp hub")
                this.travelTimer.reset()
            }
        }).setName("refueltest")

        register("chat", (Event) => {
            if(!this.Enabled || this.state != this.MacroStates.TRAVERSING) return
            let msg = ChatLib.getChatMessage(Event, false)
            if(msg.startsWith("Are you sure? Type /lobby")) {
                Client.scheduleTask(10, () => {
                    ChatLib.say("/lobby")
                })
            }
        })

        registerEventSB("fullinventory", () => {
            if(this.Enabled && !this.sellingToNpc) {
                this.sendMacroMessage("Detected full inventory!")
                MiningBot.stopBot();
                this.sellingToNpc = true
                this.state = this.MacroStates.TRAVERSING
                Rotations.stopRotate()
                ChatLib.say("/warp hub")
                this.travelTimer.reset()
            }
        })

        register("chat", (Event) => {
            if(!this.Enabled) return;
            let chatmsg = ChatLib.getChatMessage(Event, false);
            if(!this.commissionNames.some(name => chatmsg.startsWith(name.toUpperCase()))) return;
            if(this.state === this.MacroStates.MINING || this.state === this.MacroStates.GOBLINSLAYER || this.state === this.MacroStates.ICEWALKERSLAYER) {
                this.commissionCount++

                overlayManager.UpdateOverlayLine(this.OVERLAY_ID, "COMMS_HOUR", "Commissions/Hour: " + Math.ceil(this.commissionCount / (this.commissionCounter.getTimePassed() / (1000 * 3600))))
                overlayManager.UpdateOverlayLine(this.OVERLAY_ID, "COMMS", "Session Commissions: " + this.commissionCount)
                overlayManager.UpdateOverlayLine(this.OVERLAY_ID, "COMMS_HOTM", "Session HOTM XP: " + (this.commissionCount * 400))

                Rotations.stopRotate();
                MiningBot.stopBot();
                let macroState = this.state;
                this.state = this.MacroStates.WAITING;
                PolarPathFinder.clearPath();
                this.mobpos = null;
                Client.scheduleTask(30, () => {
                    if(!this.Enabled) return
                    if(this.pigeonless || macroState === this.MacroStates.GOBLINSLAYER || macroState === this.MacroStates.ICEWALKERSLAYER) {
                        ChatLib.say("/warp forge")
                        this.state = this.MacroStates.WARPINGFORGE
                        this.forgeTimer.reset()
                    }
                    this.lastCommissionNames = [this.newCommission.data.Names[0], this.newCommission.data.Names[1]]
                    this.claimCommission = true
                    this.newCommission = new Commission(false, true)
                    if(!this.pigeonless) {
                        this.clearRoute()
                        this.route = []
                        this.state = this.MacroStates.WALKINGTOPOINTS
                        this.action = this.MacroActions.SCANPATH
                    }
                })
            }
        })

        registerEventSB("incombat", () => {
            if(!this.Enabled) return
            MiningBot.stopBot();
            this.state = this.MacroStates.TRAVERSING
            this.newCommission = new Commission(false, true)
            this.claimCommission = true
            ChatLib.say("/l")
            this.travelTimer.reset()
        })

        registerEventSB("emptydrill", () => {
            if(!this.Enabled) return
            if(this.state === this.MacroStates.MINING) {
                Rotations.stopRotate()
                MiningBot.stopBot();
                this.state = this.MacroStates.WAITING
                this.refueling = true
                Client.scheduleTask(20, () => {
                    this.state = this.MacroStates.WARPINGFORGE
                    ChatLib.say("/warp forge")
                    this.forgeTimer.reset()
                })
            }
        })

        registerEventSB("death", () => {
            if(!this.Enabled) return;
            MovementHelper.stopMovement();
            Rotations.stopRotate();
            MiningBot.stopBot();
            this.state = this.MacroStates.WAITING;
            Client.scheduleTask(70, () => {
                this.state = this.MacroStates.WARPINGFORGE;
                this.forgeTimer.reset();
                this.newCommission = new Commission(false, true);
                this.claimCommission = true;
                ChatLib.say("/warp forge");
            })
        })

        register("packetReceived", (Packet) => {
            if(!this.Enabled) return
            if(this.action === this.MacroActions.WAITINGONS08) {
                Client.scheduleTask(0, () => {
                    this.action = this.MacroActions.WARP
                })
            }
        }).setFilteredClasses([S08PacketPlayerPosLook])

        this.windowId
        this.inventoryIsLoaded = false
        register("packetReceived", (Packet, Event) => {
            if(!this.Enabled) return
            if(Packet instanceof S30PacketWindowItems && this.state === this.MacroStates.CLAIMINGCOMM && !this.inventoryIsLoaded) {
                // Just to be sure the inventory is loaded
                Client.scheduleTask(1, () => {
                    this.inventoryIsLoaded = true
                })
            }
        }).setFilteredClasses([S2DPacketOpenWindow, S30PacketWindowItems])
    }

    toggle() {
        this.Enabled = !this.Enabled
        if(this.Enabled) {
            MouseUtils.unGrabMouse()
            ChatUtils.sendModMessage(this.ModuleName + ": " + (this.Enabled ? "&aEnabled": "&cDisabled"))
            this.pigeonless = ModuleManager.getSetting(this.ModuleName, "Pigeonless");
            this.aspectOfTheVoid = Utils.findItem(["Aspect of the End", "Aspect of the Void"]);
            this.royalpigeon = Utils.findItem(["Pigeon"]);
            let drills = MiningUtils.getDrills()
            this.drill = drills.drill
            this.blueCheeseSlot = drills.blueCheese
            this.goblinSlot = Utils.getItem(ModuleManager.getSetting(this.ModuleName, "Weapon Slot (Goblin)")-1);
            if(this.goblinSlot.name === undefined || this.goblinSlot.name?.includes("Mithril") || this.goblinSlot.name?.includes("Titanium")) {
                this.sendMacroMessage("No weapon detected in goblin slayer slot.")
                this.stopMacro()
                return
            }
            if(!Utils.checkItems(this.ModuleName, [["Aspect of the End","Aspect of the Void"]]) || !drills.drill || (!this.royalpigeon && !this.pigeonless)) {
                if(!this.royalpigeon && !this.pigeonless) this.sendMacroMessage("Missing Royal Pigeon!")
                this.stopMacro()
                return
            }
            this.pickaxe = Utils.findItem(["Pickonimbus","Pickaxe", "Stonk"]);
            if(!this.pickaxe) {
                this.sendMacroMessage("Missing pickaxe for glacite walker slayer!")
                this.stopMacro()
                return
            }
            if(!drills.blueCheese) this.blueCheeseSlot = this.drill
            if(!this.royalpigeon) this.royalpigeon = this.drill // Otherwise code becomes even worse

            this.warpingTime = 200
            this.scanLocation = false
            this.refueling = false
            this.sellingToNpc = false

            this.newCommission = new Commission(false, true)

            this.startTime = Date.now()
            this.state = this.MacroStates.WAITING;
            new Thread(() => {
                this.miningSpeed = MiningUtils.getMiningSpeed(this.drill.slot, MiningBot.speedBoost)
                if(this.miningSpeed != -1 && this.Enabled) {
                    this.commissionCounter.reset()
                    this.commissionCount = 0

                    overlayManager.AddOverlayText(this.OVERLAY_ID, "COMMS_HOUR", "Commissions/Hour: 0")
                    overlayManager.AddOverlayText(this.OVERLAY_ID, "COMMS", "Session Commissions: 0")
                    overlayManager.AddOverlayText(this.OVERLAY_ID, "COMMS_HOTM", "Session HOTM XP: 0")
                    overlayManager.AddOverlayText(this.OVERLAY_ID, "TIME", `Session Time: 0s`)
                    overlayManager.EnableOverlay(this.OVERLAY_ID)

                    // TODO HOTM Progress?
                    // TODO Running time

                    this.claimCommission = true
                    this.forgeTimer.reset()
                    this.lastCommissionNames = ["",""]
                    this.state = this.MacroStates.WARPINGFORGE

                    // Failsafes
                    global.export.FailsafeManager.register((cb) => {
                        if(this.Enabled) this.toggle();
                        cb();
                    }, () => {
                        if (!this.Enabled) this.toggle();
                    })
                    if(Skyblock.area != "Dwarven Mines") {
                        this.sendMacroMessage("Travelling to the Dwarven Mines!")
                    }
                    ChatLib.say("/warp forge");
                } else {
                    this.stopMacro()
                }
            }).start()
        }
        if(!this.Enabled) {
            this.stopMacro()
        }
    }

    processLastPoint() {
        MovementHelper.stopMovement()
        if(this.sellingToNpc) {
            this.state = this.MacroStates.SELLING
            this.action = this.MacroActions.NPCINTERACTSELL
            return
        }
        if(this.refueling) {
            this.state = this.MacroStates.REFUELING
            return
        }
        if(this.newCommission.isClaim) {
            this.state = this.MacroStates.CLAIMINGCOMM
            this.menuCooldown.reset()
            this.inventoryIsLoaded = false
            this.claimTimer.reset()
            if(this.pigeonless) {
                Client.scheduleTask(5, () => {
                    this.state = this.MacroStates.TRYCLAIM
                    this.walkToNpc = true
                })
            } else {
                // pigeon
                Client.scheduleTask(2, () => {Player.setHeldItemIndex(this.royalpigeon.slot)})
                Client.scheduleTask(6, () => {ItemUtils.rightClickPacket()})
            }
            return
        }
        if(this.newCommission.isSlayer) {
            MovementHelper.setCooldown()
            if(this.newCommission.data.Names[0] === "Goblin Slayer") {
                this.state = this.MacroStates.GOBLINSLAYER
            }
            if(this.newCommission.data.Names[0] === "Glacite Walker Slayer") {
                this.state = this.MacroStates.ICEWALKERSLAYER
            }
            return
        }
        // find a good mining position
        if(this.scanLocation) {
            this.scanLocation = false
            MovementHelper.stopMovement()
            let areas = this.newCommission.data.Data.routes
            let options = []
            for(let key in areas) {
                let route = areas[key]
                let lastPoint = route[route.length-1]
                let playerNear = false
                World.getAllPlayers().forEach((player) => {
                    if(MathUtils.calculateDistance([lastPoint.x, lastPoint.y, lastPoint.z],[player.getX(), player.getY(), player.getZ()]).distance < 5.5 && player.getName() != Player.getName()) {
                        playerNear = true
                    }
                })
                if(!playerNear) {
                    options.push({
                        distance: MathUtils.distanceToPlayerPoint(lastPoint).distanceFlat,
                        route: route
                    })
                }
            }
            if(options.length === 0.0) {
                this.sendMacroMessage("All macro locations were occupied, switching lobbies...")
                MovementHelper.stopMovement()
                this.state = this.MacroStates.TRAVERSING
                this.newCommission = new Commission(false, true)
                this.claimCommission = true
                ChatLib.say("/l")
                this.travelTimer.reset()
                return
            }
            let closestDistance = Infinity
            let closest = null
            options.forEach((option) => {
                if(!closest || option.distance < closestDistance) {
                    closest = option
                    closestDistance = option.distance
                }
            })
            this.clearRoute()
            this.route = closest.route
            this.state = this.MacroStates.WALKINGTOPOINTS
            this.action = this.MacroActions.SCANPATH
            this.newCommission.mining = true;
            return
        }
        this.state = this.MacroStates.MINING
    }

    checkPickaxe(isIceWalkerWeapon) {
        let inventory = Player.getInventory()
        for(let i = 0; i <= 7; i++) {
            if(inventory.getStackInSlot(i)?.getName()?.toString()?.includes("2000")) {
                let newPickonimbus = Utils.getItem(i)
                if(isIceWalkerWeapon) {
                    this.pickaxe = newPickonimbus
                }
                this.drill = newPickonimbus
                this.blueCheeseSlot = this.drill
                this.state = this.MacroStates.MINING
                return true
            }
        }
        return false
    }

    /**
     * @returns {Array<PlayerMP>}
     */
    getIceWalkers() {
        let IceWalkers = []
        World.getAllPlayers().forEach((player) => {
            let name = player.getName();
            if((name === "Ice Walker" || name === "Glacite Walker") && !player.isSpectator() && player.canBeCollidedWith() && player.entityLivingBase.func_110143_aJ() > 1.1 && !player.isInvisible() && player.getY() >= 127.0 && player.getY() <= 130.0 && player.getZ() <= 179.0 && player.getZ() >= 140.0 && player.getX() <= 38.0 && this.mobWhitelist.indexOf(player.getEntity().func_145782_y()) == -1) {
                IceWalkers.push(player);
            }
        })
        return IceWalkers
    }

    /**
     * @returns {Array<PlayerMP>}
     */
    getGoblins() {
        let Goblins = []
        World.getAllPlayers().forEach((player) => {
            let name = player.getName();
            if((name === "Goblin " || name === "Weakling ") && Player.asPlayerMP().canSeeEntity(player) && player.canBeCollidedWith() && player.entity.func_110143_aJ() > 1.1 && !player.isInvisible() && player.getY() > 127.0 && (player.getZ() <= 153.0 || player.getX() >= -157.0) && (player.getZ() >= 148.0 || player.getX() <= -77.0) && this.mobWhitelist.indexOf(player.getEntity().func_145782_y()) == -1) {
                Goblins.push(player);
            }
        });
        return Goblins
    }

    interactWithNpc(x,y,z) {
        let Players = World.getAllPlayers()
        let Found = false
        for(let i = 0; i < Players.length; i++) {
            if(MathUtils.calculateDistance([Players[i].getX(), Players[i].getY(), Players[i].getZ()], [x,y,z]).distanceFlat < 0.001) {
                Found = true
                Rotations.rotateTo(new Vec3(Players[i].getX(), Players[i].getY() + Players[i].getEyeHeight()-0.4, Players[i].getZ()), 5.0)
                Rotations.onEndRotation(() => {
                    World.getAllPlayers().forEach((player) => {
                        if(player.getX() === x && player.getY() === y && player.getZ() === z && MathUtils.distanceToPlayerCT(player).distance < 5) {
                            mc.field_71442_b.func_78768_b(Player.getPlayer(), player.getEntity())
                        }
                    })
                })
                break
            }
        }
        return Found
    }

    clearRoute() {
        this.route = []
        this.routeTarget = null
        this.routeIndex = 0
    }

    pointToArray(point) {
        return [point.x, point.y, point.z]
    }

    sendMacroMessage(msg) {
        ChatUtils.sendModMessage(this.ModuleName + ": " + msg)
    }

    stopMacroWithWarning(message=undefined) {
        if(message != undefined) this.sendMacroMessage(message)
        Utils.warnPlayer()
        this.stopMacro()
    }

    stopMacro() {
        this.Enabled = false;
        global.export.FailsafeManager.unregister();
        MouseUtils.reGrabMouse();
        overlayManager.DisableOverlay(this.OVERLAY_ID);
        MovementHelper.stopMovement();
        PolarPathFinder.clearPath();
        this.mobpos = null;
        Rotations.stopRotate();
        MiningBot.stopBot();
        ChatUtils.sendModMessage(this.ModuleName + ": " + (this.Enabled ? "&aEnabled": "&cDisabled"));
    }
}

class Point {
    constructor(x, y, z, aotv, etherwarp=false) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.pos = new BlockPos(Math.floor(x), Math.round(y), Math.floor(z));
        this.aotv = aotv;
        this.etherwarp = etherwarp;
    }
}

class Commission {
    constructor(slayer, claim, data=null) {
        this.isSlayer = slayer;
        this.isClaim = claim;
        this.data = data
        this.mining = false;
        this.pos;
    }
}

class Data {
    constructor(Names, Data) {
        this.Names = Names
        this.Data = Data
        this.Name = ""
    }
}

global.export.CommissionMacro = new commissionMacro()

class WalkPosition {
    constructor(point, currentIndex, route) {
        this.point = point;
        this.routeTargetIndex = currentIndex;
        this.nextIndex = currentIndex + 1;
        this.isLastIndex = false;
        // Assuming varCommissionMacro.route is available globally
        if (currentIndex + 1 >= route.length) {
            this.isLastIndex = true;
        }
    }
}