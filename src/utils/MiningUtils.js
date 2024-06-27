import Skyblock from "BloomCore/Skyblock";
let { S2DPacketOpenWindow, ChatUtils, Blocks, TimeHelper, mcMobs, MathUtils, ItemObject, registerEventSB, S30PacketWindowItems } = global.export
class miningUtils {
    constructor() {
      this.MCBlocks = {
          stained_glass: Blocks.field_150399_cn,
          stained_glass_pane: Blocks.field_150397_co,
          prismarine: Blocks.field_180397_cI,
          log2: Blocks.field_150363_s,
          lava: Blocks.field_150353_l,
          barrier: Blocks.field_180401_cv,
          stone: Blocks.field_150348_b,
          cauldron: Blocks.field_150383_bp,
          quartz_block: Blocks.field_150371_ca,
          quartz_stairs: Blocks.field_150370_cb,
          stone_brick_stairs: Blocks.field_150390_bg,
          stonebrick: Blocks.field_150417_aV,
          wooden_slab: Blocks.field_150376_bx,
          bedrock: Blocks.field_150357_h
      }
   
      this.IDBlocks = {
          stained_glass: 95.0,
          stained_glass_pane: 160.0,
          prismarine: 168.0,
          stone: 1.0,
          wool: 35.0,
          hardened_clay: 159.0,
          gold_block: 41.0
      }

      this.lastTickExtra = 0

      this.inAbiphone = false
      this.abiphoneCallBacks = []
      this.abiphoneTimer = new TimeHelper()
      register("tick", () => {
         if(this.inAbiphone) {
            if(Player.getContainer()?.getName()?.includes("Abiphone")) {
               if(!this.abiphoneTimer.hasReached(1000)) return
               this.inAbiphone = false
               let found = false
               Player.getContainer().getItems().forEach((item, slot) => {
                  if(!item) return
                  if(item.getName().includes("Jotraelin")) {
                     Player.getContainer().click(slot, false, "LEFT")
                     found = true
                  }
               })
               this.triggerAbiphoneDone(found)
            } else {
               this.abiphoneTimer.reset()
            }
         }
      })

      this.MiningSpeed = 0

      // 0 = nothing
      // 1 = normal speed
      // 2 = bottem of hotm menu
      // 3 = top of hotm menu
      this.InfoState = 0
      this.gotPotmState = false
      this.hasPotm = true
      register("packetReceived", (Packet, Event) => {
         if(this.InfoState === 1) { 
         Client.scheduleTask(10, () => {
             if(Player.getContainer()?.getName() === "SkyBlock Menu") {
                 let StatsMenuLore = Player.getContainer().getStackInSlot(13).getLore()
                 for(let i = 0; i < StatsMenuLore.length; i++) {
                     let StatsMenuLine = StatsMenuLore[i]
                     if(StatsMenuLine.removeFormatting().includes("Mining Speed")) {
                     if(StatsMenuLine.charAt(25) != ",") {
                         this.MiningSpeed += parseInt(StatsMenuLine.charAt(24) + StatsMenuLine.charAt(25) + StatsMenuLine.charAt(26))
                         return
                     }
                     this.MiningSpeed += parseInt(StatsMenuLine.charAt(24) + StatsMenuLine.charAt(26) + StatsMenuLine.charAt(27) + StatsMenuLine.charAt(28))
                     }
                 }
             }
         })
         }
         if(this.InfoState === 2) {
            Client.scheduleTask(10, () => {
               this.hasPotm = true
               Player.getInventory().getItems().forEach((item) => {
                  if(item === null) return
                  if(item.getName().removeFormatting().includes("Peak") && item.getID() === 7.0) {
                        this.hasPotm = false
                  }
               })
               this.gotPotmState = true
            })
            if(Skyblock.area === "Crystal Hollows") {
               Client.scheduleTask(20, () => {
                  if(Player.getContainer()?.getName() === "Heart of the Mountain") {
                        Player.getContainer().click(8, false, "RIGHT")
                        this.InfoState = 3
                  }
               })
            }
         }
         if(this.InfoState === 3) {
            Client.scheduleTask(10, () => {
               if(Player.getContainer()?.getName() === "Heart of the Mountain") {
                  let items = Player.getContainer().getItems();
                  for(let i = 0; i < items.length; i++) {
                     let item = items[i];
                     if(!item) continue
                     if(item.getName().removeFormatting().startsWith("Prof")) {
                        let lore = item.getLore();
                        for(let i = 0; i < lore.length; i++) {
                           let line = lore[i]
                           if(line.removeFormatting().includes("Gain")) {
                              this.MiningSpeed += parseInt(line.charAt(16) + line.charAt(17) + line.charAt(18))
                              this.InfoState = 0;
                              return;
                           }
                        }
                     }
                  }

               }
            })
         }
      }).setFilteredClasses([S2DPacketOpenWindow])

      this.menuState = 0
      this.drillSlot = 0
      this.reFuelCallBacks = []
      register("packetReceived", () => {
         if(this.menuState === 1) {
            Client.scheduleTask(20, () => {
               if(Player.getContainer().getName() === "Drill Anvil") {
                  Player.getContainer().click(this.drillSlot, true, "LEFT")
                  this.menuState = 2
               }
            })
         }
         if(this.menuState === 2) {
            Client.scheduleTask(20, () => {
               let fuels = ["Volta","Oil","Poppy"]
               let fuelSlot = undefined
               Player.getContainer().getItems().forEach((item, slot) => {
                  if(!item) return
                  fuels.forEach((fuel) => {
                     if(item.getName().removeFormatting().includes(fuel)) fuelSlot = slot
                  })
               })
               if(fuelSlot === undefined) {
                  this.menuState = 0
                  this.triggerReFuelDone(false)
                  return
               }
               Player.getContainer().click(fuelSlot, true, "LEFT")
               this.menuState = 3
            })
         }
         if(this.menuState === 3) {
            Client.scheduleTask(20, () => {
               Player.getContainer().click(22, false, "LEFT")
               this.menuState = 4
            })
         }
         if(this.menuState === 4) {
            Client.scheduleTask(20, () => {
               Player.getContainer().click(13, true, "LEFT")
               this.menuState = 5
            })
         }
         if(this.menuState === 5) {
            Client.scheduleTask(20, () => {
               Client.currentGui.close()
            })
            Client.scheduleTask(40, () => {
               this.triggerReFuelDone(true)
               this.menuState = 0
            })
         }
      }).setFilteredClasses([S30PacketWindowItems])

      this.gettingGreatExplorer = false
      this.greatExplorerActions = []
      this.greatExplorerState = 0
      this.greatExplorerTimer = new TimeHelper()
      register("tick", () => {
         if(this.gettingGreatExplorer) {
            if(this.greatExplorerState === 0) {
               ChatLib.say("/hotm")
               this.greatExplorerTimer.reset()
               this.greatExplorerState++
            }
            let playerInventory = Player.getContainer()
            if(playerInventory?.getName() === "Heart of the Mountain" && this.greatExplorerTimer.hasReached(1000)) {
               if(this.greatExplorerState === 1) {
                  playerInventory.click(8, false, "RIGHT")
                  this.greatExplorerTimer.reset()
                  this.greatExplorerState++
               }
               if(this.greatExplorerState === 2) {
                  let item = playerInventory?.getStackInSlot(42)
                  if(item && item.getName().removeFormatting() === "Great Explorer" && this.greatExplorerTimer.hasReached(1000)) {
                     if(item.getID() === 264) {
                        this.triggerGreatExplorer(true)
                     }
                     if(item.getID() === 388 || item.getID() === 263) {
                        this.triggerGreatExplorer(false)
                     }
                  }
               }
            }
         }
      })

      this.extra = 0
   }

