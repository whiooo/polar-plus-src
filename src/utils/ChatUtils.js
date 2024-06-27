class ChatUtilsClass {
   // Sends a message with the client prefix
   sendModMessage(text) {
      ChatLib.chat("&0[&bPolar Client&0] &r" + (text ?? null))
   }

   // Sends a message with a custom prefix
   sendCustomMessage(prefix, text) {
      ChatLib.chat(`&8[&5${prefix}&8] &r${text ?? "null"}`)
   }
}

global.export.ChatUtils = new ChatUtilsClass()