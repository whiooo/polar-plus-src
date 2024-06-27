let { mc, BP, C08PacketPlayerBlockPlacement, Utils, TimeHelper } = global.export

const clickMouse = mc.getClass().getDeclaredMethod("func_147116_af")
clickMouse.setAccessible(true)
const rightClickMouse = mc.getClass().getDeclaredMethod("func_147121_ag")
rightClickMouse.setAccessible(true)

class ItemUtilsClass {
   constructor() {
      this.cooldown = new TimeHelper();
   }

   leftClick() {
      clickMouse.invoke(mc)
   }

   rightClickPacket(ticks=0) {
      if(ticks === 0 && Player.getInventory().getStackInSlot(Player.getHeldItemIndex())) {
         Utils.sendPacket(new C08PacketPlayerBlockPlacement(new BP(-1, -1, -1), 255, Player.getInventory().getStackInSlot(Player.getHeldItemIndex()).getItemStack(), 0, 0, 0))
      } else {
         Client.scheduleTask(ticks, () => {
            Utils.sendPacket(new C08PacketPlayerBlockPlacement(new BP(-1, -1, -1), 255, Player.getInventory().getStackInSlot(Player.getHeldItemIndex()).getItemStack(), 0, 0, 0))
         })
      }
   }

   rightClick(Tick=0) {
      Client.scheduleTask(Tick, () => {
         rightClickMouse.invoke(mc)
      })
   }

   setItemSlot(slot) {
      if (!global.export.ItemFailsafe.triggered && this.cooldown.hasReached(100)) {
         Player.setHeldItemIndex(slot);
         this.cooldown.reset();
      }
   }
}

global.export.ItemUtils = new ItemUtilsClass()