    getMiningSpeed(Slot, hasSpeedBoost) {
        if(hasSpeedBoost) {
           ChatUtils.sendModMessage("Please try again once your mining speed boost is no longer active!")
           return -1
        }
        this.MiningSpeed = 0
        Player.setHeldItemIndex(Slot)
        Thread.sleep(1000)
        ChatLib.say("/sbmenu")
        this.InfoState = 1
        Thread.sleep(500)
        let Timer = new global.export.TimeHelper()
        while(this.MiningSpeed === 0 && !Timer.hasReached(2000)) {
           Thread.sleep(1)
        }
        this.InfoState = 0
        if(Timer.hasReached(2000)) {
           ChatUtils.sendModMessage("Unable to fetch your mining speed, please try again!")
           return -1
        }
        Timer.reset()
        if(this.MiningSpeed < 200) {
           ChatUtils.sendModMessage("Your mining speed was too low: &e" + this.MiningSpeed.toString())
           Client.scheduleTask(0, () => {Client.currentGui?.close()})
           return -1
        }
        if(Skyblock.area != "Crystal Hollows") {
         Client.scheduleTask(0, () => {Client.currentGui?.close()})
         this.MiningSpeed += this.getBetterTogetherSpeed()
         ChatUtils.sendModMessage("Your mining speed is &e" + this.MiningSpeed.toString())
         this.InfoState = 0
         Client.currentGui?.close();
         return this.MiningSpeed
        }
        ChatLib.say("/hotm")
        this.gotPotmState = false
        this.InfoState = 2
        while(!this.gotPotmState && !Timer.hasReached(3000)) {
           Thread.sleep(1)
        }
        while(this.InfoState != 0 && !Timer.hasReached(3000)) {
           Thread.sleep(1)
        }
        if(this.MiningSpeed < 200) {
           ChatUtils.sendModMessage("Your mining speed was too low: &e" + this.MiningSpeed.toString())
           Client.scheduleTask(0, () => {Client.currentGui?.close()})
           return -1
        }
        if(Timer.hasReached(3000)) {
           ChatUtils.sendModMessage("Unable to fetch your mining speed, please try again!")
           Client.scheduleTask(0, () => {Client.currentGui?.close()})
           return -1
        }
        Client.scheduleTask(0, () => {Client.currentGui?.close()})
        this.InfoState = 0
        this.MiningSpeed += this.getBetterTogetherSpeed()
        ChatUtils.sendModMessage("Your mining speed is &e" + this.MiningSpeed.toString())
        
        return this.MiningSpeed
    }

    getBetterTogetherSpeed() {
      let minus = 0
      Scoreboard.getLines().forEach((line) => {
         let name = line.getName()
         if(name.includes("Nearby Players")) {
            minus = (parseInt(name.charAt(name.length-1)) * -500)
         }
      })
      if(minus === undefined || isNaN(minus) || minus === null) {
         return 0
      }
      return minus
    }
    
    mineTime(MiningSpeed, pos, SpeedBoost) {
        let Block = World.getBlockAt(pos);
        let Metadata = Block.getMetadata();
        let BlockID = Block.type.getID();
        let Name = Block.type.getName();
        let Speed = MiningSpeed;
        let MiningOfset = 0;

        if (BlockID === 7) return 0

        if ((BlockID === 95.0 || BlockID === 160.0) && Player.getHeldItem()?.getName()?.toLocaleLowerCase()?.includes("drill")) {
           MiningOfset -= 1;
        }

        if (!this.hasPotm && SpeedBoost) {
           Speed *= 3;
        }
        else if (SpeedBoost) {
           Speed *= 4;
        }

        if (Name === "Prismarine") {
           let greenMithrilS = Math.ceil((800 * 30) / Speed)
           if (Speed > 5334) {
              return this.returnSpeed(4, MiningOfset)
           } else {
              return this.returnSpeed(greenMithrilS, MiningOfset)
           }
        }

        if (Name === "Wool") {
           let crayMithrilS = Math.ceil((500 * 30) / Speed)
           let blueMithrilS = Math.ceil((1500 * 30) / Speed)
           if (Metadata === 7 && Speed > 3334) {
              return this.returnSpeed(4, MiningOfset)
           } else if (Metadata === 7) {
              return this.returnSpeed(crayMithrilS, MiningOfset)
           }
           if (Metadata === 3 && Speed > 10001) {
              return this.returnSpeed(4, MiningOfset)
           } else if (Metadata === 3) {
              return this.returnSpeed(blueMithrilS, MiningOfset)
           }
        }

        if (Name === "Stained Clay") {
           let crayMithrilS = Math.ceil((500 * 30) / Speed)
           if (Metadata === 9 && Speed > 3334) {
              return this.returnSpeed(4, MiningOfset)
           } else if (Metadata === 9) {
              return this.returnSpeed(crayMithrilS, MiningOfset)
           }
        }

        if (Name === "Stone") {
           let titaniumS = Math.ceil((2000 * 30) / Speed)
           if (Metadata === 4 && Speed > 13334) {
              return this.returnSpeed(4, MiningOfset)
           } else if (Metadata === 4) {
              return this.returnSpeed(titaniumS, MiningOfset)
           }
        }

        if (Name === "Stained Glass Pane" || Name === "Stained Glass") {
           let easySmallS = Math.ceil((3000 * 30) / Speed)
           let topazSmallS = Math.ceil((3800 * 30) / Speed)
           let rubySmallS = Math.ceil((2300 * 30) / Speed)
           let jasperSmalls = Math.ceil((4800 * 30) / Speed)
           if ((Metadata === 1 || Metadata === 10 || Metadata === 5 || Metadata === 3) && Speed > 20001) {
              return this.returnSpeed(4, MiningOfset)
           } else if (Metadata === 1 || Metadata === 10 || Metadata === 5 || Metadata === 3) {
              return this.returnSpeed(easySmallS, MiningOfset)
           }
           if (Metadata === 4 && Speed > 25334) {
              return this.returnSpeed(4, MiningOfset)
           } else if (Metadata === 4) {
              return this.returnSpeed(topazSmallS, MiningOfset)
           }
           if (Metadata === 14 && Speed > 15334) {
              return this.returnSpeed(4, MiningOfset)
           } else if (Metadata === 14) {
              return this.returnSpeed(rubySmallS, MiningOfset)
           }
           if (Metadata === 2 && Speed > 32001) { 
              return this.returnSpeed(4, MiningOfset)
           } else if (Metadata === 2) {
              return this.returnSpeed(jasperSmalls, MiningOfset)
           }
        }
        
        if(Name === "Block of Gold") {
         let goldS = Math.ceil((600 * 30) / Speed)
         if(Speed > 4001) {
            return this.returnSpeed(4, MiningOfset)
         } else {
            return this.returnSpeed(goldS, MiningOfset)
         }
        }
        return this.returnSpeed(200, MiningOfset);
      };

    returnSpeed(Ticks, Ofset) {
      if(Math.random() < 0.20) return Ticks * 1.5
      let countTicks = Ticks
      let longTicks = 0

      // Make sure it also mines the right amount of time when the ticks are high 
      while(countTicks >= 10) {
        countTicks -= 10
        longTicks += 1
      }

      switch(this.extra) {
         case 0:
            this.extra = 1
            break
         case 1:
            if(Math.random() > 0.5) this.extra = 2
            else this.extra = 0
            break
         case 2:
            if(Math.random() > 0.5) this.extra = 3
            else this.extra = 1
            break
         case 3:
            this.extra = 0
            break
         default:
            this.extra = 0
            break
      }
      return Ticks + this.extra + longTicks + Ofset
    }

   /**
    * Gets drills from player's inventory.
    * @returns {{ blueCheese: itemObject|null, drill: itemObject|null }} Returns an object containing the blue cheese and drill items, or null if not found.
    */
    getDrills() {
        let drillNames = [{name: "Pickonimbus", drill: false},{name: "Drill", drill: true},{name: "Gauntlet", drill: true},{name: "Titanium Pickaxe", drill: false}]
        let foundDrill = false
        let blueCheese = null
        let drill = null
        for(let i = 0; i <= 7; i++) {
           let item = Player.getInventory().getStackInSlot(i)
           if(item) {
               let itemInstance = new ItemObject(item, i)
               let itemName = item.getName().removeFormatting()
               drillNames.forEach((drillName) => {
                 if(itemName.includes(drillName.name)) {
                    if(drillName.drill) {
                       if(this.isBlueCheese(item)) {
                          blueCheese = itemInstance
                          return
                       }
                       foundDrill = true
                       drill = itemInstance
                    } else if(!foundDrill) {
                       drill = itemInstance
                    }
                 }
              })
           }
        }
        if(!drill) ChatLib.chat("- Missing a mining item")
        return { blueCheese: blueCheese, drill: drill }
   }

    /**
    * Gets drills from player's inventory.
    * @returns {{ hardStone: itemObject|null, powderDrill: itemObject|null }} Returns an object containing the blue cheese and drill items, or null if not found.
    */
   getPowderItems() {
      let hardStoneItems = [{name: "Drill", priority: false}, {name: "Gauntlet", priority: true}]
      let drillNames = ["Mithril Drill SX-R226", "Mithril Drill SX-R326", "Ruby Drill TX-15","Gemstone Drill LT-522","Topaz Drill KGR-12", "Jasper Drill X"]
      let hardStoneItem = null
      let drill = null
      let inventoryPlayer = Player.getInventory()
      for(let i = 0; i <= 7; i++) {
         if(!inventoryPlayer) break
         let item = inventoryPlayer.getStackInSlot(i)
         if(!item) continue
         let itemHelp = new ItemObject(item, i)
         let itemName = item.getName().removeFormatting()
         hardStoneItems.forEach((object) => {
            if(!itemName.includes(object.name)) return
            if(hardStoneItem) {
               if(object.priority) hardStoneItem = itemHelp
               return
            }
            hardStoneItem = itemHelp
         })
         drillNames.forEach((drillName) => {
            if(!itemName.includes(drillName)) return
            drill = itemHelp
         })
      }
      if(!drill) drill = hardStoneItem
      return { hardStone: hardStoneItem, powderDrill: drill}
   }

    /**
    * @param {Item} item 
    */
    isBlueCheese(item) {
        let found = false
        item.getLore().forEach((name) => {
           if(name.removeFormatting().includes("Blue Cheese")) found = true
        })
        return found
    }

    /**
     * @param {BlockPos} [nextWaypoint=null] 
     * @returns {Entity}
     */
    getCHMobNear(nextWaypoint=null) {
        let target = null
        let mobs = [mcMobs.EntityMagmeCube, mcMobs.EntityIronGolem, mcMobs.EntitySlime]
        mobs.forEach((mobType) => {
            World.getAllEntitiesOfType(mobType).forEach((entity) => {
               if(Player.asPlayerMP().canSeeEntity(entity)) {
                  if(Math.floor(entity.getEntity().func_110143_aJ()) > 1.1 && (MathUtils.distanceToPlayerCT(entity).distance < 6.0 || (nextWaypoint && MathUtils.getDistance(nextWaypoint, entity).distance < 6.0 && Math.abs(nextWaypoint.y - entity.getY()) < 1.4))) {
                     target = entity
                  }
               }
            })
        })
        World.getAllPlayers().forEach((player) => {
            ["Weakling ","Team Treasurite"].forEach((name) => {
               if(player.getName() === name && Player.asPlayerMP().canSeeEntity(player)) {
                  if(Math.floor(player.getEntity().func_110143_aJ()) > 1.1 && (MathUtils.distanceToPlayerCT(player).distance < 6.0 || (nextWaypoint && MathUtils.getDistance(nextWaypoint, player).distance < 6.0 && Math.abs(nextWaypoint.y - player.getY()) < 1.4))) {
                     target = player
                  }
               }
            })
        })
        return target
    }

   startGreatExplorer() {
      this.gettingGreatExplorer = true
      this.greatExplorerState = 0
      this.greatExplorerTimer.reset()
   }

   onGreatExplorerDone(CallBack) {
      this.greatExplorerActions.push(CallBack)
   }

   triggerGreatExplorer(lvl20) {
      this.greatExplorerActions.forEach((CallBack) => {
         CallBack(lvl20)
      })
      this.greatExplorerActions = []
      this.gettingGreatExplorer = false
      Client.currentGui.close()
   }

   startAbiphone() {
      this.inAbiphone = true
      this.abiphoneTimer.reset()
   }

   triggerAbiphoneDone(succes) {
      this.abiphoneCallBacks.forEach((CallBack) => {
         CallBack(succes)
      })
      this.abiphoneCallBacks = []
   }

   onAbiphoneDone(CallBack) {
      this.abiphoneCallBacks.push(CallBack)
   }

   /**
    * Needs to run in a thread
    * @param {ItemObject} item 
    */
   startRefuel(item) {
      this.drillSlot = 81+item.slot
      this.menuState = 1
   }

   triggerReFuelDone(succes=true) {
      this.reFuelCallBacks.forEach((CallBack) => {
         CallBack(succes)
      })
      this.reFuelCallBacks = []
   }

   onReFuelDone(CallBack) {
      this.reFuelCallBacks.push(CallBack)
   }

   isInGlaciteTunnels() {
      return Player.getZ() > 185 && Skyblock.area === "Dwarven Mines"
   }

   getCold() {
      let lines = Scoreboard.getLines();
      for(let i = 0; i < lines.length; i++) {
         let name = lines[i].getName().removeFormatting();
         if(name.includes("Cold")) {
            if(name.charAt(6) === "0") return 0;
            else if(name.charAt(9) === "❄") {
               return parseInt(name.charAt(7) + name.charAt(8));
            } else if(name.charAt(8) === "❄") {
               return parseInt(name.charAt(7));
            }
         }
      }
      return 0;
   }
}

global.export.MiningUtils = new miningUtils()